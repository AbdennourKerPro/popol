"""Beta access: invitation links with a daily question quota, plus a global daily budget.

An invitation is a random token carried by the access link. Only its SHA-256 is stored
(Firestore document id), so a database leak does not reveal usable links. A question
reserves one unit of the invitation's daily quota and of the global budget *before*
generation, in one transaction; the unit is given back when no answer was delivered.
The global budget protects the provider's free daily limits.
"""
import asyncio
import random
from collections import OrderedDict, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
import re
import secrets
import time
from zoneinfo import ZoneInfo

TOKEN_SHAPE = re.compile(r'^[A-Za-z0-9_-]{20,128}$')
MESSAGES = {
    'invalid': 'Lien d’accès invalide. Utilisez le lien personnel qui vous a été envoyé.',
    'inactive': 'Ce lien d’accès a été désactivé.',
    'expired': 'Ce lien d’accès a expiré.',
    'user_exhausted': 'Vous avez utilisé toutes vos questions du jour. Elles reviennent demain ; vous pouvez en attendant consulter les mesures du programme.',
    'budget_exhausted': 'La bêta a atteint sa capacité gratuite du jour. Elle reprend demain ; vous pouvez en attendant consulter les mesures du programme.',
}


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_token() -> str:
    return secrets.token_urlsafe(32)


def valid_shape(token) -> bool:
    return isinstance(token, str) and bool(TOKEN_SHAPE.match(token))


class QuotaDenied(Exception):
    def __init__(self, code, grant=None):
        super().__init__(code)
        self.code, self.grant = code, grant
        self.message = MESSAGES[code]


@dataclass
class Grant:
    invite_id: str
    label: str
    day: str            # quota day (user timezone)
    budget_day: str     # budget day
    limit: int
    used: int           # questions used today, including this one once reserved
    resets_at: str
    reserved: bool = False
    settled: bool = field(default=False, repr=False)

    @property
    def remaining(self):
        return max(0, self.limit - self.used)

    def public(self, exhausted=False, reason=None):
        return {'limit': self.limit, 'used': self.used, 'remaining': self.remaining,
                'resets_at': self.resets_at, 'exhausted': exhausted, 'reason': reason}


def _aware(value):
    if value is not None and getattr(value, 'tzinfo', None) is None:
        return value.replace(tzinfo=timezone.utc)
    return value


class BaseStore:
    def __init__(self, settings, now=None):
        self.s, self._now = settings, now or (lambda: datetime.now(timezone.utc))
        self.user_tz, self.budget_tz = ZoneInfo(settings.quota_timezone), ZoneInfo(settings.budget_timezone)

    def now(self):
        return self._now()

    def keys(self):
        now = self.now()
        user_now = now.astimezone(self.user_tz)
        reset = (user_now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        return user_now.strftime('%Y-%m-%d'), now.astimezone(self.budget_tz).strftime('%Y-%m-%d'), reset.isoformat()

    def check_invite(self, invite, now):
        if invite is None:
            raise QuotaDenied('invalid')
        if not invite.get('active', True):
            raise QuotaDenied('inactive')
        expires = _aware(invite.get('expires_at'))
        if expires is not None and expires <= now:
            raise QuotaDenied('expired')
        return int(invite.get('daily_limit') or self.s.invite_daily_limit)

    def decide(self, invite, usage, budget, invite_id):
        """Pure decision from the three documents; returns the new counters or raises."""
        now = self.now()
        day, budget_day, resets = self.keys()
        limit = self.check_invite(invite, now)
        used = int((usage or {}).get('count', 0))
        grant = Grant(invite_id, (invite or {}).get('label', ''), day, budget_day, limit, used, resets)
        if used >= limit:
            raise QuotaDenied('user_exhausted', grant)
        requests, tokens = int((budget or {}).get('requests', 0)), int((budget or {}).get('tokens', 0))
        if requests >= self.s.daily_request_cap or tokens + self.s.llm_tokens_per_request > self.s.daily_token_cap:
            raise QuotaDenied('budget_exhausted', grant)
        grant.used, grant.reserved = used + 1, True
        return grant, requests + 1

    async def peek(self, invite_id):
        raise NotImplementedError

    async def reserve(self, invite_id):
        raise NotImplementedError

    async def commit_tokens(self, grant, tokens):
        raise NotImplementedError

    async def release(self, grant):
        raise NotImplementedError


class MemoryStore(BaseStore):
    """Single-process store for tests and local development. Not for deployment."""

    def __init__(self, settings, now=None):
        super().__init__(settings, now)
        self.invites, self.usage, self.budget = {}, {}, {}
        self._lock = asyncio.Lock()

    async def create_invite(self, label, daily_limit=None, days=None):
        token = new_token()
        self.invites[hash_token(token)] = {'label': label, 'daily_limit': daily_limit, 'active': True,
                                           'created_at': self.now(), 'expires_at': self.now() + timedelta(days=days) if days else None}
        return token

    async def peek(self, invite_id):
        async with self._lock:
            day, budget_day, resets = self.keys()
            invite = self.invites.get(invite_id)
            limit = self.check_invite(invite, self.now())
            used = int(self.usage.get((invite_id, day), {}).get('count', 0))
            return Grant(invite_id, invite.get('label', ''), day, budget_day, limit, used, resets)

    async def reserve(self, invite_id):
        async with self._lock:
            day, budget_day, _ = self.keys()
            grant, requests = self.decide(self.invites.get(invite_id), self.usage.get((invite_id, day)), self.budget.get(budget_day), invite_id)
            self.usage.setdefault((invite_id, day), {})['count'] = grant.used
            self.budget.setdefault(budget_day, {})['requests'] = requests
            return grant

    async def commit_tokens(self, grant, tokens):
        async with self._lock:
            self.usage.setdefault((grant.invite_id, grant.day), {})['tokens'] = self.usage.get((grant.invite_id, grant.day), {}).get('tokens', 0) + tokens
            self.budget.setdefault(grant.budget_day, {})['tokens'] = self.budget.get(grant.budget_day, {}).get('tokens', 0) + tokens

    async def release(self, grant):
        if not grant.reserved or grant.settled:
            return
        grant.settled = True
        async with self._lock:
            self.usage[(grant.invite_id, grant.day)]['count'] -= 1
            self.budget[grant.budget_day]['requests'] -= 1


class FirestoreStore(BaseStore):
    """Cloud Firestore through the Firebase Admin SDK (async client). Collections:
    <prefix>_invites/{sha256}, <prefix>_usage/{sha256}_{day}, <prefix>_budget/{day}."""

    def __init__(self, settings, db=None, now=None):
        super().__init__(settings, now)
        if db is None:
            if os.environ.get('FIRESTORE_EMULATOR_HOST'):  # local emulator: no credentials needed
                from google.cloud.firestore import AsyncClient
                db = AsyncClient(project=settings.firebase_project_id or os.environ.get('GOOGLE_CLOUD_PROJECT') or 'demo-chati')
            else:
                import firebase_admin
                from firebase_admin import firestore_async
                try:
                    app = firebase_admin.get_app()
                except ValueError:
                    options = {'projectId': settings.firebase_project_id} if settings.firebase_project_id else None
                    # Hosts without a mounted file (Hugging Face Spaces) pass the service account as a secret.
                    inline = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON', '').strip()
                    if inline:
                        from firebase_admin import credentials
                        app = firebase_admin.initialize_app(credentials.Certificate(json.loads(inline)), options=options)
                    else:
                        app = firebase_admin.initialize_app(options=options)  # Application Default Credentials
                db = firestore_async.client(app)
        self.db = db
        self._lock = asyncio.Lock()  # one reservation at a time per process: no self-inflicted contention
        prefix = settings.quota_collection_prefix
        self.invites, self.usage, self.budget = (db.collection(f'{prefix}_{n}') for n in ('invites', 'usage', 'budget'))

    def refs(self, invite_id, day, budget_day):
        return self.invites.document(invite_id), self.usage.document(f'{invite_id}_{day}'), self.budget.document(budget_day)

    @staticmethod
    def data(snapshot):
        return snapshot.to_dict() if snapshot.exists else None

    async def peek(self, invite_id):
        day, budget_day, resets = self.keys()
        invite_ref, usage_ref, _ = self.refs(invite_id, day, budget_day)
        invite = self.data(await invite_ref.get())
        limit = self.check_invite(invite, self.now())
        usage = self.data(await usage_ref.get())
        return Grant(invite_id, invite.get('label', ''), day, budget_day, limit, int((usage or {}).get('count', 0)), resets)

    async def reserve(self, invite_id):
        from google.cloud import firestore
        day, budget_day, _ = self.keys()
        invite_ref, usage_ref, budget_ref = self.refs(invite_id, day, budget_day)

        @firestore.async_transactional
        async def run(transaction):
            # All reads first, then writes; the function may be retried, so it has no side effects.
            invite = self.data(await invite_ref.get(transaction=transaction))
            usage = self.data(await usage_ref.get(transaction=transaction))
            budget = self.data(await budget_ref.get(transaction=transaction))
            try:
                grant, requests = self.decide(invite, usage, budget, invite_id)
            except QuotaDenied as denied:
                return denied
            transaction.set(usage_ref, {'invite_id': invite_id, 'day': day, 'count': grant.used,
                                        'expire_at': self.now() + timedelta(days=40), 'updated_at': firestore.SERVER_TIMESTAMP}, merge=True)
            transaction.set(budget_ref, {'day': budget_day, 'requests': requests,
                                         'expire_at': self.now() + timedelta(days=40), 'updated_at': firestore.SERVER_TIMESTAMP}, merge=True)
            return grant

        async with self._lock:
            for attempt in range(4):
                try:
                    result = await run(self.db.transaction())
                    break
                except ValueError:  # transaction aborted five times by other instances: back off and retry
                    if attempt == 3:
                        raise
                    await asyncio.sleep(random.uniform(0.05, 0.3) * (attempt + 1))
        if isinstance(result, QuotaDenied):
            raise result
        return result

    async def commit_tokens(self, grant, tokens):
        from google.cloud import firestore
        _, usage_ref, budget_ref = self.refs(grant.invite_id, grant.day, grant.budget_day)
        batch = self.db.batch()
        batch.set(usage_ref, {'tokens': firestore.Increment(int(tokens))}, merge=True)
        batch.set(budget_ref, {'tokens': firestore.Increment(int(tokens))}, merge=True)
        await batch.commit()

    async def release(self, grant):
        if not grant.reserved or grant.settled:
            return
        grant.settled = True
        from google.cloud import firestore
        _, usage_ref, budget_ref = self.refs(grant.invite_id, grant.day, grant.budget_day)
        batch = self.db.batch()
        batch.set(usage_ref, {'count': firestore.Increment(-1)}, merge=True)
        batch.set(budget_ref, {'requests': firestore.Increment(-1)}, merge=True)
        await batch.commit()

    # -- administration (scripts/beta_admin.py) --
    async def create_invite(self, label, daily_limit=None, days=None):
        from google.cloud import firestore
        token = new_token()
        await self.invites.document(hash_token(token)).set({
            'label': label, 'daily_limit': daily_limit, 'active': True,
            'created_at': firestore.SERVER_TIMESTAMP,
            'expires_at': self.now() + timedelta(days=days) if days else None})
        return token

    async def set_active(self, invite_id, active):
        await self.invites.document(invite_id).update({'active': active})

    async def report(self):
        day, budget_day, _ = self.keys()
        from google.cloud.firestore_v1.base_query import FieldFilter
        used = {d.id: d.to_dict() async for d in self.usage.where(filter=FieldFilter('day', '==', day)).stream()}
        invites = []
        async for doc in self.invites.stream():
            data = doc.to_dict()
            invites.append({'id': doc.id, **data, 'today': used.get(f'{doc.id}_{day}', {}).get('count', 0)})
        budget = self.data(await self.budget.document(budget_day).get())
        return invites, budget or {}


class InviteGuard:
    """Keeps invalid links from burning the database's free read quota."""

    def __init__(self, max_unknown_per_minute=30, clock=time.monotonic, remember=512):
        self.max, self.clock, self.remember = max_unknown_per_minute, clock, remember
        self.known_bad = OrderedDict()   # invite_id -> expiry (monotonic)
        self.unknown_events = deque()

    def rejected(self, invite_id):
        expiry = self.known_bad.get(invite_id)
        if expiry and expiry > self.clock():
            return 'known_bad'
        return None

    def allow_lookup(self, invite_id):
        now = self.clock()
        while self.unknown_events and now - self.unknown_events[0] > 60:
            self.unknown_events.popleft()
        return len(self.unknown_events) < self.max

    def record_bad(self, invite_id):
        self.unknown_events.append(self.clock())
        self.known_bad[invite_id] = self.clock() + 300
        while len(self.known_bad) > self.remember:
            self.known_bad.popitem(last=False)


def make_store(settings, now=None):
    if settings.quota_backend == 'memory':
        return MemoryStore(settings, now)
    return FirestoreStore(settings, now=now)
