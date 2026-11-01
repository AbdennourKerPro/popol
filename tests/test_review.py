"""Review UI data provenance and human-save behavior; no model calls."""
import copy
import json
from pathlib import Path
import threading
import urllib.error
import urllib.request

import pytest

from review.server import InvalidReview, ReviewStore, make_server, validate_review

ROOT = Path(__file__).resolve().parents[1]
PACKET = ROOT / 'benchmarks/chati-v2/human-review/2026-11-01-session/session.json'


@pytest.fixture(scope='module')
def session():
    return json.loads(PACKET.read_text())


@pytest.fixture
def human_input(session):
    c = next(c for c in session['cases'] if c['id'] == 'CH2-004')
    return {'session_id': session['session_id'], 'case_id': c['id'], 'run': 'initial', 'state': 'draft',
        'reviewer': '', 'scores': dict.fromkeys(['accuracy', 'sources', 'limits', 'clarity']),
        'dimension_reasons': dict.fromkeys(['accuracy', 'sources', 'limits', 'clarity'], ''),
        'criteria': {v['id']: {'coverage': None, 'excerpt': '', 'reason': ''} for v in c['reference']['criteria']},
        'conditions': {}, 'critical_error': '', 'false_absence': '', 'verdict': '', 'notes': '', 'override_reason': ''}


def finalized(data):
    result = copy.deepcopy(data)
    result.update(state='final', scores=dict.fromkeys(data['scores'], 2),
                  dimension_reasons=dict.fromkeys(data['scores'], 'Justification explicite de test.'),
                  critical_error='no', false_absence='no', verdict='valid', notes='Relecture simulée en test uniquement.')
    result['criteria'] = {k: {'coverage': 1, 'excerpt': 'Extrait de test.', 'reason': 'Raison spécifique de test.'} for k in result['criteria']}
    return result


def test_sample_is_stratified_and_perfect_only_in_original_review(session):
    assert len(session['cases']) == 12
    sample = [c for c in session['cases'] if c['group'] == 'sample']
    assert len(sample) == 8 and len({c['category'] for c in sample}) == 6
    assert {c['id'] for c in sample}.isdisjoint(session['selection']['focus_ids'])
    for c in sample:
        initial = c['machine_assessments']['initial']
        assert initial['scores'] == [2, 2, 2, 2] and all(x == 1 for x in initial['criteria'])
        assert c['machine_assessments']['repeat']['id'] == c['id']  # Explicit separate repeat audit.


def test_packet_preserves_both_answers_and_full_frozen_source_context(session):
    corpus = {s['id']: s for s in session['corpus_sources']}
    assert len(corpus) == 966
    for c in session['cases']:
        for data in c['responses'].values():
            assert [s['id'] for s in data['context_sources']] == data['answer']['context_ids']
            for source in data['context_sources']:
                assert source['text'] == corpus[source['id']]['text']
    assert session['comparability']['same_effective_status']
    assert session['comparability']['same_recorded_fingerprints']


def test_draft_never_becomes_perfect_by_default(session, human_input):
    reviewed = validate_review(human_input, session)
    assert reviewed['state'] == 'draft' and reviewed['calculated_score'] is None
    assert reviewed['calculated_pass'] is None and reviewed['verdict'] == ''


def test_final_requires_reasons_per_criterion_and_dimension(session, human_input):
    human_input.update(state='final', verdict='valid', notes='Je souhaite valider.')
    with pytest.raises(InvalidReview, match='dimension'):
        validate_review(human_input, session)
    valid = finalized(human_input)
    valid['criteria'][next(iter(valid['criteria']))]['reason'] = ''
    with pytest.raises(InvalidReview, match='critère'):
        validate_review(valid, session)


def test_human_disagreement_requires_explicit_arbitration_reason(session, human_input):
    data = finalized(human_input); data['critical_error'] = 'yes'
    with pytest.raises(InvalidReview, match='diffère'):
        validate_review(data, session)
    data['override_reason'] = 'Je maintiens mon verdict pour un motif explicite.'
    saved = validate_review(data, session)
    assert saved['calculated_pass'] is False and saved['verdict'] == 'valid'
    assert saved['override_reason']


def test_uncertain_final_is_not_fabricated_numeric_judgment(session, human_input):
    human_input.update(state='final', verdict='uncertain', notes='Je ne peux pas vérifier ce point.')
    result = validate_review(human_input, session)
    assert result['calculated_score'] is None and result['calculated_pass'] is None


def test_session_mismatch_and_unknown_criteria_are_rejected(session, human_input):
    human_input['session_id'] = 'another-session'
    with pytest.raises(InvalidReview, match='autre session'):
        validate_review(human_input, session)
    human_input['session_id'] = session['session_id']; human_input['criteria']['unknown'] = {}
    with pytest.raises(InvalidReview, match='critères'):
        validate_review(human_input, session)


def test_store_survives_restart_and_keeps_other_run_notes(tmp_path, session, human_input):
    path = tmp_path / 'human.json'; store = ReviewStore(path, session)
    first = store.save(human_input)
    human_input['run'] = 'repeat'; human_input['notes'] = 'Autre réponse.'; store.save(human_input)
    restored = ReviewStore(path, session).load()
    assert len(restored['reviews']) == 2
    assert next(r for r in restored['reviews'] if r['run'] == 'initial') == first
    assert not list(tmp_path.glob('.human-review-*'))


def test_store_does_not_overwrite_another_session(tmp_path, session, human_input):
    path = tmp_path / 'human.json'
    original = {'session_id': 'someone-else', 'reviews': [{'notes': 'Conserver.'}]}
    path.write_text(json.dumps(original))
    with pytest.raises(InvalidReview, match='autre session'):
        ReviewStore(path, session).save(human_input)
    assert json.loads(path.read_text()) == original


def test_http_paths_and_save_work_without_access_to_chati_api(tmp_path, session, human_input):
    packet = tmp_path / 'session.json'; packet.write_text(json.dumps(session))
    pdf = tmp_path / 'source.pdf'; pdf.write_bytes(b'%PDF-test')
    server = make_server(packet, tmp_path / 'notes.json', pdf, port=0)
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    base = f'http://127.0.0.1:{server.server_port}'
    try:
        with urllib.request.urlopen(base + '/api/session') as response:
            assert json.load(response)['session_id'] == session['session_id']
        with urllib.request.urlopen(base + '/') as response:
            assert b'Atelier de relecture' in response.read()
        req = urllib.request.Request(base + '/api/annotations', data=json.dumps(human_input).encode(), headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as response:
            assert json.load(response)['review']['calculated_score'] is None
        with urllib.request.urlopen(base + '/api/annotations') as response:
            assert len(json.load(response)['reviews']) == 1
        with pytest.raises(urllib.error.HTTPError) as failure:
            urllib.request.urlopen(base + '/assets/%2e%2e/server.py')
        assert failure.value.code == 404
        req = urllib.request.Request(base + '/api/annotations', data=json.dumps(human_input).encode(), headers={'Content-Type': 'application/json', 'Origin': 'http://other.test'})
        with pytest.raises(urllib.error.HTTPError) as failure:
            urllib.request.urlopen(req)
        assert failure.value.code == 403
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=2)
