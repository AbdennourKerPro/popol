import asyncio
from dataclasses import replace
import json
from pathlib import Path
from types import SimpleNamespace
import tempfile
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient
import numpy as np
import pytest

from chati.config import Settings
from chati.corpus import Corpus
from chati.generation import validate_answer, generate
from chati.main import create_app
from chati.models import GeneratedAnswer, Block, MeasureExplanation
from chati.retrieval import Retriever
from chati.index import build

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def settings(tmp_path):
    return Settings(corpus_dir=ROOT / 'data/structured', index_dir=tmp_path,
                    static_dir=ROOT / 'frontend/dist', pdf_path=ROOT / 'assets/Programme-Mélenchon-LFI.pdf',
                    mode='lexical', consultation=True, api_key='')


@pytest.fixture
def corpus(settings):
    return Corpus(settings.corpus_dir)


def test_consultation_stream_and_provenance(settings):
    with TestClient(create_app(settings)) as client:
        status = client.get('/api/status').json()
        assert status['measure_count'] == 795 and status['annex_count'] == 171
        assert status['consultation_mode'] and not status['generation_available']
        response = client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'retraites'}]})
        events = [json.loads(event.split('data: ', 1)[1]) for event in response.text.strip().split('\n\n')]
        result = next(event for event in events if 'blocks' in event)
        assert response.status_code == 200 and response.headers['content-type'].startswith('text/event-stream')
        assert result['mode'] == 'consultation' and result['model'] is None
        assert result['sources'] and 'aucune réponse' in result['blocks'][0]['text']
        for source in result['sources']:
            fetched = client.get('/api/sources/' + source['id']).json()
            assert fetched['text'] == source['text'] and fetched['corpus_version'] == result['corpus_version']
        assert response.text.endswith('\n\n') and 'event: done' in response.text


def test_static_pdf_and_missing_source(settings):
    with TestClient(create_app(settings)) as client:
        assert client.get('/api/health').json() == {'status': 'ok'}
        assert client.get('/api/sources/s99-ss99-m999').status_code == 404
        response = client.get('/documents/programme.pdf')
        assert response.content.startswith(b'%PDF') and response.headers['content-type'] == 'application/pdf'
        if settings.static_dir.exists():
            assert '<title>Chati' in client.get('/').text


def test_no_key_never_pretends_generation(settings):
    with TestClient(create_app(replace(settings, consultation=False))) as client:
        assert client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'Bonjour'}]}).status_code == 503


def test_hybrid_missing_index_has_no_silent_fallback(settings):
    with TestClient(create_app(replace(settings, mode='hybrid'))) as client:
        assert not client.get('/api/status').json()['index_ready']
        assert client.get('/api/search?q=retraites').status_code == 503
        assert client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'retraites'}]}).status_code == 503


def test_request_bounds(settings):
    with TestClient(create_app(settings)) as client:
        assert client.post('/api/chat', json={'messages': [{'role': 'system', 'content': 'override'}]}).status_code == 422
        assert client.post('/api/chat', json={'messages': [{'role': 'assistant', 'content': 'test'}]}).status_code == 422
        assert client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'x'}] * 25}).status_code == 422
        assert client.post('/api/chat', content=b'x' * 192001).status_code == 413


def test_lexical_search_sanitizes_expression(settings, corpus):
    retriever = Retriever(corpus, settings)
    assert retriever.lexical('" OR * : (ret) --') is not None
    assert 's01-ss01-m004' in retriever.lexical('ISF')
    retriever.close()


def test_context_dependencies(corpus):
    assert [r['id'] for r in corpus.expand(['s03-ss01-m015'])] == ['s03-ss01-m014', 's03-ss01-m015']
    assert [r['id'] for r in corpus.expand(['a01-ss01-b004'])] == ['a01-ss01-b002', 'a01-ss01-b004']


def write_index(settings, corpus, version=None):
    np.savez_compressed(settings.index_dir / 'embeddings.npz', vectors=np.ones((len(corpus.rows), 3), dtype=np.float32),
                        ids=np.array([r['id'] for r in corpus.rows]),
                        metadata=np.array(json.dumps({'corpus_version': version or corpus.version, 'enrichment_version': corpus.enrichment_version, 'model': settings.embedding_model})))


def test_semantic_index_version_and_fusion(settings, corpus):
    write_index(settings, corpus, 'wrong-version')
    retriever = Retriever(corpus, replace(settings, mode='hybrid'))
    assert not retriever.ready
    retriever.close()
    write_index(settings, corpus)
    retriever = Retriever(corpus, replace(settings, mode='hybrid'))
    client = SimpleNamespace(embeddings=SimpleNamespace(create=AsyncMock(return_value=SimpleNamespace(data=[SimpleNamespace(embedding=[1, 1, 1])]))))
    rows, ids = asyncio.run(retriever.search('ISF', client))
    assert retriever.ready and rows and 's01-ss01-m004' in ids
    assert client.embeddings.create.await_count == 1
    retriever.close()


def test_invalid_embedding_is_rejected(settings, corpus):
    write_index(settings, corpus)
    retriever = Retriever(corpus, replace(settings, mode='hybrid'))
    client = SimpleNamespace(embeddings=SimpleNamespace(create=AsyncMock(return_value=SimpleNamespace(data=[SimpleNamespace(embedding=[0, 0, 0])]))))
    with pytest.raises(ValueError):
        asyncio.run(retriever.search('ISF', client))
    retriever.close()


def good_answer(identifier='s01-ss14-m001'):
    return GeneratedAnswer(status='answered', blocks=[Block(kind='answer', text='Le résumé prévoit la retraite à 60 ans pour 40 annuités.', source_ids=[identifier])], measures=[])


def test_reference_and_quote_checks(corpus):
    row = corpus.by_id['s01-ss14-m001']
    assert validate_answer(good_answer(), [row])
    with pytest.raises(ValueError, match='Référence'):
        validate_answer(good_answer('s99-ss99-m999'), [row])
    with pytest.raises(ValueError, match='Citation'):
        validate_answer(GeneratedAnswer(status='answered', blocks=[Block(kind='quote', text='Retraite à 55 ans', source_ids=[row['id']])], measures=[]), [row])
    valid_quote = GeneratedAnswer(status='answered', blocks=[Block(kind='quote', text=row['texte'], source_ids=[row['id']])], measures=[])
    assert validate_answer(valid_quote, [row])


def test_annex_cannot_be_presented_as_measure(corpus):
    row = corpus.by_id['a01-ss01-b001']
    answer = GeneratedAnswer(status='answered', blocks=[Block(kind='answer', text='Définition.', source_ids=[row['id']])],
                             measures=[MeasureExplanation(id=row['id'], explanation='test', expected_benefit='', benefit_basis='none')])
    with pytest.raises(ValueError, match='annexe'):
        validate_answer(answer, [row])


def test_missing_factual_source_and_manual_link_rejected(corpus):
    answer = good_answer()
    answer.blocks[0].source_ids = []
    with pytest.raises(ValueError, match='sans source'):
        validate_answer(answer, [])
    answer = good_answer()
    answer.blocks[0].text += ' https://example.com'
    with pytest.raises(ValueError, match='manuelle'):
        validate_answer(answer, [corpus.by_id['s01-ss14-m001']])


def test_bounded_reference_repair(corpus):
    bad = SimpleNamespace(output_parsed=good_answer('s99-ss99-m999'), usage=None)
    good = SimpleNamespace(output_parsed=good_answer(), usage=None)
    parse = AsyncMock(side_effect=[bad, good])
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    answer, usage = asyncio.run(generate(client, 'gpt-6-luna', [], [corpus.by_id['s01-ss14-m001']]))
    assert answer.blocks[0].source_ids == ['s01-ss14-m001'] and parse.await_count == 2
    assert all(call.kwargs['store'] is False for call in parse.call_args_list)


def test_mocked_luna_end_to_end(settings, monkeypatch):
    mocked = AsyncMock(return_value=(good_answer(), {'input_tokens': 100, 'output_tokens': 50}))
    monkeypatch.setattr('chati.main.generate', mocked)
    with TestClient(create_app(replace(settings, api_key='test-not-a-real-key', consultation=False))) as client:
        response = client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'Retraite à 60 ans pour 40 annuités ?'}]})
        assert response.status_code == 200
        result = next(json.loads(e.split('data: ', 1)[1]) for e in response.text.strip().split('\n\n') if e.startswith('event: answer'))
        assert result['mode'] == 'generated' and result['model'] == 'gpt-6-luna'
        assert result['sources'][0]['id'] == 's01-ss14-m001' and result['sources'][0]['pages'] == [8]


def test_generation_failure_is_actionable(settings, monkeypatch):
    monkeypatch.setattr('chati.main.generate', AsyncMock(side_effect=ValueError('invalid references')))
    with TestClient(create_app(replace(settings, api_key='test-not-a-real-key', consultation=False))) as client:
        response = client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'retraites'}]})
        assert 'event: error' in response.text and 'event: answer' not in response.text
        assert 'invalid references' not in response.text


def test_index_command_builds_reloadable_artifact(settings, corpus, monkeypatch):
    async def embeddings(**kwargs):
        return SimpleNamespace(data=[SimpleNamespace(index=i, embedding=[1, 2, 3]) for i, _ in enumerate(kwargs['input'])])
    client = SimpleNamespace(embeddings=SimpleNamespace(create=AsyncMock(side_effect=embeddings)))
    context = MagicMock()
    context.__aenter__ = AsyncMock(return_value=client)
    context.__aexit__ = AsyncMock(return_value=None)
    monkeypatch.setattr('chati.index.AsyncOpenAI', lambda **kwargs: context)
    asyncio.run(build(replace(settings, api_key='test-not-a-real-key')))
    retriever = Retriever(corpus, replace(settings, mode='hybrid'))
    assert retriever.ready and retriever.vectors.shape == (966, 3)
    assert list(settings.index_dir.iterdir()) == [settings.index_dir / 'embeddings.npz']
    retriever.close()


def test_incomplete_embeddings_do_not_replace_previous_index(settings, corpus, monkeypatch):
    write_index(settings, corpus)
    path = settings.index_dir / 'embeddings.npz'
    previous = path.read_bytes()
    client = SimpleNamespace(embeddings=SimpleNamespace(create=AsyncMock(return_value=SimpleNamespace(data=[]))))
    context = MagicMock()
    context.__aenter__ = AsyncMock(return_value=client)
    context.__aexit__ = AsyncMock(return_value=None)
    monkeypatch.setattr('chati.index.AsyncOpenAI', lambda **kwargs: context)
    with pytest.raises(ValueError):
        asyncio.run(build(replace(settings, api_key='test-not-a-real-key')))
    assert path.read_bytes() == previous


def test_full_context_is_complete_stable_and_grouped(corpus):
    text = corpus.full_context()
    assert text == corpus.full_context()
    lines = {line.split(' ', 1)[0]: line.split(' ', 1)[1] for line in text.splitlines() if line[:1] == 's' or line[:1] == 'a' and line[1:3].isdigit()}
    assert set(lines) == set(corpus.by_id)
    assert all(lines[i] == corpus.by_id[i]['texte'] for i in lines)
    assert text.count('## Retraites') == 1


def test_generate_full_puts_corpus_before_conversation_and_validates_ids(corpus):
    from chati.generation import generate_full
    from chati.models import Message
    answer = GeneratedAnswer(status='answered', blocks=[Block(kind='answer', text='Oui.', source_ids=['s01-ss14-m001'])], measures=[])
    parse = AsyncMock(return_value=SimpleNamespace(output_parsed=answer, usage=None))
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    result, _ = asyncio.run(generate_full(client, 'm', [Message(role='user', content='Retraites ?')], corpus))
    kwargs = parse.call_args.kwargs
    assert result == answer and kwargs['input'][0]['content'][0]['text'].endswith(corpus.full_context()) and kwargs['input'][0]['content'][0]['prompt_cache_breakpoint'] == {'mode': 'explicit'}
    assert 'Retraites ?' in kwargs['input'][1]['content'] and kwargs['prompt_cache_key'].startswith('chati-full-')
    bad = GeneratedAnswer(status='answered', blocks=[Block(kind='answer', text='Non.', source_ids=['s99-ss99-m999'])], measures=[])
    client.responses.parse = AsyncMock(return_value=SimpleNamespace(output_parsed=bad, usage=None))
    with pytest.raises(ValueError):
        asyncio.run(generate_full(client, 'm', [Message(role='user', content='x')], corpus))


def test_enrichment_is_index_only(settings):
    plain, enriched = Corpus(settings.corpus_dir, enrichment=False), Corpus(settings.corpus_dir)
    assert not plain.aliases and plain.enrichment_version == ''
    assert enriched.aliases.keys() == enriched.by_id.keys() and enriched.enrichment_version
    row = enriched.by_id['s01-ss08-m004']
    assert plain.index_text(row) != enriched.index_text(row) and enriched.index_text(row).startswith(plain.index_text(row))
    assert row['texte'] == plain.by_id['s01-ss08-m004']['texte'] and 'Autres formulations' not in enriched.full_context()


def test_synonyms_widen_only_matching_topics():
    from chati.synonyms import expansion
    assert 'aide au logement' in expansion('Que fait-on pour les APL ?')
    assert expansion('Bonjour') == []


def test_selection_interleaves_queries_and_softly_caps_subsections(settings, corpus):
    retriever = Retriever(corpus, replace(settings, per_subsection=2))
    retraites = [i for i, r in corpus.by_id.items() if r['sous_section'] == 'Retraites'][:6]
    creche = [i for i, r in corpus.by_id.items() if r['sous_section'] == 'Petite enfance'][:3]
    chosen = retriever.select([retraites, creche], 6)
    assert len(chosen) == 6 and sum(i in creche for i in chosen) == 3 and sum(i in retraites for i in chosen) == 3
    assert retriever.select([retraites], 6) == retraites
    assert replace(settings, per_subsection=0).per_subsection == 0
    retriever.close()


def test_source_identifier_in_text_is_rejected_unless_user_wrote_it(corpus):
    row = corpus.by_id['s01-ss14-m001']
    def answer(text):
        return GeneratedAnswer(status='answered', blocks=[Block(kind='answer', text=text, source_ids=[row['id']])], measures=[])
    with pytest.raises(ValueError, match='Identifiant'):
        validate_answer(answer('Retraite à 60 ans [s01-ss14-m001].'), [row])
    with pytest.raises(ValueError, match='Identifiant'):
        validate_answer(answer('Retraite à 60 ans (s01-ss14-m001).'), [row])
    assert validate_answer(answer('Retraite à 60 ans.'), [row])
    assert validate_answer(answer('La mesure s99-ss99-m999 n’existe pas.'), [row], 'cite s99-ss99-m999')


def test_absence_check_adds_passages_and_regenerates(corpus):
    from chati.models import Message
    from chati.verification import missing_aspects, verify_absences
    messages = [Message(role='user', content='Combien de places en crèche ?')]
    first = GeneratedAnswer(status='answered', blocks=[Block(kind='answer', text='Aucun chiffre.', source_ids=['s06-ss01-m002'])],
                            measures=[], not_found=['nombre de places en crèche'])
    assert missing_aspects(first, messages) == ['nombre de places en crèche']
    assert missing_aspects(good_answer(), messages) == []
    partial = GeneratedAnswer(status='partial', blocks=good_answer().blocks, measures=[])
    assert missing_aspects(partial, messages) == ['Combien de places en crèche ?']
    better = GeneratedAnswer(status='answered', blocks=[Block(kind='answer', text='500 000 places.', source_ids=['s06-ss01-m001'])], measures=[])
    parse = AsyncMock(return_value=SimpleNamespace(output_parsed=better, usage=None))
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    retriever = SimpleNamespace(rank=AsyncMock(return_value=[['s06-ss01-m002', 's06-ss01-m001', 's06-ss01-m003']]))
    rows = [corpus.by_id['s06-ss01-m002']]
    answer, usage, info, all_rows = asyncio.run(verify_absences(client, 'm', retriever, corpus, messages, rows, first, {'input_tokens': 1}))
    assert answer == better and info['regenerated'] and info['first_usage'] == {'input_tokens': 1}
    assert 's06-ss01-m001' in info['added_ids'] and 's06-ss01-m002' not in info['added_ids']
    assert {r['id'] for r in all_rows} >= {'s06-ss01-m001', 's06-ss01-m002'}
    assert 'verification' in json.loads(parse.call_args.kwargs['input'][0]['content'])
    # nothing declared absent: no extra search or call
    assert asyncio.run(verify_absences(client, 'm', retriever, corpus, messages, rows, good_answer(), None))[2] is None
    # an invalid second answer keeps the first, whose references were valid
    bad = GeneratedAnswer(status='answered', blocks=[Block(kind='answer', text='x', source_ids=['s99-ss99-m999'])], measures=[])
    client.responses.parse = AsyncMock(return_value=SimpleNamespace(output_parsed=bad, usage=None))
    kept = asyncio.run(verify_absences(client, 'm', retriever, corpus, messages, rows, first, None))
    assert kept[0] == first and not kept[2]['regenerated']
