"""Deterministic diagnostics only; semantic citation support needs a reviewer.

Conditions are activated by the evaluator after reading the answer. An inactive
group is excluded from recall, not counted as an automatically satisfied group.
"""


def group_coverage(group, retrieved_ids, active_conditions=()):
    if group['when'] != 'always' and group['when'] not in active_conditions:
        return None
    retrieved = set(retrieved_ids)
    covered = sum(set(option) <= retrieved for option in group['alternatives'])
    return min(covered / group['minimum'], 1.0)


def score_result(scores, critical_error=False):
    if set(scores) != {'accuracy', 'sources', 'limits', 'clarity'}:
        raise ValueError('Expected the four rubric dimensions')
    if any(scores[k] is None for k in ['accuracy', 'limits', 'clarity']):
        raise ValueError('Only the sources dimension can be non-applicable')
    applicable = [s for s in scores.values() if s is not None]
    if any(type(s) is not int or s not in [0, 1, 2] for s in applicable):
        raise ValueError('Scores must be integers 0, 1, 2 or None for non-applicable sources')
    score = 100 * sum(applicable) / (2 * len(applicable))
    source_gate = scores['sources'] is None or scores['sources'] >= 1
    return {'score': score, 'passed': score >= 75 and source_gate and not critical_error}
