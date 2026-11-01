#!/usr/bin/env python3
"""Score a run from explicit reviewer judgments (audit-decisions.json), any context mode.

Same pass rule as score_evaluation.py (benchmark_rules.score_result). Also reports the
stricter rule (accuracy >= 1 and no false absence), token/cache usage including the
query-planning call, and, when the run used retrieval, the recall of the corrigé's
unconditional evidence groups in the context. No semantic judgment is automated.
"""
import argparse, hashlib, json
from pathlib import Path
from statistics import mean, median
from benchmark_rules import group_coverage, score_result

ROOT = Path(__file__).resolve().parents[1]
DIMS = ['accuracy', 'sources', 'limits', 'clarity']
read = lambda p: [json.loads(l) for l in p.read_text().splitlines() if l.strip()]

def main(run, bench):
    raws = {r['id']: r for r in read(run / 'responses.jsonl')}
    refs = {r['id']: r for r in read(bench / 'references.jsonl')}
    decisions = {c['id']: c for c in json.loads((run / 'audit-decisions.json').read_text())['cases']}
    corpus = {r['id'] for n in ['mesures.jsonl', 'annexes.jsonl'] for r in read(ROOT / 'data/structured' / n)}
    assert set(raws) == set(refs) == set(decisions) and len(raws) == 40
    cases = []
    for i, ref in refs.items():
        a, d = raws[i]['answer'], decisions[i]
        assert len(d['criteria']) == len(ref['must_include']), i
        cited = {s for b in a['blocks'] for s in b['source_ids']} | {m['id'] for m in a['measures']}
        assert cited <= corpus, i
        verdict = score_result(dict(zip(DIMS, d['scores'])), bool(d['critical_errors']))
        cond = [v for vs in d['conditional'].values() for v in vs]
        cases.append({'id': i, 'category': ref['category'], 'scores': d['scores'], **verdict,
                      'strict_passed': verdict['passed'] and d['scores'][0] >= 1 and not d.get('false_absence', False),
                      'false_absence': d.get('false_absence', False),
                      'complete': all(v == 1 for v in d['criteria'] + cond),
                      'critical': bool(d['critical_errors']), 'criteria': d['criteria'], 'notes': d['notes']})
    kinds = {}
    for c in cases:
        for crit, value in zip(refs[c['id']].get('criteria', []), c['criteria']):
            kinds.setdefault(crit['kind'], []).append(value)
    by_kind = {k: {'units': sum(v), 'count': len(v), 'coverage': sum(v) / len(v)} for k, v in kinds.items()} or None
    sub = lambda i: i.rsplit('-', 1)[0]
    per_sub = {}
    for c in cases:
        primary = {sub(i) for g in refs[c['id']]['evidence_groups'] for a in g['alternatives'] for i in a if i.startswith('s')}
        for sid in primary:
            row = per_sub.setdefault(sid, [0, 0, 0]); row[0] += 1; row[1] += c['passed']; row[2] += c['complete']
    u = [r['answer']['usage'] for r in raws.values()]
    ver = [r['answer'].get('verification') for r in raws.values() if r['answer'].get('verification')]
    u += [v['first_usage'] for v in ver if v.get('regenerated') and v.get('first_usage')]  # first pass of a regenerated answer
    pu = [r['answer'].get('planner_usage') for r in raws.values() if r['answer'].get('planner_usage')]
    groups = [[group_coverage(g, r['answer']['context_ids']) for g in refs[i]['evidence_groups'] if g['when'] == 'always'] for i, r in raws.items()]
    groups = [g for g in groups if g] if all(r['answer']['context_ids'] for r in raws.values()) else []
    det = lambda k: sum(x['input_tokens_details'][k] for x in u)
    crit = [v for c in cases for v in c['criteria']]
    lat = sorted(r['client_latency_ms'] for r in raws.values())
    m = {'passed': sum(c['passed'] for c in cases), 'strict_passed': sum(c['strict_passed'] for c in cases),
         'complete_and_passed': sum(c['passed'] and c['complete'] for c in cases),
         'failed_ids': [c['id'] for c in cases if not c['passed']], 'critical_error_cases': [c['id'] for c in cases if c['critical']],
         'mean_rubric_score': mean(c['score'] for c in cases), 'criterion_coverage_micro': sum(crit) / len(crit),
         'false_absence_cases': [c['id'] for c in cases if c['false_absence']],
         'context_group_recall_micro': (sum(map(sum, groups)) / sum(map(len, groups))) if groups else None,
         'context_cases_fully_covered': [sum(all(v == 1 for v in g) for g in groups), len(groups)] if groups else None,
         'planner_tokens': {'calls': len(pu), 'input': sum(x['input_tokens'] for x in pu), 'output': sum(x['output_tokens'] for x in pu)},
         'verification': {'cases': len(ver), 'regenerated': [i for i, r in raws.items() if (r['answer'].get('verification') or {}).get('regenerated')]},
         'coverage_by_kind': by_kind,
         'per_subsection_cases_passed_complete': {k: v for k, v in sorted(per_sub.items())},
         'criterion_units': [sum(crit), len(crit)],
         'status_counts': {s: sum(r['answer']['status'] == s for r in raws.values()) for s in ['answered', 'partial', 'not_in_corpus', 'clarification']},
         'tokens': {'input': sum(x['input_tokens'] for x in u), 'cached': det('cached_tokens'), 'cache_write': det('cache_write_tokens'),
                    'uncached': sum(x['input_tokens'] for x in u) - det('cached_tokens') - det('cache_write_tokens'),
                    'output': sum(x['output_tokens'] for x in u), 'reasoning': sum(x['output_tokens_details']['reasoning_tokens'] for x in u)},
         'latency_ms': {'median': median(lat), 'p95': lat[round(0.95 * 39)], 'max': lat[-1]},
         'per_category': {k: [sum(c['passed'] for c in cases if c['category'] == k), sum(c['category'] == k for c in cases)] for k in sorted({c['category'] for c in cases})}}
    assessment = {'benchmark_version': json.loads((bench / 'manifest.json').read_text())['version'],
                  'gold_sha256': hashlib.sha256((bench / 'references.jsonl').read_bytes()).hexdigest(),
                  'audit_sha256': hashlib.sha256((run / 'audit-decisions.json').read_bytes()).hexdigest()}
    (run / 'metrics.json').write_text(json.dumps({'assessment': assessment, 'summary': m, 'cases': cases}, ensure_ascii=False, indent=1) + '\n')
    print(json.dumps(m, ensure_ascii=False, indent=1))

if __name__ == '__main__':
    p = argparse.ArgumentParser(); p.add_argument('--run', type=Path, required=True)
    p.add_argument('--benchmark', type=Path, default=ROOT / 'benchmarks/chati-v1')
    a = p.parse_args(); main(a.run, a.benchmark)
