#!/usr/bin/env python3
"""Build the RAG corpus from the scraper's export of the official programme.

Input: scraper/outputs/ (programme_complet.json, mesures.jsonl, rapport_exhaustivite.json).
Output: data/programme/mesures.jsonl, textes.jsonl, import-report.json.

Measures and explanatory texts keep the exact wording in `texte_source`. `texte` only
normalises what a model cannot reproduce in a literal quote (Unicode spaces, soft
hyphens, decomposed accents). Readable IDs replace the scraper's hashes, which are
costly and error-prone for a model to copy: p1c02-ss03-m004 = partie 1, chapitre 2,
sous-section 3, mesure 4. They can never collide with the previous corpus (s01-ss01-m001),
frozen in data/structured for benchmarks v1 and v2.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
SPACES = re.compile(r'[  -   　]')
HEADING_MAX = 90


def normalise(text: str) -> str:
    # U+0085 is a stray Windows-1252 ellipsis in the published page.
    text = unicodedata.normalize('NFC', text).replace('\u00ad', '').replace('\u0085', '…')
    return re.sub(r' +', ' ', SPACES.sub(' ', text)).strip()


def bare(title: str) -> str:
    """Title without its « Partie 1 – » or « Chapitre 1 : » prefix."""
    return normalise(re.sub(r'^(Partie \d+\s*–|Chapitre \d+\s*:)\s*', '', title))


def is_heading(text: str) -> bool:
    return len(text) <= HEADING_MAX and not re.search(r'[.!?:;…]$', text.strip())


def text_row(identifier, raw, partie, chapitre, section_id, section, sub_id, sub, url):
    return {'id': identifier, 'type': 'texte_explicatif', 'texte': normalise(raw), 'texte_source': raw,
            'partie': partie, 'chapitre': chapitre, 'section_id': section_id, 'section': section,
            'sous_section_id': sub_id, 'sous_section': sub, 'source_url': url}


def paragraphs(identifier, blocks, *context):
    """Explanatory blocks as rows. A short title is kept as the prefix of the next paragraph."""
    rows, heading = [], None
    for block in blocks:
        raw = block['texte']
        if is_heading(raw):
            heading = f'{heading} {raw}' if heading else raw
            continue
        rows.append(text_row(f'{identifier}-t{len(rows) + 1:03d}', f'{heading}\n{raw}' if heading else raw, *context))
        heading = None
    if heading:
        rows.append(text_row(f'{identifier}-t{len(rows) + 1:03d}', heading, *context))
    return rows


def chapter_preamble(partie, chapitre):
    """Text placed before the first sub-section of a chapter, if any."""
    rest = chapitre['texte_integral'].replace(partie['titre'], '', 1).replace(chapitre['titre'], '', 1)
    for sub in chapitre['sous_sections']:
        rest = rest.replace(sub['texte_integral'], '', 1)
    return [{'texte': p.strip()} for p in re.split(r'\n{1,}', rest) if p.strip()]


def build(programme, scraped):
    by_scraper_id = {r['id']: r for r in scraped}
    measures, texts = [], []
    intro_url = programme['introductions'][0]['url_source']
    current, blocks = 'Introduction', programme['introductions'][0]['blocs']
    context = ('Introduction', None, 'i1', 'Introduction de Jean-Luc Mélenchon')
    numbered = 0
    # In the introduction a heading names the passage that follows it.
    for block in blocks:
        raw = block['texte']
        if normalise(raw) in {'Introduction', 'de Jean-Luc Mélenchon'}:
            continue
        if is_heading(raw):
            current = normalise(raw)
            continue
        numbered += 1
        texts.append(text_row(f'i1-t{numbered:03d}', raw, *context, 'i1', current, intro_url))
    new_ids = {}
    for p, partie in enumerate(programme['parties'], 1):
        partie_id, partie_title = f'p{p}', normalise(partie['titre'])
        texts += paragraphs(partie_id, partie['textes_explicatifs'], partie_title, None, partie_id, bare(partie['titre']),
                            partie_id, 'Présentation de la partie', partie['url_source'])
        for c, chapitre in enumerate(partie['chapitres'], 1):
            chapter_id, chapter_title = f'{partie_id}c{c:02d}', normalise(chapitre['titre'])
            section = f"{bare(partie['titre'])} — {bare(chapitre['titre'])}"
            texts += paragraphs(chapter_id, chapter_preamble(partie, chapitre), partie_title, chapter_title, chapter_id, section,
                                chapter_id, 'Présentation du chapitre', chapitre['url_source'])
            for s, sub in enumerate(chapitre['sous_sections'], 1):
                sub_id, sub_title = f'{chapter_id}-ss{s:02d}', normalise(sub['titre'])
                texts += paragraphs(sub_id, sub['textes_explicatifs'], partie_title, chapter_title, chapter_id, section,
                                    sub_id, sub_title, sub['url_source'])
                for m, item in enumerate(sub['mesures'], 1):
                    identifier = f'{sub_id}-m{m:03d}'
                    new_ids[item['id']] = identifier
                    measures.append({'id': identifier, 'type': 'mesure', 'categorie': item['type'],
                                     'texte': normalise(item['texte']), 'texte_source': item['texte'],
                                     'scraper_id': item['id'], 'partie': partie_title, 'chapitre': chapter_title,
                                     'section_id': chapter_id, 'section': section, 'sous_section_id': sub_id,
                                     'sous_section': sub_title, 'source_url': sub['url_source']})
    if set(new_ids) != set(by_scraper_id):
        raise SystemExit('programme_complet.json et mesures.jsonl ne contiennent pas les mêmes mesures')
    for row in measures:
        origin = by_scraper_id[row['scraper_id']]
        if origin['texte'] != row['texte_source']:
            raise SystemExit(f"Texte divergent : {row['id']}")
        row['parent_id'] = new_ids[origin['parent_id']] if origin['parent_id'] else None
        row['sous_mesures_ids'] = [new_ids[i] for i in origin['sous_mesures_ids']]
    return measures, texts


def write_jsonl(path, rows):
    # Escaped so that str.splitlines() cannot cut a record in two.
    lines = (json.dumps(r, ensure_ascii=False).replace('\u0085', '\\u0085').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029') for r in rows)
    path.write_text(''.join(line + '\n' for line in lines), encoding='utf-8')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, default=ROOT.parent / 'scraper/outputs')
    parser.add_argument('--output', type=Path, default=ROOT / 'data/programme')
    args = parser.parse_args()
    programme_path, measures_path, report_path = (args.source / n for n in ('programme_complet.json', 'mesures.jsonl', 'rapport_exhaustivite.json'))
    programme = json.loads(programme_path.read_text(encoding='utf-8'))
    report = json.loads(report_path.read_text(encoding='utf-8'))
    if not report['extraction_complete']:
        raise SystemExit("L'extraction n'est pas complète : voir rapport_exhaustivite.json")
    scraped = [json.loads(line) for line in measures_path.read_text(encoding='utf-8').splitlines() if line.strip()]
    measures, texts = build(programme, scraped)
    if len(measures) != report['mesures']:
        raise SystemExit('Nombre de mesures différent du rapport du scraper')
    identifiers = [r['id'] for r in measures + texts]
    if len(identifiers) != len(set(identifiers)) or not all(r['texte'] for r in measures + texts):
        raise SystemExit('Identifiant dupliqué ou texte vide')
    args.output.mkdir(parents=True, exist_ok=True)
    write_jsonl(args.output / 'mesures.jsonl', measures)
    write_jsonl(args.output / 'textes.jsonl', texts)
    # Index-only paraphrases are specific to a corpus: see scripts/enrich_index.py.
    (args.output / 'enrichment.jsonl').touch()
    summary = {'source': programme['url_source'], 'extrait_le': programme['extrait_le'],
               'fichiers_source_sha256': {p.name: sha(p) for p in (programme_path, measures_path)},
               'mesures': len(measures), 'mesures_par_categorie': report['mesures_par_type'], 'textes_explicatifs': len(texts),
               'parties': report['parties'], 'chapitres': report['chapitres_extraits'], 'sous_sections': report['sous_sections_extraites']}
    (args.output / 'import-report.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
