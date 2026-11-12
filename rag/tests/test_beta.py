import asyncio
from dataclasses import replace
from datetime import datetime, timezone
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient
import openai
import pytest

from chati.config import Settings
from chati.groq import GroqClient, LLMBusy, RateGate, TOKEN_COUNTER, strict_schema
from chati.main import create_app
from chati.models import Block, GeneratedAnswer, Message
from chati.queries import QueryPlan
from chati.quota import hash_token, new_token

ROOT = Path(__file__).resolve().parents[1]


def beta_settings(tmp_path, **extra):
    return Settings(corpus_dir=ROOT / 'data/programme', index_dir=tmp_path, static_dir=ROOT / 'frontend/dist',
                    mode='lexical', consultation=False,
                    llm_provider='groq', groq_api_key='gsk_test_not_real', beta_mode=True, quota_backend='memory',
                    invite_daily_limit=3, **({'answer_cache_size': 0} | extra))


def answer(text='Retraite à 60 ans pour 40 annuités.'):
    return GeneratedAnswer(status='answered', blocks=[Block(kind='answer', text=text, source_ids=['p3c01-ss07-m001'])], measures=[])


def events(response):
    return [json.loads(e.split('data: ', 1)[1]) | {'_event': e.split('\n', 1)[0][7:]} for e in response.text.strip().split('\n\n')]


def ask(client, token, question='Quel âge de départ à la retraite ?'):
    headers = {'Authorization': f'Bearer {token}'} if token else {}
    return client.post('/api/chat', json={'messages': [{'role': 'user', 'content': question}]}, headers=headers)


def add_invite(client, **extra):
    token = new_token()
    client.app.state.quota.invites[hash_token(token)] = {'label': 'Alice', 'active': True, 'daily_limit': None, 'expires_at': None, **extra}
    return token


# -- Groq adapter -----------------------------------------------------------------------------

def test_strict_schema_is_closed_inlined_and_fully_required():
    for model in (GeneratedAnswer, QueryPlan):
        text = json.dumps(strict_schema(model))
        assert '$ref' not in text and '$defs' not in text and 'maxItems' not in text and 'default' not in text
    schema = strict_schema(GeneratedAnswer)
    assert schema['required'] == list(schema['properties']) and 'not_found' in schema['required']
    block = schema['properties']['blocks']['items']
    assert block['additionalProperties'] is False and block['required'] == ['kind', 'text', 'source_ids', 'points']
    point = block['properties']['points']['items']
    assert point['additionalProperties'] is False and point['required'] == ['text', 'source_ids']


class FakeChat:
    def __init__(self, *replies):
        self.replies, self.calls = list(replies), []

    @property
    def chat(self):
        return SimpleNamespace(completions=SimpleNamespace(create=self.create))

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply

    async def close(self):
        pass


def reply(content, finish='stop', total=1200):
    return SimpleNamespace(choices=[SimpleNamespace(finish_reason=finish, message=SimpleNamespace(content=content))],
                           usage=SimpleNamespace(prompt_tokens=1000, completion_tokens=total - 1000, total_tokens=total,
                                                 completion_tokens_details=SimpleNamespace(reasoning_tokens=50)))


def groq(*replies, **settings):
    s = replace(Settings(), llm_provider='groq', groq_api_key='k', **settings)
    fake = FakeChat(*replies)
    return GroqClient(s, http_client=fake), fake, s


def test_groq_adapter_returns_parsed_answer_usage_and_strict_request():
    client, fake, _ = groq(reply(answer().model_dump_json() ))
    counter = [0]
    TOKEN_COUNTER.set(counter)
    result = asyncio.run(client.responses.parse(model='openai/gpt-oss-120b', instructions='Règles', input=[{'role': 'user', 'content': [{'type': 'input_text', 'text': 'Question'}]}],
                                                text_format=GeneratedAnswer, max_output_tokens=5000, store=False, prompt_cache_key='x'))
    assert result.output_parsed == answer()
    usage = result.usage.model_dump()
    assert usage['input_tokens'] == 1000 and usage['total_tokens'] == 1200 and usage['output_tokens_details']['reasoning_tokens'] == 50
    sent = fake.calls[0]
    assert sent['messages'][0] == {'role': 'system', 'content': 'Règles'} and sent['messages'][1]['content'] == 'Question'
    assert sent['response_format']['json_schema']['strict'] is True and sent['max_completion_tokens'] == 2500
    assert sent['extra_body'] == {'reasoning_effort': 'low', 'include_reasoning': False}
    assert counter[0] == 1200


def test_groq_adapter_rejects_truncated_and_invalid_json():
    client, _, _ = groq(reply('{"status":', finish='length'), reply('{"nope": 1}'))
    for _ in range(2):
        with pytest.raises(ValueError):
            asyncio.run(client.responses.parse(model='m', instructions='i', input=[{'role': 'user', 'content': 'q'}], text_format=GeneratedAnswer))


def bad_request():
    return openai.BadRequestError('schema', response=SimpleNamespace(request=None, status_code=400, headers={}), body=None)


def test_groq_adapter_retries_once_without_strict_when_schema_is_refused():
    client, fake, _ = groq(bad_request(), reply(answer().model_dump_json()))
    result = asyncio.run(client.responses.parse(model='m', instructions='i', input=[{'role': 'user', 'content': 'q'}], text_format=GeneratedAnswer))
    assert result.output_parsed == answer()
    assert [c['response_format']['json_schema']['strict'] for c in fake.calls] == [True, False]
    assert 'JSON valide' in fake.calls[1]['messages'][0]['content']


def test_groq_rate_limit_error_cools_down_the_gate():
    limited = openai.RateLimitError('429', response=SimpleNamespace(request=None, status_code=429, headers={'retry-after': '7'}), body=None)
    client, _, _ = groq(limited, llm_max_wait=2)
    with pytest.raises(openai.RateLimitError):
        asyncio.run(client.responses.parse(model='m', instructions='i', input=[{'role': 'user', 'content': 'q'}], text_format=GeneratedAnswer))
    with pytest.raises(LLMBusy) as busy:
        asyncio.run(client.gate.acquire(3000))
    assert busy.value.retry_after >= 5


def test_rate_gate_enforces_tokens_and_requests_per_minute():
    now = [0.0]

    async def sleep(step):
        now[0] += step

    gate = RateGate(rpm=30, tpm=8000, max_wait=20, clock=lambda: now[0], sleep=sleep)

    async def go():
        first, second = await gate.acquire(3000), await gate.acquire(3000)
        gate.settle(first, 3500)
        gate.settle(second, 3500)                       # 7000 used in the window
        await gate.acquire(3000)                        # 10000 > 8000: would wait ~60 s, beyond max_wait
    # waiting 60 s exceeds max_wait=20 -> refused with the delay to tell the user
    with pytest.raises(LLMBusy) as busy:
        asyncio.run(go())
    assert 30 <= busy.value.retry_after <= 60
    now[0] = 61
    asyncio.run(gate.acquire(3000))                     # the window has moved on
    gate2 = RateGate(rpm=2, tpm=10 ** 6, max_wait=0, clock=lambda: 0.0, sleep=sleep)
    asyncio.run(gate2.acquire(1)); asyncio.run(gate2.acquire(1))
    with pytest.raises(LLMBusy):
        asyncio.run(gate2.acquire(1))
    settled = RateGate(rpm=30, tpm=8000, max_wait=0, clock=lambda: 0.0, sleep=sleep)
    entry = asyncio.run(settled.acquire(3000))
    settled.settle(entry, None)                          # a failed call frees its reservation
    assert not settled.events


def test_settings_reject_groq_with_remote_embeddings_and_bad_values():
    with pytest.raises(ValueError, match='embeddings'):
        replace(Settings(), llm_provider='groq', mode='hybrid', embedding_provider='openai')
    replace(Settings(), llm_provider='groq', mode='hybrid', embedding_provider='local')
    with pytest.raises(ValueError):
        replace(Settings(), llm_provider='mistral')
    assert replace(Settings(), llm_provider='groq', groq_api_key='k').generation_model == 'openai/gpt-oss-120b'
    assert not replace(Settings(), llm_provider='groq', groq_api_key='k', api_key='o').web_available


# -- Beta endpoints ---------------------------------------------------------------------------

def test_beta_requires_a_valid_link(tmp_path, monkeypatch):
    monkeypatch.setattr('chati.main.generate', AsyncMock(return_value=(answer(), None)))
    with TestClient(create_app(beta_settings(tmp_path))) as client:
        assert ask(client, None).status_code == 401
        assert ask(client, 'short').status_code == 401
        assert ask(client, new_token()).status_code == 401           # well-formed but unknown
        assert client.get('/api/me').status_code == 401
        assert client.get('/api/status').json()['beta_mode'] is True
        assert client.app.state.guard.rejected(hash_token('x')) is None


def test_beta_counts_questions_and_falls_back_to_consultation_when_used_up(tmp_path, monkeypatch):
    generate = AsyncMock(return_value=(answer(), {'total_tokens': 10}))

    async def fake_generate(*args, **kwargs):
        TOKEN_COUNTER.get()[0] += 1234
        return await generate(*args, **kwargs)

    monkeypatch.setattr('chati.main.generate', fake_generate)
    with TestClient(create_app(beta_settings(tmp_path))) as client:
        token = add_invite(client)
        me = client.get('/api/me', headers={'Authorization': f'Bearer {token}'}).json()
        assert me['remaining'] == 3 and me['limit'] == 3 and me['label'] == 'Alice'
        for expected in (2, 1, 0):
            result = [e for e in events(ask(client, token)) if e['_event'] == 'answer'][0]
            assert result['mode'] == 'generated' and result['quota']['remaining'] == expected and result['quota']['exhausted'] is False
        store = client.app.state.quota
        assert sum(b.get('tokens', 0) for b in store.budget.values()) == 3 * 1234
        final = [e for e in events(ask(client, token)) if e['_event'] == 'answer'][0]
        assert generate.await_count == 3                               # no 4th generation
        assert final['mode'] == 'consultation' and final['model'] is None
        assert final['quota']['exhausted'] and final['quota']['reason'] == 'user_exhausted' and final['quota']['remaining'] == 0
        assert 'questions du jour' in final['blocks'][0]['text'] and final['sources']
        assert client.get('/api/me', headers={'Authorization': f'Bearer {token}'}).json()['remaining'] == 0


def test_failed_generation_gives_the_question_back(tmp_path, monkeypatch):
    calls = iter([ValueError('refs'), LLMBusy(12), openai.RateLimitError('429', response=SimpleNamespace(request=None, status_code=429, headers={}), body=None)])

    async def failing(*args, **kwargs):
        raise next(calls)

    monkeypatch.setattr('chati.main.generate', failing)
    with TestClient(create_app(beta_settings(tmp_path))) as client:
        token = add_invite(client)
        # a failed reference check now shows the closest passages, still without counting the question
        fallback = events(ask(client, token))
        assert not [e for e in fallback if e['_event'] == 'error']
        shown = [e for e in fallback if e['_event'] == 'answer'][0]
        assert shown['mode'] == 'consultation' and shown['quota']['remaining'] == 3
        errors = [[e for e in events(ask(client, token)) if e['_event'] == 'error'][0] for _ in range(2)]
        assert '12 secondes' in errors[0]['message'] and errors[0]['retry_after'] == 12
        assert 'ne compte pas' in errors[1]['message'] and 'retry_after' not in errors[1]
        assert client.get('/api/me', headers={'Authorization': f'Bearer {token}'}).json()['remaining'] == 3


def test_global_budget_exhausted_serves_consultation_to_everyone(tmp_path, monkeypatch):
    generate = AsyncMock(return_value=(answer(), None))
    monkeypatch.setattr('chati.main.generate', generate)
    with TestClient(create_app(beta_settings(tmp_path, daily_request_cap=1))) as client:
        a, b = add_invite(client), add_invite(client)
        assert [e for e in events(ask(client, a)) if e['_event'] == 'answer'][0]['mode'] == 'generated'
        other = [e for e in events(ask(client, b)) if e['_event'] == 'answer'][0]
        assert other['mode'] == 'consultation' and other['quota']['reason'] == 'budget_exhausted' and generate.await_count == 1


def test_web_research_is_unavailable_with_groq(tmp_path):
    with TestClient(create_app(beta_settings(tmp_path))) as client:
        token = add_invite(client)
        response = client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'x'}], 'research': True}, headers={'Authorization': f'Bearer {token}'})
        assert response.status_code == 503 and client.get('/api/status').json()['web_available'] is False


def test_non_beta_server_is_unchanged(tmp_path, monkeypatch):
    monkeypatch.setattr('chati.main.generate', AsyncMock(return_value=(answer(), None)))
    with TestClient(create_app(replace(beta_settings(tmp_path), beta_mode=False))) as client:
        assert client.get('/api/me').json() == {'beta': False}
        result = [e for e in events(ask(client, None)) if e['_event'] == 'answer'][0]
        assert result['quota'] is None and result['mode'] == 'generated'
