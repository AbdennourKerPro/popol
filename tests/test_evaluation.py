"""Checks of evaluator integrity and denominator semantics, without model calls."""
import io
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from evaluate_benchmark import collect_case
from score_evaluation import aggregate, build_audit, retrieval_summary


@pytest.fixture
def example():
    corpus = {'p': {'type': 'mesure', 'texte': 'One supported proposal.'},
              'q': {'type': 'mesure', 'texte': 'Another proposal.'}}
    raw = {'id': 'MIL-001', 'messages': [], 'done': True, 'error': None,
           'client_latency_ms': 100, 'answer': {'research': False, 'mode': 'generated',
           'status': 'answered', 'context_ids': ['p', 'q'], 'retrieved_ids': ['p', 'q'],
           'blocks': [{'text': 'A supported proposal plus an unsupported claim.', 'source_ids': ['p']}],
           'measures': [], 'usage': None}}
    ref = {'category': 'precise', 'must_include': ['The requested point.'],
           'conditional_expectations': [],
           'evidence_groups': [{'when': 'always', 'alternatives': [['p']], 'minimum': 1}]}
    decision = {'notes': 'Explicit partial semantic judgement.', 'relevant_ids': ['p'],
                'criteria': [0.5], 'scores': [1, 1, 2, 2], 'block_support': {'0': 0.5}}
    return raw, ref, decision, corpus


def test_citation_contribution_is_not_complete_faithfulness(example):
    raw, ref, decision, corpus = example
    case = build_audit(raw, ref, decision, corpus)
    result = aggregate([case], [raw])
    assert result['generation']['citation_pair_precision'] == 1
    assert result['generation']['block_faithfulness'] == 0.5
    assert result['generation']['criterion_coverage_micro'] == 0.5
    assert result['retrieval']['context']['precision_evidence_cases_micro'] == 0.5


def test_critical_error_blocks_an_otherwise_high_score(example):
    raw, ref, decision, corpus = example
    decision.update(scores=[2, 2, 2, 2], critical_errors=['Invented institutional power.'])
    case = build_audit(raw, ref, decision, corpus)
    assert case['score'] == 100 and not case['passed']


def test_missing_semantic_review_is_not_automatically_passed(example):
    raw, ref, decision, corpus = example
    decision['notes'] = ''
    with pytest.raises(ValueError, match='Missing semantic audit'):
        build_audit(raw, ref, decision, corpus)


def test_missing_criterion_or_unobserved_passage_label_is_rejected(example):
    raw, ref, decision, corpus = example
    decision['criteria'] = []
    with pytest.raises(ValueError, match='criterion'):
        build_audit(raw, ref, decision, corpus)
    decision.update(criteria=[1], relevant_ids=['not-retrieved'])
    with pytest.raises(ValueError, match='relevance label'):
        build_audit(raw, ref, decision, corpus)


def test_empty_evidence_groups_are_not_free_recall(example):
    raw, ref, decision, corpus = example
    ref['evidence_groups'] = []
    case = build_audit(raw, ref, decision, corpus)
    result = retrieval_summary([case], 'context')
    assert result['cases_with_active_evidence'] == 0
    assert result['known_group_recall_macro'] is None
    assert result['precision_all_cases_micro'] == 0.5


def test_technical_failure_counts_against_pass_denominator(example):
    raw, ref, decision, corpus = example
    raw.update(error='TimeoutError', answer=None, done=False)
    case = build_audit(raw, ref, decision, corpus)
    result = aggregate([case], [raw])
    assert result['question_count'] == 1 and result['passed'] == 0
    assert result['pass_rate'] == 0 and result['generation']['criterion_coverage_macro'] is None


def test_incomplete_sse_is_recorded_as_error(monkeypatch):
    body = b'event: answer\ndata: {"blocks": []}\n\n'
    monkeypatch.setattr('urllib.request.urlopen', lambda *a, **k: io.BytesIO(body))
    case = collect_case('http://localhost', {'id': 'MIL-001', 'messages': []}, 10)
    assert not case['done'] and 'Incomplete SSE' in case['error']
    assert case['answer'] is not None  # Partial received data is preserved, never silently passed.
