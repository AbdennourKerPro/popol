"""Tests des cas qui peuvent altérer la fidélité et le comptage."""
import csv
import json
import unittest
from pathlib import Path

from bs4 import BeautifulSoup
from scrape import extract_section, measure_nodes, text


class ExtractionTests(unittest.TestCase):
    def test_inline_unicode_and_nested_measures(self):
        section = BeautifulSoup('''<section><h3 class="section-title" id="droits">La 6<sup>e</sup> République</h3>
<p>Préserver les espaces : <em>égalité</em> et droits.</p>
<div class="mesure-cle"><h6>Mesure clé</h6><p>Garantir l’égalité !</p></div>
<ul><li class="mesure">Une mesure<ul><li>Précision conservée</li></ul></li></ul></section>''', 'html.parser').section
        result = extract_section(section, 'https://example.org/chapitre/',
                                 {'titre': 'Partie', 'id': 'p'}, {'titre': 'Chapitre', 'id': 'c'}, 1)
        self.assertEqual(result['titre'], 'La 6e République')
        self.assertEqual(len(result['mesures']), 2)
        self.assertEqual(result['mesures'][0]['texte'], 'Garantir l’égalité !')
        self.assertIn('Précision conservée', result['mesures'][1]['texte'])
        self.assertEqual(result['textes_explicatifs'][0]['texte'], 'Préserver les espaces : égalité et droits.')
        self.assertEqual(result['mesures'][0]['type'], 'cle')
        self.assertEqual(len(measure_nodes(section)), 2)
        self.assertEqual(result['mesures'][0]['id'], extract_section(section,
            'https://example.org/chapitre/', {'titre': 'Partie', 'id': 'p'},
            {'titre': 'Chapitre', 'id': 'c'}, 1)['mesures'][0]['id'])

    def test_sibling_submeasure_links_to_parent(self):
        section = BeautifulSoup('<section><h3 class="section-title" id="s">Titre</h3>'
            '<ul><li class="mesure">Agir :</li><li><ul>'
            '<li class="sous_mesure">Premier objectif</li>'
            '<li class="sous_mesure">Second objectif</li></ul></li></ul></section>',
            'html.parser').section
        rows = extract_section(section, 'https://example.org/',
            {'titre': 'P', 'id': 'p'}, {'titre': 'C', 'id': 'c'}, 1)['mesures']
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[1]['parent_id'], rows[0]['id'])
        self.assertEqual(rows[2]['type'], 'sous_mesure')
        self.assertEqual(rows[0]['sous_mesures_ids'], [rows[1]['id'], rows[2]['id']])

    def test_missing_anchor_fails(self):
        with self.assertRaises(ValueError):
            extract_section(BeautifulSoup('<section><p>Texte</p></section>', 'html.parser').section,
                            'https://example.org/', {}, {}, 1)

    def test_export_roundtrip_and_source_coverage(self):
        output = Path(__file__).parent / 'outputs'
        if not (output / 'programme_complet.json').exists():
            self.skipTest('Exécuter le scraper pour vérifier les exports réels')
        book = json.loads((output / 'programme_complet.json').read_text())
        rows = [json.loads(line) for line in (output / 'mesures.jsonl').read_text().splitlines()]
        with (output / 'mesures.csv').open(encoding='utf-8-sig', newline='') as f:
            table = list(csv.DictReader(f))
        hierarchical = [m for p in book['parties'] for c in p['chapitres']
                        for s in c['sous_sections'] for m in s['mesures']]
        self.assertEqual(rows, hierarchical)
        self.assertEqual([r['texte'] for r in rows], [r['texte'] for r in table])
        self.assertEqual(len({r['id'] for r in rows}), len(rows))
        self.assertTrue(book['controle_exhaustivite']['extraction_complete'])
        manifest = json.loads((output / 'sources/manifest.json').read_text())
        expected_texts = []
        exported_texts = []
        source_measure_count = 0
        for page in manifest:
            soup = BeautifulSoup((output / 'sources' / page['fichier']).read_bytes(), 'html.parser')
            main = soup.select_one('main.chapitre')
            if main:
                expected_texts.append(text(main))
                source_measure_count += len(main.select('.mesure-cle, li.mesure, li.sous_mesure'))
        for part in book['parties']:
            for chapter in part['chapitres']:
                exported_texts.append(chapter['texte_integral'])
        self.assertCountEqual(expected_texts, exported_texts)
        self.assertEqual(source_measure_count, len(rows))
        ids = {r['id'] for r in rows}
        self.assertTrue(all(r['parent_id'] in ids for r in rows if r['parent_id']))


if __name__ == '__main__':
    unittest.main()
