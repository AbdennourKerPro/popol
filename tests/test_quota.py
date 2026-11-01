import asyncio
from dataclasses import replace
from datetime import datetime, timedelta, timezone
import os
from zoneinfo import ZoneInfo

import pytest

from chati.config import Settings
from chati.quota import FirestoreStore, InviteGuard, MemoryStore, QuotaDenied, hash_token, new_token, valid_shape

ROOT_SETTINGS = Settings(quota_backend='memory', invite_daily_limit=3, daily_request_cap=50, daily_token_cap=20000, llm_tokens_per_request=3000,
                         quota_timezone='Europe/Paris', budget_timezone='UTC')


class Clock:
    def __init__(self, start):
        self.value = start

    def __call__(self):
        return self.value


EMULATOR = os.environ.get('FIRESTORE_EMULATOR_HOST')


def make(kind, clock, settings=ROOT_SETTINGS, prefix=None):
    if kind == 'memory':
        return MemoryStore(settings, clock)
    from google.cloud.firestore import AsyncClient
    prefix = prefix or f'test{os.getpid()}{int(clock().timestamp())}{id(clock) % 9999}'
    return FirestoreStore(replace(settings, quota_collection_prefix=prefix), db=AsyncClient(project='demo-chati'), now=clock)


@pytest.fixture(params=['memory', pytest.param('firestore', marks=pytest.mark.skipif(not EMULATOR, reason='needs FIRESTORE_EMULATOR_HOST'))])
def kind(request):
    return request.param


def run(coro):
    return asyncio.run(coro)


def test_tokens_are_random_and_only_hashes_are_stored(kind):
    assert valid_shape(new_token()) and new_token() != new_token()
    assert not valid_shape('short') and not valid_shape('a' * 20 + '!') and not valid_shape(None)
    clock = Clock(datetime(2026, 11, 2, 10, tzinfo=timezone.utc))
    store = make(kind, clock)

    async def go():
        token = await store.create_invite('Alice')
        assert hash_token(token) != token and len(hash_token(token)) == 64
        grant = await store.peek(hash_token(token))
        assert grant.label == 'Alice' and grant.limit == 3 and grant.used == 0 and grant.remaining == 3
        return token
    run(go())
    if kind == 'memory':
        assert all(k == hash_token(t) or len(k) == 64 for t in [] for k in store.invites)
        assert all(len(k) == 64 for k in store.invites)


def test_daily_limit_release_and_next_day(kind):
    clock = Clock(datetime(2026, 11, 2, 21, 30, tzinfo=timezone.utc))   # 22:30 in Paris
    store = make(kind, clock)

    async def go():
        invite = hash_token(await store.create_invite('Bob'))
        first = await store.reserve(invite)
        assert (first.used, first.remaining) == (1, 2)
        await store.reserve(invite)
        third = await store.reserve(invite)
        assert third.remaining == 0
        with pytest.raises(QuotaDenied) as denied:
            await store.reserve(invite)
        assert denied.value.code == 'user_exhausted' and denied.value.grant.remaining == 0
        await store.release(third)
        await store.release(third)                      # idempotent: a unit is given back once
        again = await store.reserve(invite)
        assert again.used == 3
        with pytest.raises(QuotaDenied):
            await store.reserve(invite)
        # Paris midnight passes (23:00 UTC) -> a new day, the quota is back
        clock.value = datetime(2026, 11, 2, 23, 5, tzinfo=timezone.utc)
        fresh = await store.reserve(invite)
        assert fresh.used == 1 and fresh.day == '2026-11-03' and fresh.resets_at.startswith('2026-11-04T00:00:00')
    run(go())


def test_invalid_inactive_and_expired_links(kind):
    clock = Clock(datetime(2026, 11, 2, 10, tzinfo=timezone.utc))
    store = make(kind, clock)

    async def go():
        with pytest.raises(QuotaDenied) as e:
            await store.reserve(hash_token('x' * 30))
        assert e.value.code == 'invalid'
        short = hash_token(await store.create_invite('Court', days=1))
        stopped = await store.create_invite('Stop')
        if kind == 'memory':
            store.invites[hash_token(stopped)]['active'] = False
        else:
            await store.set_active(hash_token(stopped), False)
        with pytest.raises(QuotaDenied) as e:
            await store.reserve(hash_token(stopped))
        assert e.value.code == 'inactive'
        await store.reserve(short)
        clock.value += timedelta(days=2)
        with pytest.raises(QuotaDenied) as e:
            await store.reserve(short)
        assert e.value.code == 'expired'
    run(go())


def test_global_budget_stops_everyone(kind):
    clock = Clock(datetime(2026, 11, 2, 10, tzinfo=timezone.utc))
    store = make(kind, clock, replace(ROOT_SETTINGS, daily_request_cap=2, invite_daily_limit=5))

    async def go():
        a, b = hash_token(await store.create_invite('A')), hash_token(await store.create_invite('B'))
        await store.reserve(a)
        await store.reserve(b)
        with pytest.raises(QuotaDenied) as e:
            await store.reserve(a)
        assert e.value.code == 'budget_exhausted'
    run(go())


def test_token_budget_counts_tokens_actually_used(kind):
    clock = Clock(datetime(2026, 11, 2, 10, tzinfo=timezone.utc))
    store = make(kind, clock, replace(ROOT_SETTINGS, daily_token_cap=7000, llm_tokens_per_request=3000, invite_daily_limit=10))

    async def go():
        invite = hash_token(await store.create_invite('A'))
        grant = await store.reserve(invite)
        await store.commit_tokens(grant, 3500)
        grant = await store.reserve(invite)           # 3500 + 3000 <= 7000
        await store.commit_tokens(grant, 3500)
        with pytest.raises(QuotaDenied) as e:         # 7000 + 3000 > 7000
            await store.reserve(invite)
        assert e.value.code == 'budget_exhausted'
    run(go())


def test_concurrent_reservations_never_exceed_the_limit(kind):
    clock = Clock(datetime(2026, 11, 2, 10, tzinfo=timezone.utc))
    store = make(kind, clock, replace(ROOT_SETTINGS, invite_daily_limit=3))

    async def go():
        invite = hash_token(await store.create_invite('A'))
        results = await asyncio.gather(*[store.reserve(invite) for _ in range(5)], return_exceptions=True)
        granted = [r for r in results if not isinstance(r, BaseException)]
        denied = [r for r in results if isinstance(r, QuotaDenied)]
        assert len(granted) == 3 and len(denied) == 2
        assert sorted(g.used for g in granted) == [1, 2, 3]
    run(go())


def test_invite_guard_blocks_floods_of_unknown_links():
    now = [0.0]
    guard = InviteGuard(max_unknown_per_minute=3, clock=lambda: now[0])
    assert guard.allow_lookup('a') and guard.rejected('a') is None
    for i in range(3):
        guard.record_bad(f'bad{i}')
    assert not guard.allow_lookup('new') and guard.rejected('bad1') == 'known_bad'
    now[0] = 61
    assert guard.allow_lookup('new')
    now[0] = 400
    assert guard.rejected('bad1') is None


def test_inline_service_account_secret_is_used(monkeypatch):
    import firebase_admin
    from firebase_admin import credentials, firestore_async
    seen = {}
    monkeypatch.delenv('FIRESTORE_EMULATOR_HOST', raising=False)
    monkeypatch.setenv('FIREBASE_SERVICE_ACCOUNT_JSON', '{"type": "service_account", "project_id": "p"}')
    monkeypatch.setattr(firebase_admin, 'get_app', lambda: (_ for _ in ()).throw(ValueError()))
    monkeypatch.setattr(credentials, 'Certificate', lambda info: seen.setdefault('info', info) and 'cred')
    monkeypatch.setattr(firebase_admin, 'initialize_app', lambda cred=None, options=None: seen.update(cred=cred, options=options) or 'app')

    class DB:
        def collection(self, name):
            return name
    monkeypatch.setattr(firestore_async, 'client', lambda app: DB())
    from chati.config import Settings
    from chati.quota import FirestoreStore
    FirestoreStore(Settings(firebase_project_id='chati-beta'))
    assert seen['info']['project_id'] == 'p' and seen['cred'] == 'cred' and seen['options'] == {'projectId': 'chati-beta'}
