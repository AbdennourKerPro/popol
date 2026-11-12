from dataclasses import replace
import json
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from chati.cache import AnswerCache, normalize
from chati.corpus import Corpus
from chati.main import create_app
from chati.models import Block, GeneratedAnswer
from test_api import corpus, settings, good_answer  # noqa: F401 (fixtures)
from test_beta import add_invite, beta_settings, events


def generated(base, tmp_path, **extra):
    return replace(base, api_key='test-not-a-real-key', consultation=False, answer_cache_size=10,
                   answer_cache_file=tmp_path / 'absent.jsonl', **extra)


def ask(client, content, headers=None, **payload):
    response = client.post('/api/chat', json={'messages': [{'role': 'user', 'content': content}], **payload}, headers=headers or {})
    found = [e for e in events(response) if e['_event'] == 'answer'] if response.status_code == 200 else []
    return response, (found[0] if found else None)


def test_normalization_ignores_case_accents_spaces_and_final_punctuation():
    assert normalize('Retraites ?') == normalize('retraites') == 'retraites'
    assert normalize('  Qu’est-ce   que l’ÉCOLOGIE…  ') == normalize("qu'est-ce que l'ecologie") == "qu'est-ce que l'ecologie"
    cache = AnswerCache(5)
    assert cache.key('Retraites ?', 'v1', 'm') == cache.key('retraites', 'v1', 'm')
    assert cache.key('retraites', 'v1', 'm') != cache.key('retraites', 'v2', 'm') != cache.key('retraites', 'v1', 'autre')
    assert cache.key('x', 'v', 'm', ['locataire', 'etudiant']) == cache.key('x', 'v', 'm', ['etudiant', 'locataire']) != cache.key('x', 'v', 'm')


def test_lru_eviction_and_disabled_cache():
    cache = AnswerCache(2)
    cache.put('a', {'n': 1}); cache.put('b', {'n': 2})
    assert cache.get('a') == {'n': 1}          # a becomes the most recent
    cache.put('c', {'n': 3})
    assert cache.get('b') is None and cache.get('a') and cache.get('c') and len(cache) == 2
    off = AnswerCache(0)
    off.put('a', {'n': 1})
    assert not off.enabled and off.get('a') is None and len(off) == 0
    assert set(AnswerCache(1).entries) == set()
    stored = AnswerCache(1)
    stored.put('k', {'request_id': 'r', 'quota': {}, 'latency_ms': 3, 'usage': {}, 'planner_usage': None, 'research_usage': None, 'blocks': []})
    assert stored.get('k') == {'blocks': []}


def test_second_identical_question_is_served_without_generation(settings, tmp_path, monkeypatch):
    generate = AsyncMock(return_value=(good_answer(), {'input_tokens': 10}))
    monkeypatch.setattr('chati.main.generate', generate)
    with TestClient(create_app(generated(settings, tmp_path))) as client:
        _, first = ask(client, 'Retraite à 60 ans ?')
        response, second = ask(client, 'retraite à 60 ans')
        assert generate.await_count == 1 and first['cached'] is False and second['cached'] is True
        assert second['blocks'] == first['blocks'] and second['sources'] == first['sources']
        assert second['request_id'] != first['request_id'] and second['usage'] is None and isinstance(second['latency_ms'], int)
        assert [e['_event'] for e in events(response)] == ['status', 'answer', 'done']
        assert client.get('/api/status').json()['answer_cache'] == {'enabled': True, 'entries': 1}


def test_follow_ups_web_focus_absences_and_fallbacks_are_not_cached(settings, tmp_path, monkeypatch):
    generate = AsyncMock(return_value=(good_answer(), None))
    monkeypatch.setattr('chati.main.generate', generate)
    with TestClient(create_app(generated(settings, tmp_path))) as client:
        ask(client, 'retraites')
        assert generate.await_count == 1
        client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'x'}, {'role': 'assistant', 'content': 'y'}, {'role': 'user', 'content': 'retraites'}]})
        assert generate.await_count == 2                                     # a follow-up depends on its history
        _, focused = ask(client, 'retraites', focus_measure_id='p3c01-ss07-m001')
        assert generate.await_count == 3 and focused['cached'] is False
        monkeypatch.setattr('chati.main.research_web', AsyncMock(return_value=([], 'synthèse', None)))
        ask(client, 'retraites', research=True)
        assert generate.await_count == 4                                     # web mode is never served from the cache
        absent = GeneratedAnswer(status='not_in_corpus', blocks=[Block(kind='limits', text='Rien.', source_ids=[])], measures=[])
        generate.return_value = (absent, None)
        ask(client, 'le prix du timbre'); ask(client, 'le prix du timbre')
        assert generate.await_count == 6                                     # an absence is not stored
        generate.side_effect = ValueError('references')
        _, fallback = ask(client, 'les crèches')
        generate.side_effect = None
        generate.return_value = (good_answer(), None)
        _, again = ask(client, 'les crèches')
        assert fallback['mode'] == 'consultation' and again['mode'] == 'generated' and again['cached'] is False
        assert client.get('/api/status').json()['answer_cache']['entries'] == 2  # « retraites », « les crèches »


def test_beta_cache_hit_needs_a_valid_link_and_uses_no_question(tmp_path, monkeypatch):
    generate = AsyncMock(return_value=(good_answer(), None))
    monkeypatch.setattr('chati.main.generate', generate)
    with TestClient(create_app(beta_settings(tmp_path, answer_cache_size=10, answer_cache_file=tmp_path / 'absent.jsonl'))) as client:
        token = add_invite(client)
        headers = {'Authorization': f'Bearer {token}'}
        _, first = ask(client, 'Quel âge de départ à la retraite ?', headers)
        assert first['quota']['remaining'] == 2
        _, cached = ask(client, 'Quel âge de départ à la retraite ?', headers)
        assert cached['cached'] and cached['quota']['remaining'] == 2 and generate.await_count == 1
        assert client.get('/api/me', headers=headers).json()['remaining'] == 2
        response, _ = ask(client, 'Quel âge de départ à la retraite ?')
        assert response.status_code == 401
        store = client.app.state.quota
        for key in list(store.usage):
            store.usage[key]['count'] = 3                                    # quota used up
        _, exhausted = ask(client, 'Quel âge de départ à la retraite ?', headers)
        assert exhausted['cached'] and exhausted['mode'] == 'generated' and exhausted['quota']['remaining'] == 0
        assert generate.await_count == 1


def test_seed_file_ignores_entries_of_another_version(settings, tmp_path, monkeypatch):
    corpus_version = Corpus(settings.corpus_dir).version
    result = {'status': 'answered', 'mode': 'generated', 'blocks': [{'kind': 'answer', 'text': 'Réponse amorcée.', 'source_ids': ['p3c01-ss07-m001'], 'points': []}],
              'measures': [], 'sources': [], 'followups': [], 'related': []}
    seed = tmp_path / 'answers.jsonl'
    seed.write_text('\n'.join(json.dumps(line, ensure_ascii=False) for line in [
        {'question': 'Retraites ?', 'corpus_version': corpus_version, 'model': 'gpt-6-luna', 'result': result},
        {'question': 'Logement ?', 'corpus_version': 'ancienne-version', 'model': 'gpt-6-luna', 'result': result},
        {'question': 'Santé ?', 'corpus_version': corpus_version, 'model': 'autre-modele', 'result': result},
    ]) + '\nligne invalide\n')
    generate = AsyncMock(return_value=(good_answer(), None))
    monkeypatch.setattr('chati.main.generate', generate)
    with TestClient(create_app(replace(generated(settings, tmp_path), answer_cache_file=seed))) as client:
        assert client.get('/api/status').json()['answer_cache'] == {'enabled': True, 'entries': 1}
        _, seeded = ask(client, 'retraites')
        assert seeded['cached'] and seeded['blocks'][0]['text'] == 'Réponse amorcée.' and generate.await_count == 0
        ask(client, 'logement')
        assert generate.await_count == 1


def test_faq_seed_list_matches_the_home_suggestions():
    import re
    from pathlib import Path
    root = Path(__file__).resolve().parents[1]
    home = re.findall(r"text: '([^']+)', category", (root / 'frontend/src/content/suggestions.ts').read_text(encoding='utf-8'))
    faq = [line for line in (root / 'data/faq-questions.txt').read_text(encoding='utf-8').splitlines() if line.strip() and not line.startswith('#')]
    assert len(home) == 12 and home == faq
