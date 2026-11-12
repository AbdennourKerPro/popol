import asyncio
from dataclasses import replace
import logging
import uuid

from fastapi.testclient import TestClient

from chati.config import Settings
from chati.main import create_app
from chati.quota import FirestoreStore
from test_api import settings  # noqa: F401 (fixture)
from test_beta import add_invite, beta_settings

FIELDS = {'day', 'rating', 'reason', 'status', 'mode', 'section_ids', 'themes'}


def body(**extra):
    return {'request_id': str(uuid.uuid4()), 'rating': 'down', 'reason': 'incomplet', 'status': 'answered', 'mode': 'generated',
            'source_ids': ['p3c01-ss07-m001', 'p1c01-ss01-m001'], **extra}


def test_feedback_body_is_strict(settings):
    with TestClient(create_app(settings)) as client:
        post = lambda data: client.post('/api/feedback', json=data).status_code
        assert post(body()) == 201
        assert post(body(question='Retraites ?')) == 422                    # no free text accepted
        assert post(body(request_id='pas-un-uuid')) == 422
        assert post(body(rating='bof')) == 422 and post(body(reason='autre')) == 422
        assert post(body(rating='up')) == 422                               # a reason only goes with a thumbs down
        assert post(body(rating='up', reason=None)) == 201
        assert post(body(source_ids=['p3c01-ss07-m001'] * 21)) == 422
        assert post(body(source_ids=['s99-ss99-m999'])) == 422              # validated against the corpus
        assert post(body(status='inconnu')) == 422 and post(body(mode='web')) == 422


def test_one_feedback_per_answer_and_bounded_memory(settings):
    with TestClient(create_app(settings)) as client:
        data = body()
        assert client.post('/api/feedback', json=data).status_code == 201
        assert client.post('/api/feedback', json={**data, 'rating': 'up', 'reason': None}).status_code == 409
        for _ in range(2001):
            client.app.state.feedback_seen[str(uuid.uuid4())] = True
        assert client.post('/api/feedback', json=body()).status_code == 201
        assert len(client.app.state.feedback_seen) == 2000


def test_outside_beta_feedback_is_only_logged_without_text(settings, caplog):
    with caplog.at_level(logging.INFO, logger='chati'), TestClient(create_app(settings)) as client:
        client.post('/api/feedback', json=body())
    line = next(r.getMessage() for r in caplog.records if r.getMessage().startswith('feedback '))
    assert '"rating": "down"' in line and '"section_ids": ["p3c01", "p1c01"]' in line and 'request_id' not in line


def test_beta_feedback_needs_a_link_and_stores_no_free_text(tmp_path):
    with TestClient(create_app(beta_settings(tmp_path))) as client:
        assert client.post('/api/feedback', json=body()).status_code == 401
        token = add_invite(client)
        response = client.post('/api/feedback', json=body(), headers={'Authorization': f'Bearer {token}'})
        assert response.status_code == 201
        [doc] = client.app.state.quota.feedback
        assert set(doc) == FIELDS and doc['rating'] == 'down' and doc['reason'] == 'incomplet'
        assert doc['section_ids'] == ['p3c01', 'p1c01'] and 'ecologie' in doc['themes']
        assert all(not isinstance(v, str) or len(v) <= 12 for v in doc.values())   # identifiers and codes only
        # a feedback never uses a question of the quota
        assert client.get('/api/me', headers={'Authorization': f'Bearer {token}'}).json()['remaining'] == 3


def test_firestore_feedback_expires_after_90_days():
    added = []

    class Collection:
        async def add(self, doc):
            added.append(doc)

    class DB:
        def collection(self, name):
            assert name.endswith(('_invites', '_usage', '_budget', '_feedback'))
            return Collection()

    store = FirestoreStore(replace(Settings(), quota_collection_prefix='chati'), db=DB())
    asyncio.run(store.record_feedback({'rating': 'up'}))
    assert added[0]['rating'] == 'up' and (added[0]['expire_at'] - store.now()).days in (89, 90)


def test_admin_summary_counts_ratings_reasons_and_themes():
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
    from beta_admin import feedback_summary
    text = feedback_summary([{'day': '2026-11-10', 'rating': 'up', 'reason': None, 'themes': ['logement']},
                             {'day': '2026-11-11', 'rating': 'down', 'reason': 'incomplet', 'themes': ['logement', 'sante']},
                             {'day': '2026-11-11', 'rating': 'down', 'reason': 'incomplet', 'themes': []}])
    assert '3 avis du 2026-11-10 au 2026-11-11 : 1 👍, 2 👎' in text and 'incomplet    2' in text
    assert text.index('logement') < text.index('sante') and feedback_summary([]) == 'Aucun avis enregistré.'
