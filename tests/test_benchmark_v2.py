"""Structural/provenance checks for the held-out benchmark, no model/API calls."""
import hashlib
import json
from pathlib import Path
import re
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'benchmarks/chati-v2'
sys.path.insert(0, str(ROOT / 'scripts'))
from benchmark_rules import group_coverage
import build_benchmark_v2 as builder


def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


@pytest.fixture(scope='module')
def dataset():
    return {r['id']: r for r in rows(BASE / 'references.jsonl')}


@pytest.fixture(scope='module')
def corpus():
    return {r['id']: r for name in ['mesures.jsonl', 'annexes.jsonl']
            for r in rows(ROOT / 'data/structured' / name)}


def test_inputs_are_forty_distinct_gold_free_conversations(dataset):
    inputs = rows(BASE / 'questions.jsonl')
    old = rows(ROOT / 'benchmarks/chati-v1/questions.jsonl')
    assert [q['id'] for q in inputs] == [f'CH2-{i:03d}' for i in range(1, 41)]
    assert len({q['messages'][-1]['content'] for q in inputs}) == 40
    for q in inputs:
        assert set(q) == {'id', 'messages'}
        assert q['messages'] == dataset[q['id']]['messages']
        assert q['messages'][-1]['role'] == 'user'
        assert all(m['role'] in {'user', 'assistant'} for m in q['messages'])
        assert all(q['messages'] != previous['messages'] for previous in old)


def test_no_old_subsection_in_any_main_optional_or_conditional_source(dataset, corpus):
    old = rows(ROOT / 'benchmarks/chati-v1/references.jsonl')
    excluded = {corpus[e['id']]['sous_section_id'] for r in old for e in r['evidence'] if e['type'] == 'mesure'}
    named = set(re.findall(r's\d{2}-ss\d{2}-m\d{3}', json.dumps(old)))
    excluded |= {corpus[i]['sous_section_id'] for i in named if i in corpus}
    selected = set()
    for r in dataset.values():
        all_ids = set(r['reference_ids'] + r['optional_ids'])
        all_ids |= {i for g in r['evidence_groups'] for option in g['alternatives'] for i in option}
        assert all_ids == {e['id'] for e in r['evidence']}
        for identifier in all_ids:
            if corpus[identifier]['type'] == 'mesure':
                sid = corpus[identifier]['sous_section_id']
                assert sid not in excluded, (r['id'], identifier)
                selected.add(sid)
    assert len(selected) == 30
    assert not any(s.startswith('s08-') for s in selected)


def test_evidence_texts_provenance_and_pdf_pages_are_exact(dataset, corpus):
    for r in dataset.values():
        for e in r['evidence']:
            source = corpus[e['id']]
            assert e['texte'] == source['texte']
            assert e['pages_pdf'] == source['verification_pdf']['pages']
            assert all(type(page) is int and 1 <= page <= 59 for page in e['pages_pdf'])
            assert e['ancre_html'] == source['source']['ancre_sous_section']
            assert e['source_sha256'] == source['source_sha256']
            if source['type'] != 'mesure':
                assert e['id'].startswith('a01-') or e['id'] in r['optional_ids']


def test_groups_and_criterion_links_are_complete(dataset):
    kinds = {'fact', 'interpretation', 'limitation', 'clarification', 'refusal', 'resolution', 'structure'}
    for r in dataset.values():
        conditions = {c['when'] for c in r['conditional_expectations']}
        labels = {g['label'] for g in r['evidence_groups']}
        assert len(labels) == len(r['evidence_groups'])
        evidence = {e['id'] for e in r['evidence']}
        assert [c['text'] for c in r['criteria']] == r['must_include']
        assert len({c['id'] for c in r['criteria']}) == len(r['criteria'])
        for c in r['criteria']:
            assert c['kind'] in kinds
            assert set(c['evidence_groups']) <= labels
            if c['kind'] in {'fact', 'interpretation'}:
                assert c['evidence_groups']
        for g in r['evidence_groups']:
            assert g['when'] == 'always' or g['when'] in conditions
            assert 1 <= g['minimum'] <= len(g['alternatives'])
            assert all(option and set(option) <= evidence for option in g['alternatives'])


def test_all_syntheses_combine_new_subsections(dataset, corpus):
    for r in dataset.values():
        if r['category'] == 'transversal':
            assert len({corpus[i]['sous_section_id'] for i in r['reference_ids'] if corpus[i]['type'] == 'mesure'}) >= 2


def test_conversation_fixtures_are_complete_and_not_previous_model_outputs(dataset):
    for r in dataset.values():
        expected = 3 if r['category'] == 'conversation' else 1
        assert len(r['messages']) == expected
        if expected == 3:
            assert [m['role'] for m in r['messages']] == ['user', 'assistant', 'user']


def test_clarification_does_not_require_both_factual_branches(dataset):
    r = dataset['CH2-034']
    assert r['reference_ids'] == []
    assert all(group_coverage(g, []) is None for g in r['evidence_groups'])
    active = ['if_hceres_branch']
    assert [group_coverage(g, ['s06-ss08-m010'], active) for g in r['evidence_groups']] == [1, None]
    assert [group_coverage(g, ['a01-ss02-b073'], active) for g in r['evidence_groups']] == [0, None]


def test_refusal_does_not_force_optional_programme_development(dataset):
    r = dataset['CH2-040']
    assert r['reference_ids'] == []
    assert all(c['kind'] == 'refusal' for c in r['criteria'])
    assert group_coverage(r['evidence_groups'][0], []) is None
    assert group_coverage(r['evidence_groups'][0], [], ['if_isolation_target_given']) == 0


def test_partial_cases_have_real_target_and_explicit_absence_dossier(dataset, corpus):
    checks = json.loads((BASE / 'absence-checks.json').read_text())
    assert {c['case_id'] for c in checks} == {f'CH2-{n:03d}' for n in range(35, 40)}
    for c in checks:
        r = dataset[c['case_id']]
        assert r['answerability'] == 'partial'
        assert r['reference_ids'] and any(v['kind'] == 'limitation' for v in r['criteria'])
        assert c['source_row_count'] == len(corpus)
        assert c['candidate_ids_to_review'] and set(c['candidate_ids_to_review']) <= corpus.keys()
        assert c['finding'] and c['warning']


def test_manifest_and_selection_hashes_match_frozen_data():
    manifest = json.loads((BASE / 'manifest.json').read_text())
    selection = json.loads((BASE / 'selection-report.json').read_text())
    reviewed_manifest = json.loads((BASE / 'reviews/1.0.1-external-review-applied/manifest.json').read_text())
    assert manifest['corpus'] == reviewed_manifest['corpus']
    assert not manifest['not_executed']
    assert manifest['version'] == '1.0.3-user-amended'
    assert manifest['status'] == 'validated_for_execution'
    assert manifest['independently_reviewed_version'] == '1.0.1-external-review-applied'
    assert manifest['independent_review'].endswith('benchmark_review-external-v1.0.1.md')
    assert manifest['measure_subsection_overlap_with_v1'] == 0
    assert len(selection['excluded_by_next_benchmark']) == 39
    assert selection['conservative_extra_exclusions'] == ['s01-ss11']
    assert len(selection['eligible_subsections']) == 40
    for path_key, hash_key in [('measures', 'measures_file_sha256'), ('annexes', 'annexes_file_sha256'),
                               ('pdf', 'pdf_sha256'), ('hierarchy_and_appendices', 'hierarchy_file_sha256')]:
        assert hashlib.sha256((ROOT / manifest['corpus'][path_key]).read_bytes()).hexdigest() == manifest['corpus'][hash_key]
    for filename, key in [('questions.jsonl', 'input_sha256'), ('references.jsonl', 'gold_sha256')]:
        assert hashlib.sha256((BASE / filename).read_bytes()).hexdigest() == manifest[key]
    assert hashlib.sha256((ROOT / 'benchmarks/chati-v1/references.jsonl').read_bytes()).hexdigest() == selection['v1_references_sha256']


def test_complements_cannot_satisfy_the_more_specific_required_claim(dataset):
    norms = next(g for g in dataset['CH2-007']['evidence_groups'] if g['label'] == 'Normes')
    assert group_coverage(norms, ['s04-ss01-m002', 's04-ss01-m003']) == 0
    journals = next(g for g in dataset['CH2-023']['evidence_groups'] if g['label'] == 'Revues')
    assert group_coverage(journals, ['s04-ss09-m007']) == 0
    cults = next(g for g in dataset['CH2-015']['evidence_groups'] if g['label'] == 'Financement cultes')
    assert group_coverage(cults, ['a02-ss02-b013']) == 0


def test_fact_metrics_do_not_double_count_resolution_or_structure(dataset):
    assert len(dataset['CH2-001']['criteria']) == 1
    assert len(dataset['CH2-002']['criteria']) == 1
    for identifier in ['CH2-031', 'CH2-032', 'CH2-033']:
        assert dataset[identifier]['criteria'][0]['kind'] == 'resolution'
    for identifier in ['CH2-027', 'CH2-028', 'CH2-029', 'CH2-030']:
        assert dataset[identifier]['criteria'][-1]['kind'] == 'structure'
    assert not dataset['CH2-028']['benefits_requested']


def test_external_review_input_is_preserved():
    archive = BASE / 'reviews/1.0.0-self-reviewed'
    manifest = json.loads((archive / 'manifest.json').read_text())
    assert manifest['version'] == '1.0.0-self-reviewed'
    for name, key in [('questions.jsonl', 'input_sha256'), ('references.jsonl', 'gold_sha256')]:
        assert hashlib.sha256((archive / name).read_bytes()).hexdigest() == manifest[key]


def test_validated_release_preserves_reviewed_questions_and_semantic_gold(dataset):
    reviewed = BASE / 'reviews/1.0.1-external-review-applied'
    assert (BASE / 'questions.jsonl').read_bytes() == (reviewed / 'questions.jsonl').read_bytes()
    old = {r['id']: r for r in rows(reviewed / 'references.jsonl')}
    for identifier, current in dataset.items():
        if identifier != 'CH2-007':
            assert {k: v for k, v in current.items() if k != 'review_status'} == {k: v for k, v in old[identifier].items() if k != 'review_status'}
        else:
            allowed = {'reference_answer', 'criteria', 'must_include', 'must_not_claim', 'review_notes', 'review_status'}
            assert {k: v for k, v in current.items() if k not in allowed} == {k: v for k, v in old[identifier].items() if k not in allowed}
            assert 'uniquement sur les élargissements' in current['criteria'][0]['text']
    amendment = json.loads((BASE / 'amendment-CH2-007.json').read_text())
    assert builder.semantic_digest(list(dataset.values())) == amendment['approved_semantic_gold_sha256']


def test_unreviewed_change_cannot_keep_validated_status(tmp_path, monkeypatch):
    changed = json.loads(json.dumps(builder.CASES))
    changed[0]['question'] += ' Nouvelle formulation non relue.'
    monkeypatch.setattr(builder, 'OUT', tmp_path)
    monkeypatch.setattr(builder, 'CASES', changed)
    with pytest.raises(ValueError, match='reviewed content'):
        builder.build()
    assert not (tmp_path / 'questions.jsonl').exists()


def test_regeneration_is_deterministic_and_does_not_modify_v1(tmp_path, monkeypatch):
    old_files = list((ROOT / 'benchmarks/chati-v1').glob('*.json*'))
    before = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in old_files}
    monkeypatch.setattr(builder, 'OUT', tmp_path)
    builder.build()
    for name in ['questions.jsonl', 'references.jsonl', 'references.md', 'manifest.json', 'selection-report.json', 'absence-checks.json']:
        assert (tmp_path / name).read_bytes() == (BASE / name).read_bytes()
    assert {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in old_files} == before
