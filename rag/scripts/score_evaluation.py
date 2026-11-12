#!/usr/bin/env python3
"""Recompute a reviewed run without any network or generation call.

Semantic labels are explicit reviewer inputs in audit-decisions.json. This script
does arithmetic and integrity checks; it is not an automatic semantic judge.
"""
import argparse
from copy import deepcopy
import hashlib
import json
from pathlib import Path
from datetime import datetime
from statistics import mean, median

from benchmark_rules import group_coverage, score_result

ROOT = Path(__file__).resolve().parents[1]
DIMENSIONS = ['accuracy', 'sources', 'limits', 'clarity']


def read_jsonl(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def ratio(numerator, denominator):
    return numerator / denominator if denominator else None


def percentile(values, q):
    if not values:
        return None
    values = sorted(values)
    position = (len(values) - 1) * q
    lower = int(position)
    return values[lower] + (values[min(lower + 1, len(values) - 1)] - values[lower]) * (position - lower)


def retrieval_summary(cases, ranking):
    rows = [c['retrieval'][ranking] for c in cases]
    covered = [r['known_group_coverages'] for r in rows if r['known_group_coverages']]
    accepted = [r['accepted_group_coverages'] for r in rows if r['accepted_group_coverages']]
    positive = [r for r in rows if r['known_group_coverages']]
    return {
        'cases_with_active_evidence': len(covered),
        'active_group_count': sum(map(len, covered)),
        'known_group_recall_macro': mean(map(mean, covered)) if covered else None,
        'known_group_recall_micro': ratio(sum(map(sum, covered)), sum(map(len, covered))),
        'all_known_groups_covered_cases': sum(all(v == 1 for v in values) for values in covered),
        'accepted_group_recall_macro': mean(map(mean, accepted)) if accepted else None,
        'accepted_group_recall_micro': ratio(sum(map(sum, accepted)), sum(map(len, accepted))),
        'all_accepted_groups_covered_cases': sum(all(v == 1 for v in values) for values in accepted),
        'precision_evidence_cases_micro': ratio(sum(r['relevant'] for r in positive), sum(r['count'] for r in positive)),
        'precision_evidence_cases_macro': mean(r['relevant'] / r['count'] for r in positive if r['count']) if any(r['count'] for r in positive) else None,
        'relevant_passages_evidence_cases': sum(r['relevant'] for r in positive),
        'passages_evidence_cases': sum(r['count'] for r in positive),
        'precision_all_cases_micro': ratio(sum(r['relevant'] for r in rows), sum(r['count'] for r in rows)),
        'relevant_passages_all_cases': sum(r['relevant'] for r in rows),
        'passages_all_cases': sum(r['count'] for r in rows),
    }


def build_audit(raw, ref, decision, corpus):
    if not decision.get('notes'):
        raise ValueError(f"Missing semantic audit: {raw['id']}")
    answer = raw.get('answer')
    if raw.get('error') or not raw.get('done') or answer is None:
        return {'id': raw['id'], 'category': ref['category'], 'score': 0, 'passed': False,
                'technical_error': raw.get('error') or 'Missing answer', 'notes': decision['notes']}
    if answer.get('research') or answer.get('mode') != 'generated':
        raise ValueError('Expected closed-corpus generated answer')
    context = answer['context_ids']
    retrieved = answer['retrieved_ids']
    if len(set(context)) != len(context) or not set(retrieved) <= set(context):
        raise ValueError('Invalid context/ranking')
    relevant = set(decision['relevant_ids'])
    if not relevant <= set(context) or not set(context) <= corpus.keys():
        raise ValueError(f"Unknown or unobserved relevance label: {raw['id']}")
    conditions = decision.get('active_conditions', [])
    allowed_conditions = {c['when'] for c in ref['conditional_expectations']}
    if not set(conditions) <= allowed_conditions:
        raise ValueError('Unknown condition')
    groups = deepcopy(ref['evidence_groups'])
    for addition in decision.get('accepted_group_additions', []):
        if not addition['reason'] or not set(addition['alternative']) <= corpus.keys():
            raise ValueError('Invalid semantic evidence addition')
        groups[addition['group_index']]['alternatives'].append(addition['alternative'])
    retrieval = {}
    for label, ids in [('top8', retrieved), ('context', context)]:
        known = [x for g in ref['evidence_groups'] if (x := group_coverage(g, ids, conditions)) is not None]
        accepted = [x for g in groups if (x := group_coverage(g, ids, conditions)) is not None]
        retrieval[label] = {'count': len(ids), 'relevant': len(relevant.intersection(ids)),
                            'known_group_coverages': known, 'accepted_group_coverages': accepted}
    criteria_values = decision.get('criteria', [1] * len(ref['must_include']))
    if len(criteria_values) != len(ref['must_include']) or any(v not in [0, 0.5, 1] for v in criteria_values):
        raise ValueError('Missing/invalid criterion label')
    # A separate factual subset avoids calling refusals/clarifications atomic facts.
    number = int(raw['id'].split('-')[1])
    factual_indices = list(range(len(criteria_values))) if number <= 32 else ({35: [0], 37: [0], 39: [0]}.get(number, []))
    criteria = [{'index': i, 'expected': text, 'coverage': value, 'factual_subset': i in factual_indices,
                 'reason': decision['notes']} for i, (text, value) in enumerate(zip(ref['must_include'], criteria_values))]
    conditional = []
    for condition in ref['conditional_expectations']:
        if condition['when'] not in conditions:
            continue
        values = decision.get('conditional_coverage', {}).get(condition['when'])
        if values is None or len(values) != len(condition['expectations']) or any(v not in [0, 0.5, 1] for v in values):
            raise ValueError('Missing/invalid conditional audit')
        conditional.extend({'when': condition['when'], 'expected': text, 'coverage': value,
                            'reason': decision['notes']} for text, value in zip(condition['expectations'], values))
    blocks = []
    for index, block in enumerate(answer['blocks']):
        if not set(block['source_ids']) <= set(context):
            raise ValueError('Citation outside provided context')
        nonfactual = index in decision.get('nonfactual_blocks', [])
        support = None if nonfactual else decision.get('block_support', {}).get(str(index), 1)
        if support not in [None, 0, 0.5, 1]:
            raise ValueError('Invalid block support')
        unsupported = decision.get('unsupported_citations', {}).get(str(index), [])
        if not set(unsupported) <= set(block['source_ids']):
            raise ValueError('Unobserved citation label')
        blocks.append({'index': index, 'text': ' '.join([block['text'], *[p['text'] for p in block.get('points', [])]]), 'support': support,
            'non_applicability_reason': 'Pure limite d’information ou invitation ; aucune proposition positive à vérifier dans ce bloc.' if nonfactual else None,
            'citations': [{'id': sid, 'contributes': sid not in unsupported} for sid in block['source_ids']],
            'reason': decision['notes']})
    measures = [{'id': m['id'], 'support': decision.get('measure_support', {}).get(m['id'], 1),
                 'reason': decision['notes']} for m in answer['measures']]
    if any(m['id'] not in context or corpus[m['id']]['type'] != 'mesure' for m in measures):
        raise ValueError('Invalid explained measure')
    scores = dict(zip(DIMENSIONS, decision.get('scores', [2, 2, 2, 2])))
    if scores['sources'] is None and (decision.get('source_applicability_reason') not in ['clarification', 'refusal', 'absence_only'] or not decision.get('source_applicability_justification')):
        raise ValueError('Unjustified sources exemption')
    critical = decision.get('critical_errors', [])
    verdict = score_result(scores, bool(critical))
    complete = all(v == 1 for v in criteria_values) and all(c['coverage'] == 1 for c in conditional)
    return {'id': raw['id'], 'category': ref['category'], 'answer_status': answer['status'],
            'scores': scores, **verdict, 'critical_errors': critical, 'technical_error': None,
            'criteria': criteria, 'conditional_criteria': conditional, 'all_criteria_complete': complete,
            'active_conditions': conditions, 'accepted_group_additions': decision.get('accepted_group_additions', []),
            'context_labels': [{'id': sid, 'relevant': sid in relevant, 'text': corpus[sid]['texte'],
                                'reason': decision['notes']} for sid in context],
            'retrieval': retrieval, 'blocks': blocks, 'measures': measures, 'notes': decision['notes']}


def aggregate(cases, raws):
    successful = [c for c in cases if not c['technical_error']]
    criteria = [x['coverage'] for c in successful for x in c['criteria']]
    factual = [x['coverage'] for c in successful for x in c['criteria'] if x['factual_subset']]
    conditional = [x['coverage'] for c in successful for x in c['conditional_criteria']]
    blocks = [b for c in successful for b in c['blocks'] if b['support'] is not None]
    citations = [p for b in blocks for p in b['citations']]
    measures = [m['support'] for c in successful for m in c['measures']]
    usage = [r['answer']['usage'] for r in raws if r.get('answer') and r['answer'].get('usage')]
    latencies = [r['client_latency_ms'] for r in raws]
    per_category = {}
    for category in sorted({c['category'] for c in cases}):
        subset = [c for c in cases if c['category'] == category]
        per_category[category] = {'passed': sum(c['passed'] for c in subset), 'count': len(subset),
                                  'mean_score': mean(c['score'] for c in subset)}
    return {'question_count': len(cases), 'answered': len(successful),
        'passed': sum(c['passed'] for c in cases), 'pass_rate': ratio(sum(c['passed'] for c in cases), len(cases)),
        'failed_ids': [c['id'] for c in cases if not c['passed']],
        'mean_rubric_score': mean(c['score'] for c in cases),
        'critical_error_cases': [c['id'] for c in successful if c['critical_errors']],
        'complete_and_passed': sum(c['passed'] and c['all_criteria_complete'] for c in successful),
        'retrieval': {ranking: retrieval_summary(successful, ranking) for ranking in ['top8', 'context']},
        'generation': {'criterion_coverage_micro': ratio(sum(criteria), len(criteria)),
            'criterion_coverage_macro': mean(mean(x['coverage'] for x in c['criteria']) for c in successful) if successful else None,
            'covered_criterion_units': sum(criteria), 'criterion_count': len(criteria),
            'factual_criterion_coverage_micro': ratio(sum(factual), len(factual)),
            'covered_factual_criterion_units': sum(factual), 'factual_criterion_count': len(factual),
            'conditional_coverage_micro': ratio(sum(conditional), len(conditional)),
            'conditional_criterion_count': len(conditional),
            'citation_pair_precision': ratio(sum(p['contributes'] for p in citations), len(citations)),
            'supported_citation_pairs': sum(p['contributes'] for p in citations), 'citation_pair_count': len(citations),
            'block_faithfulness': ratio(sum(b['support'] for b in blocks), len(blocks)),
            'fully_supported_blocks': sum(b['support'] == 1 for b in blocks), 'factual_block_count': len(blocks),
            'measure_faithfulness': ratio(sum(measures), len(measures)), 'measure_explanation_count': len(measures)},
        'latency_ms': {'mean': mean(latencies), 'median': median(latencies), 'p95': percentile(latencies, 0.95),
                       'min': min(latencies), 'max': max(latencies)},
        'reported_generation_tokens': {'input': sum(u.get('input_tokens', 0) for u in usage),
            'output': sum(u.get('output_tokens', 0) for u in usage), 'responses_with_usage': len(usage),
            'limitation': 'Only usage returned by the final generation per case. Query embeddings and failed internal attempts are not included. No monetary estimate.'},
        'per_category': per_category}


def pct(value):
    return f'{100 * value:.2f} %' if value is not None else 'N/A'


def write_reports(folder, metadata, cases, summary):
    (folder / 'audit.jsonl').write_text(''.join(json.dumps(c, ensure_ascii=False) + '\n' for c in cases))
    (folder / 'metrics.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
    retr = summary['retrieval']['context']
    gen = summary['generation']
    collection_seconds = (datetime.fromisoformat(metadata['completed_at']) - datetime.fromisoformat(metadata['started_at'])).total_seconds()
    lines = ['# Première évaluation réelle de Chati', '',
        f"**Score : {summary['passed']}/40 cas validés ({pct(summary['pass_rate'])}).**",
        f"Réponses complètes et validées : **{summary['complete_and_passed']}/40**. Le seuil à 75/100 tolère certaines incomplétudes.", '',
        'Exécution unique du 31 octobre 2026 via le service Docker réel. Modèle : '
        f"`{metadata['app_status']['model']}`, recherche `{metadata['app_status']['retrieval_mode']}`, "
        f"embeddings `{metadata['app_status']['embedding_model']}` ; `research=false` pour les 40 cas.", '',
        '**Nature du jugement :** audit sémantique par l’agent Codex de cette session, sans relecture humaine ni second juge indépendant. '
        'Ces notes sont provisoires et leur détail est conservé. Aucun réglage de l’application n’a été modifié pendant cette évaluation.', '',
        '## Mesures de recherche', '',
        f"{retr['cases_with_active_evidence']} cas comportent des groupes de preuves actifs, soit {retr['active_group_count']} groupes ; les autres ne sont pas artificiellement crédités.", '',
        '| Métrique | Top 8 avant expansion | Contexte fourni |', '| --- | ---: | ---: |']
    for label, key in [('Rappel macro des groupes connus', 'known_group_recall_macro'),
                       ('Rappel micro des groupes connus', 'known_group_recall_micro'),
                       ('Rappel macro après alternative sémantique admise', 'accepted_group_recall_macro'),
                       ('Précision sémantique micro, cas avec preuves actives', 'precision_evidence_cases_micro'),
                       ('Précision sémantique macro, cas avec preuves actives', 'precision_evidence_cases_macro')]:
        lines.append(f"| {label} | {pct(summary['retrieval']['top8'][key])} | {pct(retr[key])} |")
    lines.extend(['', f"Précision principale : {retr['relevant_passages_evidence_cases']}/{retr['passages_evidence_cases']} occurrences de passages jugées pertinentes. "
        f"Sur tous les cas, diagnostic secondaire : {retr['relevant_passages_all_cases']}/{retr['passages_all_cases']} ({pct(retr['precision_all_cases_micro'])}), incluant refus et absence de budget.", '',
        f"Tous les groupes connus sont couverts dans {retr['all_known_groups_covered_cases']}/{retr['cases_with_active_evidence']} cas ; "
        f"{retr['all_accepted_groups_covered_cases']}/{retr['cases_with_active_evidence']} après acceptation du troisième exemple de MIL-029.", '',
        'Pour MIL-029, les droits de douane écologiques (`s01-ss16-m008`) sont un exemple fiscal écologique recevable, absent de la liste ouverte du corrigé. '
        'La métrique brute conserve ce manque ; la métrique ajustée ajoute cette alternative dans l’audit uniquement, sans modifier le corrigé.', '',
        'La précision vient de la lecture des textes, pas de leur simple appartenance à la liste d’IDs attendus. Une proximité thématique seule ne suffit pas. '
        'Ce rappel de groupes ne constitue pas un rappel exhaustif de tous les documents pertinents ; aucune F1 documentaire classique n’est revendiquée.', '',
        '## Génération', '', '| Métrique | Résultat |', '| --- | ---: |',
        f"| Couverture micro des critères attendus | {pct(gen['criterion_coverage_micro'])} ({gen['covered_criterion_units']:g}/{gen['criterion_count']}) |",
        f"| Couverture macro des critères attendus | {pct(gen['criterion_coverage_macro'])} |",
        f"| Couverture du sous-ensemble de critères factuels | {pct(gen['factual_criterion_coverage_micro'])} ({gen['covered_factual_criterion_units']:g}/{gen['factual_criterion_count']}) |",
        f"| Couverture des attentes conditionnelles activées | {pct(gen['conditional_coverage_micro'])} ({gen['conditional_criterion_count']} critères) |",
        f"| Liens bloc–source apportant une contribution | {pct(gen['citation_pair_precision'])} ({gen['supported_citation_pairs']}/{gen['citation_pair_count']}) |",
        f"| Fidélité moyenne des blocs factuels | {pct(gen['block_faithfulness'])} ({gen['fully_supported_blocks']}/{gen['factual_block_count']} entièrement étayés) |",
        f"| Conformité des fiches de mesures | {pct(gen['measure_faithfulness'])} ({gen['measure_explanation_count']} fiches) |",
        f"| Cas avec erreur critique | {len(summary['critical_error_cases'])}/40 |",
        f"| Note moyenne de la grille | {summary['mean_rubric_score']:.2f}/100 |", '',
        'La couverture est évaluée sémantiquement sur les critères du benchmark (avec demi-crédit), pas par recherche de mots-clés. '
        'Le sous-ensemble factuel exclut les critères de clarification/refus/constat d’absence des cas 33–40 ; leurs faits explicitement attendus restent inclus. '
        'Il s’agit d’une approximation de « fact coverage », pas d’une annotation exhaustive de faits atomiques.', '',
        'Une citation peut contribuer à une partie du bloc sans en justifier toutes les affirmations. C’est le cas du RIC dans MIL-003 : '
        'les références existent et contribuent au bloc, mais le pouvoir de révoquer des élus est ajouté sans appui. '
        'Une très bonne précision des liens ne suffit donc pas à valider une réponse. Les blocs purement négatifs ou les invitations sont exclus du dénominateur de fidélité, avec justification dans l’audit.', '',
        '## Cas non validés', ''])
    for c in cases:
        if not c['passed']:
            lines.append(f"- **{c['id']} — {c['score']:.1f}/100** : {c['notes']}")
    lines.extend(['', '## Cas validés mais incomplets', ''])
    for c in cases:
        if c['passed'] and not c.get('all_criteria_complete', False):
            lines.append(f"- **{c['id']} — {c['score']:.1f}/100** : {c['notes']}")
    lines.extend(['', '## Par catégorie', '', '| Catégorie | Cas validés | Note moyenne |', '| --- | ---: | ---: |'])
    for cat, row in summary['per_category'].items():
        lines.append(f"| {cat} | {row['passed']}/{row['count']} | {row['mean_score']:.2f}/100 |")
    lines.extend(['', '## Registre des 40 cas', '',
        'Notes : exactitude / sources / limites / clarté, chacune sur 2. La décision suit la règle publiée : score ≥75, Sources ≥1 si applicable, aucune erreur critique.', '',
        '| Cas | Notes | Score | Critères couverts | Rappel groupes connus | Décision |', '| --- | --- | ---: | ---: | ---: | --- |'])
    for c in cases:
        notes = '/'.join(str(c['scores'][d]) for d in DIMENSIONS) if not c['technical_error'] else 'erreur'
        cov = mean(x['coverage'] for x in c['criteria']) if not c['technical_error'] else 0
        group_values = c['retrieval']['context']['known_group_coverages'] if not c['technical_error'] else []
        lines.append(f"| {c['id']} | {notes} | {c['score']:.1f} | {pct(cov)} | {pct(mean(group_values) if group_values else None)} | {'Validé' if c['passed'] else 'Non validé'} |")
    lat = summary['latency_ms']
    usage = summary['reported_generation_tokens']
    lines.extend(['', '## Exécution et limites', '',
        f"- {summary['answered']}/40 réponses structurées reçues ; {40-summary['answered']} erreur technique.",
        f"- Latence client : médiane {lat['median']/1000:.2f} s ; p95 {lat['p95']/1000:.2f} s ; maximum {lat['max']/1000:.2f} s. {metadata['concurrency']} requêtes simultanées au maximum, durée murale de collecte {collection_seconds:.2f} s.",
        f"- Tokens retournés par les générations finales : {usage['input']:,} en entrée et {usage['output']:,} en sortie. Embeddings et éventuelles tentatives internes supplémentaires non comptabilisés ; pas d’estimation monétaire.",
        '- Ce benchmark a servi à la conception : les résultats ne mesurent pas une généralisation indépendante. Le nouveau lot de sous-sections reste à construire après les ajustements.',
        '- Cette évaluation ne teste pas le web, l’interface visuelle ni la véracité du programme dans le monde réel.', '',
        '## Fichiers et reproduction', '',
        '- [Protocole](../../EVALUATION.md) ; [questions](../../questions.jsonl) ; [corrigé](../../references.jsonl).',
        '- [Sorties brutes SSE et réponses](responses.jsonl), [empreintes et configuration](run.json), [provenance Docker](runtime-provenance.json).',
        '- [Décisions du juge](audit-decisions.json), [audit développé](audit.jsonl), [métriques exactes](metrics.json).', '',
        'Recalcul sans appel réseau, depuis la racine :', '', '```bash',
        '.venv/bin/python scripts/score_evaluation.py --run benchmarks/chati-v1/runs/2026-10-31-first', '```', '',
        'Priorités suggérées après cette mesure : mieux diversifier la recherche des questions à plusieurs volets, '
        'retrouver les inondations par leur formulation usuelle, éviter l’ajout de pouvoirs juridiques non écrits et clarifier les suivis ambigus. '
        'Conserver ce run comme baseline ; toute correction doit être suivie d’un nouveau run et d’une revue indépendante des jugements.'])
    (folder / 'REPORT.md').write_text('\n'.join(lines) + '\n')


def run(args):
    metadata = json.loads((args.run / 'run.json').read_text())
    raw_path = args.run / 'responses.jsonl'
    if hashlib.sha256(raw_path.read_bytes()).hexdigest() != metadata['responses_sha256']:
        raise ValueError('Raw responses modified')
    questions = read_jsonl(args.benchmark / 'questions.jsonl')
    refs = {r['id']: r for r in read_jsonl(args.benchmark / 'references.jsonl')}
    for name in ['questions.jsonl', 'references.jsonl']:
        path = args.benchmark / name
        if hashlib.sha256(path.read_bytes()).hexdigest() != metadata['fingerprints'][str(path.relative_to(ROOT))]:
            raise ValueError('Gold/questions changed since collection')
    corpus = {r['id']: r for name in ['mesures.jsonl', 'annexes.jsonl'] for r in read_jsonl(ROOT / 'data/structured' / name)}
    raw_rows = read_jsonl(raw_path)
    decisions = json.loads((args.run / 'audit-decisions.json').read_text())
    if decisions.get('responses_sha256') != metadata['responses_sha256']:
        raise ValueError('Semantic audit belongs to a different response set')
    for name in ['mesures.jsonl', 'annexes.jsonl']:
        path = ROOT / 'data/structured' / name
        if hashlib.sha256(path.read_bytes()).hexdigest() != metadata['fingerprints'][str(path.relative_to(ROOT))]:
            raise ValueError('Corpus text changed since collection')
    case_ids = {q['id'] for q in questions}
    if len(raw_rows) != 40 or len(decisions['cases']) != 40 or {r['id'] for r in raw_rows} != case_ids or {r['id'] for r in decisions['cases']} != case_ids:
        raise ValueError('Need one raw response and one explicit review for every one of the 40 cases')
    raws, labels = {r['id']: r for r in raw_rows}, {c['id']: c for c in decisions['cases']}
    for q in questions:
        if raws[q['id']]['messages'] != q['messages']:
            raise ValueError('Conversation fixture changed')
        if raws[q['id']].get('answer') and raws[q['id']]['answer']['corpus_version'] != metadata['app_status']['corpus_version']:
            raise ValueError('Corpus version changed during run')
    cases = [build_audit(raws[q['id']], refs[q['id']], labels[q['id']], corpus) for q in questions]
    summary = aggregate(cases, raw_rows)
    summary['evaluation_method'] = decisions['reviewer']
    summary['responses_sha256'] = metadata['responses_sha256']
    summary['semantic_audit_sha256'] = hashlib.sha256((args.run / 'audit-decisions.json').read_bytes()).hexdigest()
    write_reports(args.run, metadata, cases, summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', type=Path, required=True)
    parser.add_argument('--benchmark', type=Path, default=ROOT / 'benchmarks/chati-v1')
    run(parser.parse_args())
