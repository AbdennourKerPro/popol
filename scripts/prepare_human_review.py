#!/usr/bin/env python3
"""Build a local review packet and a focused stability audit. No model calls.

The four repeat judgments below are explicit Codex semantic judgments. They are
not inferred from matching IDs, nor copied from the first reviewer. The separate
full audit, when available, supplies the other repeat assessments in the packet.
"""
from collections import Counter
import hashlib
import json
from pathlib import Path

from benchmark_rules import score_result

ROOT = Path(__file__).resolve().parents[1]
BENCH = ROOT / 'benchmarks/chati-v2'
FIRST = BENCH / 'runs/2026-11-01-default'
REPEAT = BENCH / 'runs/2026-11-01-repeat-01'
OUT = BENCH / 'human-review/2026-11-01-session'
SEED = 'chati-v2-human-review-2026-11-01'
QUOTAS = {'precise': 2, 'semantic': 1, 'transversal': 2, 'conversation': 1, 'insufficient': 1, 'adversarial': 1}
FOCUS = ['CH2-007', 'CH2-030', 'CH2-031', 'CH2-038']

# Coverage, exact response excerpt, case-specific rationale.
JUDGMENTS = {
    'CH2-007': {'scores': [2, 2, 2, 2], 'criteria': [
        [1, 'les accords de libre-échange et les élargissements qui se feraient sans harmonisation',
         'Arbitrage utilisateur : la condition concerne les seuls élargissements. La relative peut se rattacher à ceux-ci et la fiche reprend fidèlement la source ; aucune extension explicite aux accords. Crédit complet après correction du jugement trop sévère.'],
        [1, 'la primauté des normes les plus protectrices', 'Le principe spécifique climat/travail est présent.']],
        'dimension_reasons': {
            'accuracy': 'Veto et primauté couverts. La condition est recevable comme attachée aux élargissements, conformément à l’arbitrage utilisateur ; la fiche est fidèle.',
            'sources': 'Les deux mesures citées s04-ss01-m001/m009 sont les preuves attendues ; aucune source inventée.',
            'limits': 'La proposition n’est pas présentée comme droit actuel ; aucune harmonisation ou date n’est inventée.',
            'clarity': 'Les deux volets veto et normes protectrices sont séparés clairement.'},
        'notes': 'Score rectifié après arbitrage utilisateur de CH2-007 : 2/2 en exactitude, C01 complet. Au premier passage, « lorsqu’ils » étend explicitement la condition aux deux objets et reste partiel. Le défaut ne se répète donc pas.'},
    'CH2-030': {'scores': [2, 2, 2, 2], 'criteria': [
        [1, 'pour les jeunes, le revenu est annoncé « au-dessus du seuil de pauvreté »', 'Borne strictement supérieure correctement attribuée aux jeunes.'],
        [1, 'il est garanti « au moins au seuil de pauvreté »', 'Borne large correctement attribuée à Pauvreté.'],
        [1, 'Les passages ne permettent pas de savoir si, en pratique, les deux dispositifs aboutiraient au même montant',
         'La réponse accepte désormais explicitement la possibilité du même montant et ne déduit pas une différence nécessaire. Aucun mot magique « compatible » n’est exigé.']],
        'dimension_reasons': {
            'accuracy': 'Les deux bornes sont exactes, la possibilité d’un montant égal est maintenant explicite.',
            'sources': 'Les mesures s01-ss15-m006 et s05-ss07-m001 sont pertinentes pour leurs bornes respectives.',
            'limits': 'Aucun montant, cumul ni écart nécessaire inventé ; l’impossibilité de conclure en pratique est dite.',
            'clarity': 'La comparaison distingue les deux formulations puis la limite de l’inférence.'},
        'notes': 'Défaut initial non retrouvé : l’égalité effective reste explicitement possible.'},
    'CH2-031': {'scores': [2, 2, 2, 2], 'criteria': [
        [1, 'Interdire les voyages commerciaux privés dans l’espace.', 'La fiche nomme l’espace ; l’évaluation inclut les fiches, pas seulement le bloc principal.'],
        [1, 'Le résumé propose d’interdire les voyages commerciaux privés.', 'Interdiction correctement formulée, sans extension aux missions publiques.']],
        'dimension_reasons': {
            'accuracy': 'Le référent spatial est correctement résolu dans la fiche et l’interdiction est exacte.',
            'sources': 's01-ss19-m008 est citée et soutient la proposition.',
            'limits': 'La réponse ne prétend pas interdire toutes les missions ni préciser des modalités absentes.',
            'clarity': 'La fiche fournit le référent explicite qui manquait au premier run.'},
        'notes': 'Défaut initial non retrouvé dans la réponse complète : « dans l’espace » est maintenant écrit.'},
    'CH2-038': {'scores': [2, 2, 2, 2], 'criteria': [
        [1, 'Le résumé propose la conclusion d’un traité contre l’appropriation des ressources spatiales.', 'Le bloc et la fiche conservent « contre », sans ambiguïté sur le but du traité.'],
        [1, 'Les passages fournis ne précisent pas quels pays l’auraient signé.', 'Le conditionnel n’affirme pas une signature effective ; aucun pays ni adoption inventés. Le critère n’exige pas une phrase de refus stéréotypée.']],
        'dimension_reasons': {
            'accuracy': 'La proposition contre l’appropriation est identique dans le bloc et dans la fiche.',
            'sources': 's01-ss19-m007 soutient le traité ; aucun autre traité n’est utilisé pour attribuer des signataires.',
            'limits': 'Les signataires restent inconnus et le conditionnel évite de les présupposer comme établis.',
            'clarity': 'Proposition et information absente sont présentées dans deux blocs distincts.'},
        'notes': 'Les deux fragilités initiales ne se retrouvent pas : négation conservée et signature au conditionnel.'}
}


def read(path):
    return json.loads(path.read_text())


def lines(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def select_sample(metrics):
    selected = []
    for category, count in QUOTAS.items():
        pool = [c for c in metrics['cases'] if c['category'] == category and c['score'] == 100 and c['complete'] and c['strict_passed']]
        pool.sort(key=lambda c: hashlib.sha256(f"{SEED}:{c['id']}".encode()).hexdigest())
        if len(pool) < count:
            raise ValueError(f'Not enough originally perfect cases in {category}')
        selected.extend(c['id'] for c in pool[:count])
    return selected


def public_source(row, version):
    pages = row['verification_pdf']['pages']
    return {'id': row['id'], 'type': row['type'], 'section': row['section'], 'subsection': row['sous_section'],
            'text': row['texte'], 'pages': pages, 'corpus_version': version,
            'source_url': row['source_url'] + '#' + row['source']['ancre_sous_section'],
            'pdf_url': '/documents/programme.pdf' + (f'#page={pages[0]}' if pages else '')}


def prepare():
    refs = {r['id']: r for r in lines(BENCH / 'references.jsonl')}
    raws = {name: {r['id']: r for r in lines(folder / 'responses.jsonl')}
            for name, folder in [('initial', FIRST), ('repeat', REPEAT)]}
    meta = {name: read(folder / 'run.json') for name, folder in [('initial', FIRST), ('repeat', REPEAT)]}
    for name, folder in [('initial', FIRST), ('repeat', REPEAT)]:
        if sha(folder / 'responses.jsonl') != meta[name]['responses_sha256']:
            raise ValueError('Raw responses modified')
        if set(raws[name]) != set(refs) or any(r['error'] or not r['done'] for r in raws[name].values()):
            raise ValueError('Expected forty complete real responses')
    assert meta['initial']['app_status'] == meta['repeat']['app_status']
    assert meta['initial']['fingerprints'] == meta['repeat']['fingerprints']
    initial_audits = {c['id']: c for c in read(FIRST / 'audit-decisions.json')['cases']}
    repeat_audit_path = REPEAT / 'audit-decisions.json'
    repeat_audits = {}
    if repeat_audit_path.exists():
        repeat_document = read(repeat_audit_path)
        assert repeat_document['responses_sha256'] == meta['repeat']['responses_sha256']
        repeat_audits = {c['id']: c for c in repeat_document['cases']}
        assert set(repeat_audits) == set(refs)
    focus_audits = []
    for identifier in FOCUS:
        judged = JUDGMENTS[identifier]
        answer = raws['repeat'][identifier]['answer']
        texts = [b['text'] for b in answer['blocks']] + [m['explanation'] for m in answer['measures']]
        assert len(judged['criteria']) == len(refs[identifier]['criteria'])
        for _, excerpt, _ in judged['criteria']:
            assert any(excerpt in text for text in texts), (identifier, excerpt)
        focus_audits.append({'id': identifier, 'scores': judged['scores'], 'dimension_reasons': judged['dimension_reasons'],
            'criteria': [point[0] for point in judged['criteria']],
            'criteria_evidence': [{'id': criterion['id'], 'coverage': point[0], 'answer_excerpt': point[1], 'reason': point[2]}
                for criterion, point in zip(refs[identifier]['criteria'], judged['criteria'])],
            'conditional': {}, 'critical_errors': [], 'false_absence': False, 'notes': judged['notes']})
    focused = {'reviewer': 'Codex de cette session ; lecture du corrigé, des sources et des réponses complètes. Ce n’est pas une annotation humaine.',
        'scope': 'Four originally incomplete cases only. The separate audit-decisions.json and metrics.json cover all forty repeat answers.',
        'responses_sha256': meta['repeat']['responses_sha256'], 'cases': focus_audits}
    write(REPEAT / 'audit-focused.json', focused)
    arbitration = {
        'case_id': 'CH2-038', 'run_id': '2026-11-01-default', 'reviewer': 'Codex',
        'decision': 'validated_but_incomplete', 'scores': [1, 2, 1, 2], 'score': 75,
        'critical_error': False, 'criteria': [1, 0.5],
        'source': 'Traité contre l’appropriation des ressources spatiales.',
        'exact_main_answer': raws['initial']['CH2-038']['answer']['blocks'][0]['text'],
        'exact_measure_explanation': raws['initial']['CH2-038']['answer']['measures'][0]['explanation'],
        'reason': 'Le bloc principal dit explicitement « contre ». Dans la fiche, « visant l’appropriation » peut désigner le sujet visé autant qu’un objectif favorable : c’est imprécis, mais insuffisant pour établir une inversion affirmative. Le corps exact et la source ne justifient donc pas une erreur critique certaine. La signature à l’indicatif reste trop présupposée : le critère de limite est partiel. Le score de 75 valide ce cas sans le qualifier de parfait.',
        'what_would_be_critical': 'Une affirmation explicite que le traité autorise, favorise ou vise à réaliser l’appropriation, ou des pays signataires inventés.',
        'better_wording': 'Le résumé propose un traité contre l’appropriation des ressources spatiales ; il ne permet pas d’établir son adoption ni de nommer des pays signataires.',
        'raw_responses_sha256': meta['initial']['responses_sha256'],
        'original_audit_preserved': True, 'human_may_disagree': True}
    write(OUT / 'arbitration-CH2-038.json', arbitration)
    sample = select_sample(read(FIRST / 'metrics.json'))
    selection = {'seed': SEED, 'method': 'Within each category, sort originally 100/100, complete, strictly passed cases by SHA-256(seed:case_id), then take the fixed quota. Selection does not depend on repeat answers.',
                 'quotas': QUOTAS, 'sample_ids': sample, 'focus_ids': FOCUS,
                 'purpose': 'Quality control of positive machine judgments, not an unbiased estimate of overall quality.'}
    write(OUT / 'selection.json', selection)
    corpus = {r['id']: r for name in ['mesures.jsonl', 'annexes.jsonl'] for r in lines(ROOT / 'data/structured' / name)}
    all_ids = FOCUS + sample
    packet_cases = []
    for identifier in all_ids:
        responses = {}
        for name in ['initial', 'repeat']:
            raw = raws[name][identifier]
            answer = raw['answer']
            responses[name] = {'answer': answer,
                'context_sources': [public_source(corpus[i], answer['corpus_version']) for i in answer['context_ids']],
                'raw_response_sha256': hashlib.sha256(json.dumps(raw, ensure_ascii=False, sort_keys=True).encode()).hexdigest()}
        packet_cases.append({'id': identifier, 'group': 'focus' if identifier in FOCUS else 'sample',
            'category': refs[identifier]['category'], 'question': refs[identifier]['question'],
            'messages': refs[identifier]['messages'], 'reference': refs[identifier],
            'responses': responses, 'machine_assessments': {'initial': initial_audits[identifier],
                'repeat': repeat_audits.get(identifier, next((c for c in focus_audits if c['id'] == identifier), None))},
            'arbitration': arbitration if identifier == 'CH2-038' else None})
    identity = {'initial': meta['initial']['responses_sha256'], 'repeat': meta['repeat']['responses_sha256'],
                'gold': sha(BENCH / 'references.jsonl'), 'seed': SEED, 'ids': all_ids}
    packet = {'schema_version': 1, 'session_id': hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest(),
        'title': 'Chati · Atelier de relecture', 'date': '2026-11-01', 'benchmark_version': read(BENCH / 'manifest.json')['version'],
        'corpus_metadata': read(BENCH / 'manifest.json')['corpus'],
        'corpus_sources': [public_source(row, meta['initial']['app_status']['corpus_version']) for row in corpus.values()],
        'selection': selection, 'run_order': ['initial', 'repeat'], 'runs': {
            name: {'id': '2026-11-01-default' if name == 'initial' else '2026-11-01-repeat-01',
                   'label': 'Premier passage' if name == 'initial' else 'Second passage',
                   'started_at': meta[name]['started_at'], 'responses_sha256': meta[name]['responses_sha256'],
                   'configuration': meta[name]['app_status']} for name in ['initial', 'repeat']},
        'comparability': {'same_effective_status': True, 'same_recorded_fingerprints': True,
            'runtime': read(REPEAT / 'runtime-provenance.json'),
            'limitations': ['L’empreinte de l’index n’avait pas été archivée au premier run ; celle du second est conservée.',
                           'Le premier juge est Claude et le second est Codex : variation de génération et variation de jugement ne sont pas isolées.',
                           'Deux runs ne permettent pas d’estimer une fréquence de défaut fiable.']},
        'cases': packet_cases,
        'guidance': ['Lisez d’abord la question et l’historique, puis toute la réponse, fiches de mesures comprises.',
            'CH2-007 : clarification utilisateur postérieure aux runs, l’harmonisation concerne seulement les élargissements. Le second passage est complet ; le premier étend explicitement la condition aux deux objets.',
            'Ouvrez chaque source citée : son existence ne garantit pas qu’elle prouve la phrase.',
            'Vérifiez nombres, négations, conditions, bénéficiaires, périmètres et périodes.',
            'Distinguez proposition, réalisation acquise, droit actuel et effet attendu.',
            'Un constat d’absence doit être comparé au corpus disponible, pas seulement au contexte retrouvé.',
            'Le corrigé et le jugement machine sont masqués au départ pour limiter l’ancrage.',
            'Vos notes restent distinctes des jugements automatiques. Un brouillon n’est pas une validation humaine.']}
    write(OUT / 'session.json', packet)
    (OUT / 'annotations').mkdir(exist_ok=True)
    comparison = []
    for c in focus_audits:
        previous = initial_audits[c['id']]
        verdict = score_result(dict(zip(['accuracy', 'sources', 'limits', 'clarity'], c['scores'])), False)
        comparison.append({'id': c['id'], 'initial_criteria': previous['criteria'], 'repeat_criteria': c['criteria'],
            'initial_complete': all(v == 1 for v in previous['criteria']), 'repeat_complete': all(v == 1 for v in c['criteria']),
            'repeat_score': verdict['score'], 'repeat_passed': verdict['passed'], 'notes': c['notes']})
    write(REPEAT / 'focused-metrics.json', {'scope': FOCUS, 'case_count': 4, 'complete_initial': 0,
        'complete_repeat': sum(c['repeat_complete'] for c in comparison), 'validated_repeat': sum(c['repeat_passed'] for c in comparison),
        'global_repeat_score': None, 'cases': comparison})
    registry_path = BENCH / 'executions.json'
    registry = read(registry_path) if registry_path.exists() else {'schema_version': 1, 'runs': {}}
    registry.update(benchmark_version=packet['benchmark_version'], publication_manifest_sha256=sha(BENCH / 'reviews/1.0.2-validated/manifest.json'),
        current_manifest_sha256=sha(BENCH / 'manifest.json'),
        note='Original publication manifest archived in reviews/1.0.2-validated. Run fingerprints unchanged; current judgments use post-execution user amendment of CH2-007.',
        human_review_session='benchmarks/chati-v2/human-review/2026-11-01-session/session.json')
    for name, folder in [('initial', FIRST), ('repeat', REPEAT)]:
        registry['runs'][folder.name] = {'path': str(folder.relative_to(ROOT)), 'responses_sha256': meta[name]['responses_sha256'],
            'started_at': meta[name]['started_at'], 'completed_at': meta[name]['completed_at'],
            'collected_case_count': 40, 'semantically_scored_case_count': 40 if name == 'initial' else len(repeat_audits) or 4,
            'assessment_scope': 'all forty cases, Claude audit with post-execution CH2-007 rationale amended by Codex following user clarification; scores unchanged' if name == 'initial' else ('all forty cases, explicit Codex audit with user clarification of CH2-007' if repeat_audits else 'four originally incomplete cases, Codex focused audit'),
            'report': str((folder / 'REPORT.md').relative_to(ROOT))}
    write(registry_path, registry)
    print(json.dumps({'session': str(OUT / 'session.json'), 'sample': sample, 'focus': FOCUS,
                      'repeat_complete_in_focus': sum(c['repeat_complete'] for c in comparison)}, ensure_ascii=False))


if __name__ == '__main__':
    prepare()
