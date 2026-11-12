import asyncio
from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient
import pytest

from chati.followups import suggest_followups
from chati.generation import generate, validate_answer
from chati.main import create_app
from chati.models import Block, GeneratedAnswer, Message
from chati.web import WebResearchError, extract_research, public_web_source, research_web, safe_public_url
from test_api import corpus, settings, good_answer


def response_fixture(url='https://www.service-public.gouv.fr/particuliers/vosdroits/F123', performed=True):
    text = 'La règle actuelle est décrite par le service public. [citation]'
    marker = text.index('[citation]')
    output = ([{'type': 'web_search_call', 'status': 'completed', 'action': {'type': 'search'}}] if performed else [])
    output.append({'type': 'message', 'content': [{'type': 'output_text', 'text': text,
        'annotations': [{'type': 'url_citation', 'url': url, 'title': 'La règle actuelle — Service public', 'start_index': marker, 'end_index': len(text)}]}]})
    return SimpleNamespace(model_dump=lambda: {'output': output}, usage=None)


def test_web_annotations_are_the_only_source_of_urls():
    rows, context = extract_research(response_fixture(), '2026-10-31')
    assert len(rows) == 1 and rows[0]['id'] == 'web-001'
    assert rows[0]['retrieved_at'] == '2026-10-31' and '[SOURCE web-001' in context
    assert '[citation]' not in context
    source = public_web_source(rows[0], 'corpus-version')
    assert source['type'] == 'web' and source['text'] == ''


def test_two_urls_sharing_a_native_citation_keep_both_references():
    data = response_fixture().model_dump()
    part = data['output'][1]['content'][0]
    part['annotations'].append({**part['annotations'][0], 'url': 'https://www.legifrance.gouv.fr/loda/test', 'title': 'Texte légal'})
    rows, context = extract_research(SimpleNamespace(model_dump=lambda: data), '2026-10-31')
    assert len(rows) == 2 and '[SOURCE web-001' in context and '[SOURCE web-002' in context
    assert context.startswith('La règle actuelle est décrite par le service public.')


@pytest.mark.parametrize('url', ['javascript:alert(1)', 'http://localhost/test', 'http://127.0.0.1/', 'https://site.local/', 'https://user:pass@example.com/', 'http://10.0.0.1/', 'https://example.com/\nfoo'])
def test_unsafe_links_are_not_exposed(url):
    assert safe_public_url(url) is None
    with pytest.raises(WebResearchError):
        extract_research(response_fixture(url), '2026-10-31')


def test_no_web_call_or_no_citations_is_not_research():
    with pytest.raises(WebResearchError):
        extract_research(response_fixture(performed=False), '2026-10-31')
    fake = SimpleNamespace(model_dump=lambda: {'output': [{'type': 'web_search_call', 'status': 'completed'},
        {'type': 'message', 'content': [{'type': 'output_text', 'text': 'Voici une URL inventée : https://example.com', 'annotations': []}]}]})
    with pytest.raises(WebResearchError):
        extract_research(fake, '2026-10-31')


def test_incomplete_web_response_is_not_used_as_evidence():
    data = response_fixture().model_dump()
    data['status'] = 'incomplete'
    with pytest.raises(WebResearchError):
        extract_research(SimpleNamespace(model_dump=lambda: data), '2026-10-31')


def test_hosted_web_search_is_required_live_and_bounded(corpus):
    create = AsyncMock(return_value=response_fixture())
    client = SimpleNamespace(responses=SimpleNamespace(create=create))
    rows, text, usage = asyncio.run(research_web(client, 'gpt-6-luna', [Message(role='user', content='Quelle est la règle actuelle ?')], [corpus.by_id['p3c01-ss07-m001']], max_calls=3))
    kwargs = create.call_args.kwargs
    assert kwargs['model'] == 'gpt-6-luna' and kwargs['tool_choice'] == 'required'
    assert kwargs['tools'] == [{'type': 'web_search', 'external_web_access': True}]
    assert kwargs['max_tool_calls'] == 3 and kwargs['store'] is False
    assert rows and text


def test_web_source_cannot_be_quoted_as_page_verbatim():
    rows, _ = extract_research(response_fixture(), '2026-10-31')
    answer = GeneratedAnswer(status='answered', blocks=[Block(kind='quote', text=rows[0]['texte'], source_ids=['web-001'])], measures=[])
    with pytest.raises(ValueError, match='Citation'):
        validate_answer(answer, rows)


def test_structured_synthesis_requires_a_web_reference(corpus):
    web_rows, context = extract_research(response_fixture(), '2026-10-31')
    no_web = SimpleNamespace(output_parsed=good_answer(), usage=None)
    parse = AsyncMock(return_value=no_web)
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    with pytest.raises(ValueError, match='références'):
        asyncio.run(generate(client, 'gpt-6-luna', [], [corpus.by_id['p3c01-ss07-m001']] + web_rows, web_context=context))
    assert parse.await_count == 2


def test_followups_are_clean_programme_only_questions():
    def answer(*suivis, status='answered'):
        return GeneratedAnswer(status=status, blocks=[Block(kind='answer', text='Oui.', source_ids=['p3c01-ss07-m001'])], measures=[], suivis=list(suivis))
    good = ['Que prévoit le programme pour les retraites des agriculteurs ?', 'Qui bénéficierait de cette mesure ?']
    assert [f['question'] for f in suggest_followups(answer(*good))] == good
    assert all(f['research'] is False for f in suggest_followups(answer(*good)))
    bad = ['Quels sont les risques de cette mesure ?', 'Peux-tu expliquer avec un exemple concret ?', 'Cette mesure est-elle réaliste ?',
           'Comment la comparer à la situation actuelle ?', 'Que dit p3c01-ss07-m001 ?', 'Sans point d’interrogation', 'Que prévoit le programme pour les retraites des agriculteurs ?']
    assert [f['question'] for f in suggest_followups(answer(good[0], *bad))] == [good[0]]
    legitimate = ['Comment le programme veut-il limiter les loyers ?', 'Que prévoit le programme face aux risques d’inondation ?',
                  'Quelles mesures pour les problèmes de logement ?', 'Que prévoit le programme pour les produits dangereux ?']
    for question in legitimate:
        assert [f['question'] for f in suggest_followups(answer(question))] == [question]
    for question in ('Quelles sont les limites du programme ?', 'Quels problèmes de cette réforme ?', 'N’est-ce pas trop cher ?', 'Est-ce efficace ?'):
        assert suggest_followups(answer(question)) == []
    assert len(suggest_followups(answer('Question numéro un ?', 'Question numéro deux ?', 'Question numéro trois ?', 'Question numéro quatre ?'))) == 3
    assert suggest_followups(answer(*good, status='clarification')) == suggest_followups(answer(*good, status='not_in_corpus')) == []


def result_event(response):
    import json
    return next(json.loads(e.split('data: ', 1)[1]) for e in response.text.strip().split('\n\n') if e.startswith('event: answer'))


def test_programme_mode_never_calls_web_and_still_suggests_followups(settings, monkeypatch):
    research = AsyncMock(side_effect=AssertionError('Web must not run for programme mode'))
    monkeypatch.setattr('chati.main.research_web', research)
    answer = GeneratedAnswer(status='answered', blocks=[Block(kind='answer', text='Oui.', source_ids=['p3c01-ss07-m001'])], measures=[],
                             suivis=['Qui bénéficierait de cette mesure ?'])
    monkeypatch.setattr('chati.main.generate', AsyncMock(return_value=(answer, None)))
    with TestClient(create_app(replace(settings, api_key='test-not-a-real-key', consultation=False))) as client:
        response = client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'Retraite 60 ans'}]})
        result = result_event(response)
        assert not result['research'] and result['followups']
        research.assert_not_awaited()


def test_web_request_requires_explicit_available_configuration(settings):
    payload = {'messages': [{'role': 'user', 'content': 'Et actuellement ?'}], 'research': True}
    with TestClient(create_app(settings)) as client:
        assert client.post('/api/chat', json=payload).status_code == 503
    with TestClient(create_app(replace(settings, api_key='test-not-a-real-key', consultation=False, web_enabled=False))) as client:
        assert client.post('/api/chat', json=payload).status_code == 503


def test_web_comparison_sources_are_separate_and_focus_is_kept(settings, corpus, monkeypatch):
    web_rows, context = extract_research(response_fixture(), '2026-10-31')
    research = AsyncMock(return_value=(web_rows, context, {'input_tokens': 100}))
    answer = GeneratedAnswer(status='answered', blocks=[Block(kind='answer', text='Situation actuelle vérifiée.', source_ids=['web-001']),
        Block(kind='comparison', text='La proposition se distingue de cette règle.', source_ids=['p3c01-ss07-m001', 'web-001'])], measures=[])
    synthesize = AsyncMock(return_value=(answer, None))
    monkeypatch.setattr('chati.main.research_web', research)
    monkeypatch.setattr('chati.main.generate', synthesize)
    with TestClient(create_app(replace(settings, api_key='test-not-a-real-key', consultation=False))) as client:
        response = client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'Et actuellement ?'}], 'research': True, 'focus_measure_id': 'p3c01-ss07-m001'})
        result = result_event(response)
        assert 'event: status' in response.text and 'researching' in response.text
        assert result['research'] and {s['type'] for s in result['sources']} == {'mesure', 'web'}
        assert result['context_ids'][0] == 'p3c01-ss07-m001'
        assert result['followups'] == []
        assert synthesize.call_args.kwargs['web_context'] == context


def test_missing_web_proof_never_falls_back_to_current_claim(settings, monkeypatch):
    monkeypatch.setattr('chati.main.research_web', AsyncMock(side_effect=WebResearchError('no sources')))
    synthesize = AsyncMock()
    monkeypatch.setattr('chati.main.generate', synthesize)
    with TestClient(create_app(replace(settings, api_key='test-not-a-real-key', consultation=False))) as client:
        response = client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'Et actuellement ?'}], 'research': True})
        assert 'event: error' in response.text and 'event: answer' not in response.text
        synthesize.assert_not_awaited()


def test_failed_web_synthesis_stays_an_error(settings, monkeypatch):
    web_rows, context = extract_research(response_fixture(), '2026-10-31')
    monkeypatch.setattr('chati.main.research_web', AsyncMock(return_value=(web_rows, context, None)))
    monkeypatch.setattr('chati.main.generate', AsyncMock(side_effect=ValueError('no web reference')))
    with TestClient(create_app(replace(settings, api_key='test-not-a-real-key', consultation=False))) as client:
        response = client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'Et actuellement ?'}], 'research': True})
        assert 'event: error' in response.text and 'event: answer' not in response.text


def test_unknown_followup_measure_is_rejected_before_search(settings):
    with TestClient(create_app(settings)) as client:
        response = client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'Explique'}], 'focus_measure_id': 'p9c99-ss99-m999'})
        assert response.status_code == 404
