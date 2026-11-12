import asyncio
from dataclasses import replace
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient
import pytest

from chati.generation import generate
from chati.groq import TOKEN_COUNTER
from chati.main import create_app
from chati.models import Block, GeneratedAnswer, Message
from chati.streaming import complete_blocks
from test_api import corpus, settings, good_answer  # noqa: F401 (fixtures)
from test_beta import FakeChat, groq

FULL = json.dumps({'status': 'answered', 'blocks': [
    {'kind': 'answer', 'text': 'Retraite à « 60 ans » {pas un objet} [ni une liste] \\ "citée"', 'source_ids': ['p3c01-ss07-m001'], 'points': []},
    {'kind': 'explanation', 'text': 'Deux mesures :', 'source_ids': [], 'points': [{'text': 'Point }', 'source_ids': ['p3c01-ss07-m001']}]},
], 'measures': [{'id': 'p3c01-ss07-m001'}], 'suivis': ['"blocks": [{}] ?']}, ensure_ascii=False)


def test_only_complete_blocks_are_returned_at_every_cut():
    expected = json.loads(FULL)['blocks']
    seen = []
    for end in range(len(FULL) + 1):
        found = complete_blocks(FULL[:end])
        assert found == expected[:len(found)]       # never a partial or wrong block
        seen.append(len(found))
    assert seen == sorted(seen) and seen[-1] == 2


def test_cut_in_the_middle_of_a_string_keeps_previous_blocks():
    cut = FULL.index('Deux mesures') + 4
    assert [b['kind'] for b in complete_blocks(FULL[:cut])] == ['answer']
    assert complete_blocks(FULL[:FULL.index('60 ans')]) == []


def test_escaped_quotes_and_braces_do_not_close_a_block():
    raw = '{"status":"answered","blocks":[{"kind":"answer","text":"a \\"}\\" b {","source_ids":[]}'
    assert complete_blocks(raw) == [{'kind': 'answer', 'text': 'a "}" b {', 'source_ids': []}]
    assert complete_blocks(raw[:-1]) == []


def test_empty_or_absent_array_and_other_arrays_are_ignored():
    assert complete_blocks('{"status":"clarification","blocks":[],"measures":[{"id":"x"}]}') == []
    assert complete_blocks('{"status":"answered","measures":[{"id":"x"}]') == []
    assert complete_blocks('') == [] and complete_blocks('{"blocks"') == []
    # a text that looks like the key, inside a string value, is not the array
    assert complete_blocks('{"status":"\\"blocks\\": [{\\"kind\\":1}]","blocks":[{"kind":"answer"}]}') == [{'kind': 'answer'}]


# -- generate() with a streaming client ---------------------------------------------------------


class FakeStream:
    """Shaped like the OpenAI SDK stream: async context manager, delta events, final response."""

    def __init__(self, answer, size=9):
        self.answer, self.text = answer, answer.model_dump_json()
        self.size = size

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return None

    async def __aiter__(self):
        for i in range(0, len(self.text), self.size):
            yield SimpleNamespace(type='response.output_text.delta', delta=self.text[i:i + self.size])
        yield SimpleNamespace(type='response.completed')

    async def get_final_response(self):
        return SimpleNamespace(output_parsed=self.answer, usage=None)


def streaming_client(*answers):
    replies = [FakeStream(a) for a in answers]
    calls = []

    def stream(**kwargs):
        calls.append(kwargs)
        return replies.pop(0)
    return SimpleNamespace(responses=SimpleNamespace(stream=stream, parse=AsyncMock(side_effect=AssertionError('parse must not run')))), calls


def two_blocks(second_ids=('p3c01-ss07-m001',)):
    return GeneratedAnswer(status='answered', blocks=[
        Block(kind='answer', text='Retraite à **60 ans**.', source_ids=['p3c01-ss07-m001']),
        Block(kind='explanation', text='Détail {avec accolades} et "guillemets".', source_ids=list(second_ids))], measures=[])


def test_complete_blocks_are_passed_on_while_the_model_writes(corpus):
    client, calls = streaming_client(two_blocks())
    seen = []
    answer, _ = asyncio.run(generate(client, 'm', [Message(role='user', content='Retraite ?')], [corpus.by_id['p3c01-ss07-m001']],
                                     on_block=lambda i, b: seen.append((i, b['kind'], b['text']))))
    assert seen == [(0, 'answer', 'Retraite à **60 ans**.'), (1, 'explanation', 'Détail {avec accolades} et "guillemets".')]
    assert answer == two_blocks() and calls[0]['text_format'] is GeneratedAnswer and calls[0]['store'] is False


def test_a_block_citing_an_unknown_source_is_not_shown_and_a_retry_resets(corpus):
    bad = two_blocks(second_ids=('s99-ss99-m999',))
    client, calls = streaming_client(bad, two_blocks())
    seen, resets = [], []
    answer, _ = asyncio.run(generate(client, 'm', [Message(role='user', content='Retraite ?')], [corpus.by_id['p3c01-ss07-m001']],
                                     on_block=lambda i, b: seen.append(i), on_reset=lambda: resets.append(len(seen))))
    assert len(calls) == 2 and resets == [1]          # reset after the first attempt's single valid block
    assert seen == [0, 0, 1] and answer == two_blocks()


def test_clients_without_streaming_keep_using_parse(corpus):
    parse = AsyncMock(return_value=SimpleNamespace(output_parsed=good_answer(), usage=None))
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    seen = []
    asyncio.run(generate(client, 'm', [], [corpus.by_id['p3c01-ss07-m001']], on_block=lambda i, b: seen.append(i)))
    assert parse.await_count == 1 and seen == []


def chunk(content=None, finish=None, usage=None):
    choices = [] if content is None and finish is None else [SimpleNamespace(delta=SimpleNamespace(content=content), finish_reason=finish)]
    return SimpleNamespace(choices=choices, usage=usage)


class StreamingChat(FakeChat):
    async def create(self, **kwargs):
        self.calls.append(kwargs)
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply

        async def chunks():
            for item in reply:
                yield item
        return chunks()


def test_groq_streams_deltas_and_counts_the_final_usage():
    text = good_answer().model_dump_json()
    usage = SimpleNamespace(prompt_tokens=1000, completion_tokens=300, total_tokens=1300, completion_tokens_details=None)
    replies = [[chunk(text[i:i + 20]) for i in range(0, len(text), 20)] + [chunk('', 'stop'), chunk(usage=usage)]]
    client, _, _ = groq()
    fake = StreamingChat(*replies)
    client.responses.client = fake
    counter = [0]
    TOKEN_COUNTER.set(counter)

    async def go():
        deltas = []
        async with client.responses.stream(model='m', instructions='i', input=[{'role': 'user', 'content': 'q'}], text_format=GeneratedAnswer) as stream:
            async for event in stream:
                deltas.append(event.delta)
            return deltas, await stream.get_final_response()
    deltas, final = asyncio.run(go())
    assert ''.join(deltas) == text and final.output_parsed == good_answer()
    assert final.usage.model_dump()['total_tokens'] == 1300 and counter[0] == 1300
    sent = fake.calls[0]
    assert sent['stream'] is True and sent['stream_options'] == {'include_usage': True} and sent['response_format']['json_schema']['strict'] is True
    assert client.gate.events[-1][1] == 1300


def test_groq_stream_cut_by_the_token_limit_is_rejected():
    client, _, _ = groq()
    client.responses.client = StreamingChat([chunk('{"status":'), chunk('', 'length')])

    async def go():
        async with client.responses.stream(model='m', instructions='i', input=[{'role': 'user', 'content': 'q'}], text_format=GeneratedAnswer) as stream:
            return await stream.get_final_response()
    with pytest.raises(ValueError, match='tronquée'):
        asyncio.run(go())


# -- SSE events -----------------------------------------------------------------------------------

def kinds(response):
    return [e.split('\n', 1)[0][7:] for e in response.text.strip().split('\n\n')]


def test_block_events_precede_the_answer_and_a_retry_sends_reset(settings, monkeypatch):
    async def streaming_generate(*args, on_block=None, on_reset=None, **kwargs):
        on_block(0, {'kind': 'answer', 'text': 'Premier jet.', 'source_ids': ['p3c01-ss07-m001'], 'points': []})
        await asyncio.sleep(0)
        on_reset()
        on_block(0, {'kind': 'answer', 'text': 'Retraite à 60 ans.', 'source_ids': ['p3c01-ss07-m001'], 'points': []})
        return good_answer(), None
    monkeypatch.setattr('chati.main.generate', streaming_generate)
    with TestClient(create_app(replace(settings, api_key='test-not-a-real-key', consultation=False, stream_blocks=True))) as client:
        response = client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'retraites'}]})
        order = kinds(response)
        assert order.index('block') < order.index('reset') < len(order) - 1 - order[::-1].index('block') < order.index('answer')
        blocks = [json.loads(e.split('data: ', 1)[1]) for e in response.text.strip().split('\n\n') if e.startswith('event: block')]
        assert blocks[-1] == {'request_id': blocks[-1]['request_id'], 'index': 0, 'kind': 'answer', 'text': 'Retraite à 60 ans.', 'source_ids': ['p3c01-ss07-m001'], 'points': []}


def test_no_block_event_when_the_setting_is_off(settings, monkeypatch):
    mocked = AsyncMock(return_value=(good_answer(), None))
    monkeypatch.setattr('chati.main.generate', mocked)
    with TestClient(create_app(replace(settings, api_key='test-not-a-real-key', consultation=False))) as client:
        response = client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'retraites'}]})
        assert 'block' not in kinds(response) and 'reset' not in kinds(response) and 'answer' in kinds(response)
        assert 'on_block' not in mocked.call_args.kwargs


def test_a_failed_streamed_generation_still_falls_back(settings, monkeypatch):
    async def failing(*args, on_block=None, on_reset=None, **kwargs):
        on_block(0, {'kind': 'answer', 'text': 'Brouillon.', 'source_ids': ['p3c01-ss07-m001'], 'points': []})
        raise ValueError('references')
    monkeypatch.setattr('chati.main.generate', failing)
    with TestClient(create_app(replace(settings, api_key='test-not-a-real-key', consultation=False, stream_blocks=True))) as client:
        response = client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'retraites'}]})
        assert kinds(response).index('block') < kinds(response).index('answer') and '"mode": "consultation"' in response.text
