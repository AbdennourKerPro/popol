import asyncio
from dataclasses import replace
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from chati.generation import generate
from chati.main import create_app
from chati.models import Message
from chati.retrieval import Retriever
from test_api import answer_event, corpus, settings, good_answer  # noqa: F401 (fixtures)


def test_annotations_are_loaded_outside_the_corpus_version(corpus):
    assert len(corpus.publics) == 28 and corpus.publics['locataire'].startswith('locataire')
    assert corpus.publics_by_id and set().union(*corpus.publics_by_id.values()) <= corpus.publics.keys()
    assert all(i in corpus.by_id for i in corpus.publics_by_id)


def test_profile_bonus_only_moves_annotated_candidates(settings, corpus):
    retriever = Retriever(corpus, settings)
    query = 'logement loyer'
    plain = asyncio.run(retriever.rank([query]))[0]
    assert asyncio.run(retriever.rank([query], profile=()))[0] == plain        # no profile: same ranking
    boosted = asyncio.run(retriever.rank([query], profile=['locataire']))[0]
    is_concerned = lambda i: 'locataire' in corpus.publics_by_id.get(i, set())
    concerned = [i for i in plain if is_concerned(i)]
    assert concerned and len(concerned) < len(plain)
    # only retrieved candidates move: the others keep their relative order
    assert [i for i in boosted if not is_concerned(i)] == [i for i in plain if not is_concerned(i) and i in boosted]
    assert sum(boosted.index(i) for i in concerned) < sum(plain.index(i) for i in concerned)
    full_plain = asyncio.run(retriever.rank([query], depth=10_000))[0]
    assert set(asyncio.run(retriever.rank([query], depth=10_000, profile=['locataire']))[0]) == set(full_plain)  # no new candidate
    retriever.close()


def test_profile_is_sent_to_the_model_with_its_note(corpus):
    parse = AsyncMock(return_value=SimpleNamespace(output_parsed=good_answer(), usage=None))
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    asyncio.run(generate(client, 'm', [Message(role='user', content='Loyers ?')], [corpus.by_id['p3c01-ss07-m001']], profile_labels=['locataire de son logement']))
    kwargs = parse.call_args.kwargs
    assert json.loads(kwargs['input'][0]['content'])['profil'] == ['locataire de son logement'] and 'PROFIL.' in kwargs['instructions']
    asyncio.run(generate(client, 'm', [Message(role='user', content='Loyers ?')], [corpus.by_id['p3c01-ss07-m001']]))
    kwargs = parse.call_args.kwargs
    assert 'profil' not in json.loads(kwargs['input'][0]['content']) and 'PROFIL.' not in kwargs['instructions']


def test_chat_validates_and_forwards_the_profile(settings, monkeypatch):
    generate_mock = AsyncMock(return_value=(good_answer(), None))
    monkeypatch.setattr('chati.main.generate', generate_mock)
    with TestClient(create_app(replace(settings, api_key='test-not-a-real-key', consultation=False))) as client:
        publics = client.get('/api/status').json()['publics']
        assert {'id': 'locataire', 'label': 'locataire de son logement (privé ou social)'} in publics and len(publics) == 28
        ask = lambda profile: client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'Loyers ?'}], 'profile': profile})
        assert ask(['inconnu']).status_code == 422
        assert ask(['locataire', 'etudiant', 'rural', 'retraite']).status_code == 422
        assert answer_event(ask(['locataire', 'etudiant']))['mode'] == 'generated'
        assert generate_mock.call_args.kwargs['profile_labels'] == [client.app.state.corpus.publics['etudiant'], client.app.state.corpus.publics['locataire']]
        ask([])
        assert generate_mock.call_args.kwargs['profile_labels'] is None


def test_profile_is_part_of_the_cache_key(settings, tmp_path, monkeypatch):
    generate_mock = AsyncMock(return_value=(good_answer(), None))
    monkeypatch.setattr('chati.main.generate', generate_mock)
    with TestClient(create_app(replace(settings, api_key='test-not-a-real-key', consultation=False, answer_cache_size=10, answer_cache_file=tmp_path / 'absent'))) as client:
        ask = lambda profile: answer_event(client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'Loyers ?'}], 'profile': profile}))
        assert not ask(['locataire'])['cached'] and not ask([])['cached']
        assert ask(['locataire'])['cached'] and generate_mock.await_count == 2
