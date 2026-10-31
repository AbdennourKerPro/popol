import hashlib
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from benchmark_rules import group_coverage, score_result


class BenchmarkRulesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        base = ROOT / 'benchmarks/militia-v1'
        cls.refs = {r['id']: r for r in map(json.loads, (base / 'references.jsonl').read_text().splitlines())}

    def groups(self, number):
        return self.refs[f'MIL-{number:03d}']['evidence_groups']

    def test_defence_source_supports_optionality_not_duration(self):
        groups = self.groups(14)
        self.assertEqual(group_coverage(groups[0], ['s04-ss03-m007']), 0)
        self.assertEqual(group_coverage(groups[1], ['s04-ss03-m007']), 1)

    def test_annex_does_not_supply_missing_annuity_condition(self):
        groups = self.groups(2)
        self.assertEqual(group_coverage(groups[0], ['a02-ss02-b007']), 1)
        self.assertEqual(group_coverage(groups[1], ['a02-ss02-b007']), 0)

    def test_ore_annex_can_support_both_suppressions(self):
        self.assertTrue(all(group_coverage(g, ['a02-ss02-b019']) == 1 for g in self.groups(12)))

    def test_housing_supply_alternative_does_not_require_building_count(self):
        ids = ['s01-ss08-m004', 's01-ss09-m005', 's01-ss09-m009']
        self.assertTrue(all(group_coverage(g, ids) == 1 for g in self.groups(25)))
        self.assertFalse(any('200 000' in text for text in self.refs['MIL-025']['must_include']))

    def test_dependent_pair_counts_once_and_needs_both_passages(self):
        group = self.groups(29)[0]
        self.assertEqual(group_coverage(group, ['s03-ss01-m015']), 0)
        self.assertAlmostEqual(group_coverage(group, ['s03-ss01-m014', 's03-ss01-m015']), 1 / 3)
        self.assertEqual(group_coverage(group, ['s03-ss01-m014', 's03-ss01-m015', 's03-ss04-m003', 's01-ss16-m009']), 1)

    def test_clarification_does_not_need_children_rights_retrieval(self):
        group = self.groups(33)[0]
        self.assertIsNone(group_coverage(group, []))
        self.assertEqual(group_coverage(group, [], ['if_general_children_rights_answer']), 0)

    def test_refusal_does_not_require_optional_factual_branch(self):
        for number in [38, 40]:
            self.assertFalse(self.groups(number))
        self.assertTrue(all(group_coverage(g, []) is None for g in self.groups(34)))
        self.assertFalse(any('si une réponse' in s.lower() or 'éventuellement' in s.lower()
                             for n in [34, 38, 40] for s in self.refs[f'MIL-{n:03d}']['must_include']))

    def test_conditional_followup_checks_only_claimed_facts(self):
        groups = self.groups(34)
        active = ['if_conditional_factual_answer', 'if_nursery_places_claimed']
        self.assertEqual([group_coverage(g, ['s06-ss01-m001'], active) for g in groups], [1, None, None])
        self.assertEqual([group_coverage(g, ['s06-ss09-m001'], active) for g in groups], [0, None, None])
        all_active = ['if_nursery_places_claimed', 'if_nursery_prices_claimed', 'if_student_housing_count_claimed']
        self.assertTrue(all(group_coverage(g, ['s06-ss01-m001', 's06-ss01-m002', 's06-ss09-m001'], all_active) == 1 for g in groups))
        self.assertTrue(all(g['when'] in {c['when'] for c in self.refs['MIL-034']['conditional_expectations']} for g in groups))

    def test_unasked_details_do_not_become_required(self):
        conscription = self.refs['MIL-014']
        self.assertFalse(any('utilité publique' in s for s in conscription['must_include']))
        self.assertTrue(any('utilité publique' in s for s in conscription['accepted_additions']))
        protected_work = self.refs['MIL-023']
        self.assertFalse(protected_work['benefits_requested'])
        self.assertFalse(protected_work['benefit_grounding'])
        self.assertFalse(any('SMIC' in s or 'syndicaux' in s for s in protected_work['must_include']))
        self.assertTrue(any('SMIC' in s and 'syndicaux' in s for s in protected_work['accepted_additions']))

    def test_public_procurement_does_not_count_as_tax_or_aid(self):
        group = self.groups(29)[0]
        self.assertAlmostEqual(group_coverage(group, ['s01-ss01-m004', 's01-ss01-m008', 's01-ss16-m005']), 2 / 3)
        self.assertNotIn('s01-ss16-m005', {e['id'] for e in self.refs['MIL-029']['evidence']})

    def test_agricultural_jobs_do_not_alone_support_income(self):
        group = self.groups(19)[1]
        self.assertEqual(group_coverage(group, ['s03-ss07-m002']), 0)
        self.assertEqual(group_coverage(group, ['s03-ss07-m003']), 1)

    def test_missing_sources_cannot_pass_at_75(self):
        result = score_result({'accuracy': 2, 'sources': 0, 'limits': 2, 'clarity': 2})
        self.assertEqual(result['score'], 75)
        self.assertFalse(result['passed'])

    def test_clarification_can_pass_without_sources(self):
        self.assertTrue(score_result({'accuracy': 2, 'sources': None, 'limits': 2, 'clarity': 2})['passed'])

    def test_critical_error_cannot_pass(self):
        self.assertFalse(score_result(dict.fromkeys(['accuracy', 'sources', 'limits', 'clarity'], 2), True)['passed'])

    def test_data_provenance_and_question_separation(self):
        base = ROOT / 'benchmarks/militia-v1'
        manifest = json.loads((base / 'manifest.json').read_text())
        corpus = {r['id']: r for f in ['mesures.jsonl', 'annexes.jsonl']
                  for r in map(json.loads, (ROOT / 'data/structured' / f).read_text().splitlines())}
        questions = [json.loads(line) for line in (base / 'questions.jsonl').read_text().splitlines()]
        self.assertEqual(len(questions), 40)
        for q in questions:
            self.assertEqual(set(q), {'id', 'messages'})
            ref = self.refs[q['id']]
            self.assertEqual(q['messages'], ref['messages'])
            for evidence in ref['evidence']:
                source = corpus[evidence['id']]
                self.assertEqual(evidence['texte'], source['texte'])
                self.assertEqual(evidence['pages_pdf'], source['verification_pdf']['pages'])
                self.assertTrue(evidence['pages_pdf'])
                if evidence['type'] == 'annexe_bloc':
                    self.assertTrue(all(41 <= p <= 59 for p in evidence['pages_pdf']))
        for path_key, hash_key in [('measures', 'measures_file_sha256'), ('annexes', 'annexes_file_sha256'),
                                   ('pdf', 'pdf_sha256'), ('hierarchy_and_appendices', 'hierarchy_file_sha256')]:
            self.assertEqual(hashlib.sha256((ROOT / manifest['corpus'][path_key]).read_bytes()).hexdigest(), manifest['corpus'][hash_key])


if __name__ == '__main__':
    unittest.main()
