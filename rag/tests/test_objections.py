import asyncio
from dataclasses import replace
import json
from pathlib import Path
import re
from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient
import pytest

from chati.generation import INSTRUCTIONS, generate
from chati.main import create_app
from chati.models import Block, GeneratedAnswer, Message, Point
from chati.objections import is_financing, is_objection
from chati.web import WebResearchError, research_web
from test_api import answer_event, corpus, settings, good_answer  # noqa: F401 (fixtures)
from test_web import response_fixture
from chati.web import extract_research

ROOT = Path(__file__).resolve().parents[1]
CHIFFRAGE = ('Le chiffrage du programme est prêt : l’équipe le publiera dans un second temps, au moment choisi dans la campagne. '
             'Surveillez le site melenchon2027.fr pour sa publication.')


def test_every_question_of_the_objection_batch_is_recognised():
    batch = [json.loads(line)['messages'][-1]['content'] for line in (ROOT / 'benchmarks/objections/questions.jsonl').read_text().splitlines()]
    assert len(batch) == 12 and all(is_objection(q) for q in batch)
    assert is_financing('Comment tout cela est-il financé ?') and is_financing('Et qui paie ?')


def test_neutral_questions_and_quoted_measures_are_not_objections():
    home = re.findall(r"text: '([^']+)', category", (ROOT / 'frontend/src/content/suggestions.ts').read_text())
    assert len(home) == 12 and not any(is_objection(q) for q in home)   # no extra web call for home questions
    for question in ('Que prévoit le programme pour les retraites ?', 'le prix du timbre', 'Qui bénéficierait de cette mesure ?',
                     'Combien de places en crèche ?', 'Je cherche les mesures sur la santé',
                     'Que prévoit le programme sur ce point : « Revenir sur les exonérations qui pénalisent le financement des retraites » ?'):
        assert not is_objection(question), question


def test_instructions_aim_to_convince_and_give_the_costing_sentence():
    assert 'CONVAINCRE' in INSTRUCTIONS and 'CHIFFRAGE.' in INSTRUCTIONS
    assert ' '.join(CHIFFRAGE.split()) in ' '.join(INSTRUCTIONS.split())
    assert 'N’invente aucun argument, chiffre,\nétude, pays ou précédent' in INSTRUCTIONS
    assert 'de ta propre initiative' in INSTRUCTIONS                       # still never raises one itself


def test_the_costing_sentence_passes_the_reference_check(corpus):
    from chati.generation import validate_answer
    row = corpus.by_id['p3c01-ss07-m001']
    answer = GeneratedAnswer(status='answered', blocks=[Block(kind='answer', text=CHIFFRAGE + ' Le programme prévoit des recettes.', source_ids=[row['id']])], measures=[])
    assert validate_answer(answer, [row])


def web_answer(web=True):
    ids = ['p3c01-ss07-m001'] + (['web-001'] if web else [])
    return GeneratedAnswer(status='answered', blocks=[
        Block(kind='answer', text='Oui, c’est faisable.', source_ids=['p3c01-ss07-m001']),
        Block(kind='explanation', text='Trois arguments :', source_ids=[], points=[Point(text='Un pays voisin l’applique.', source_ids=ids)])], measures=[])


def test_objection_mode_uses_its_note_and_does_not_require_a_web_citation(corpus):
    web_rows, context = extract_research(response_fixture(), '2026-11-12')
    rows = [corpus.by_id['p3c01-ss07-m001']] + web_rows
    parse = AsyncMock(return_value=SimpleNamespace(output_parsed=web_answer(web=False), usage=None))
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    answer, _ = asyncio.run(generate(client, 'm', [Message(role='user', content='C’est irréaliste, non ?')], rows, web_context=context, web_mode='objection'))
    instructions = parse.call_args.kwargs['instructions']
    assert answer.status == 'answered' and 'MODE RÉPONSE À UNE OBJECTION' in instructions and 'MODE EXPLICATION ET COMPARAISON' not in instructions
    with pytest.raises(ValueError):  # the comparison mode still requires a web reference
        asyncio.run(generate(client, 'm', [Message(role='user', content='Et actuellement ?')], rows, web_context=context))


def test_objection_research_looks_for_examples_abroad_and_legal_basis(corpus):
    create = AsyncMock(return_value=response_fixture())
    client = SimpleNamespace(responses=SimpleNamespace(create=create))
    asyncio.run(research_web(client, 'gpt-6-luna', [Message(role='user', content='C’est irréaliste, non ?')], [corpus.by_id['p3c01-ss07-m001']], objective='objection'))
    instructions = create.call_args.kwargs['instructions']
    assert 'pays, régions ou villes' in instructions and 'base juridique' in instructions and 'n’en fabrique pas' in instructions
    assert create.call_args.kwargs['tool_choice'] == 'required' and create.call_args.kwargs['store'] is False


def generated(settings, **extra):
    return replace(settings, api_key='test-not-a-real-key', consultation=False, **extra)


def ask(client, question):
    return client.post('/api/chat', json={'messages': [{'role': 'user', 'content': question}]})


def test_an_objection_is_answered_with_verified_examples_abroad(settings, monkeypatch):
    web_rows, context = extract_research(response_fixture(), '2026-11-12')
    research = AsyncMock(return_value=(web_rows, context, {'input_tokens': 10}))
    from chati.generation import validate_answer
    validated = validate_answer(web_answer(), [{'id': 'p3c01-ss07-m001', 'type': 'mesure'}, *web_rows])  # as the real generate returns it
    synthesize = AsyncMock(return_value=(validated, None))
    monkeypatch.setattr('chati.main.research_web', research)
    monkeypatch.setattr('chati.main.generate', synthesize)
    with TestClient(create_app(generated(settings))) as client:
        response = ask(client, 'La retraite à 60 ans, c’est irréaliste, non ?')
        result = answer_event(response)
        assert research.call_args.kwargs['objective'] == 'objection' and 'base juridique' in response.text
        assert synthesize.call_args.kwargs['web_mode'] == 'objection' and synthesize.call_args.kwargs['web_context'] == context
        assert {r['id'] for r in synthesize.call_args.args[3]} >= {'web-001'}
        assert result['research'] and result['mode'] == 'generated' and {s['type'] for s in result['sources']} == {'mesure', 'web'}


def test_without_verified_examples_the_programme_alone_answers(settings, monkeypatch):
    monkeypatch.setattr('chati.main.research_web', AsyncMock(side_effect=WebResearchError('rien')))
    synthesize = AsyncMock(return_value=(good_answer(), None))
    monkeypatch.setattr('chati.main.generate', synthesize)
    with TestClient(create_app(generated(settings))) as client:
        result = answer_event(ask(client, 'Comment tout cela est-il financé ?'))
        assert result['mode'] == 'generated' and not result['research']
        assert 'web_context' not in synthesize.call_args.kwargs and 'web_mode' not in synthesize.call_args.kwargs


@pytest.mark.parametrize('case', ['neutral', 'disabled', 'no_web'])
def test_no_extra_web_call_outside_objections_or_when_unavailable(settings, monkeypatch, case):
    research = AsyncMock(side_effect=AssertionError('no web research expected'))
    monkeypatch.setattr('chati.main.research_web', research)
    monkeypatch.setattr('chati.main.generate', AsyncMock(return_value=(good_answer(), None)))
    extra = {'disabled': {'objection_research': False}, 'no_web': {'web_enabled': False}}.get(case, {})
    question = 'Que prévoit le programme pour les retraites ?' if case == 'neutral' else 'C’est irréaliste, non ?'
    with TestClient(create_app(generated(settings, **extra))) as client:
        assert answer_event(ask(client, question))['mode'] == 'generated'
    research.assert_not_awaited()
