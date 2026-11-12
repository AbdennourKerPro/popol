import importlib.util
import json
from pathlib import Path
import re

import pytest

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/programme'
SOURCE = ROOT.parent / 'scraper/outputs'


def rows(name):
    return [json.loads(line) for line in (DATA / name).read_text(encoding='utf-8').split('\n') if line]


def test_corpus_matches_the_scraper_counts_and_links():
    measures, texts = rows('mesures.jsonl'), rows('textes.jsonl')
    by_id = {r['id']: r for r in measures}
    assert len(by_id) == 1069 and len(texts) == 140 and len({r['sous_section_id'] for r in measures}) == 111
    for row in measures:
        assert re.fullmatch(r'p\dc\d{2}-ss\d{2}-m\d{3}', row['id'])
        assert row['source_url'].startswith('https://melenchon2027.fr/programme/livre/')
        assert (row['categorie'] == 'sous_mesure') == bool(row['parent_id'])
        assert all(by_id[child]['parent_id'] == row['id'] for child in row['sous_mesures_ids'])


def test_text_can_be_quoted_literally():
    for row in rows('mesures.jsonl') + rows('textes.jsonl'):
        assert not re.search(r'[\u0085 ­́ -    ]', row['texte'])


@pytest.mark.skipif(not (SOURCE / 'mesures.jsonl').is_file(), reason='scraper outputs absent')
def test_import_is_reproducible(tmp_path, monkeypatch):
    spec = importlib.util.spec_from_file_location('import_programme', ROOT / 'scripts/import_programme.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setattr('sys.argv', ['import_programme', '--output', str(tmp_path)])
    module.main()
    for name in ('mesures.jsonl', 'textes.jsonl', 'import-report.json'):
        assert (tmp_path / name).read_bytes() == (DATA / name).read_bytes()
