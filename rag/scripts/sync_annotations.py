#!/usr/bin/env python3
"""Copy the audience annotations of the « Ça change quoi pour moi ? » app into Chati's corpus folder.

  python scripts/sync_annotations.py [--source ../app/data] [--corpus data/programme]

Writes data/programme/annotations.jsonl ({id, publics, themes}, one line per measure) and
data/programme/publics.json ({id: label}). Nothing is written if an annotation names a measure
unknown to the corpus or an audience missing from the taxonomy. These files only orient the
search for a declared profile: they are not part of the corpus version (the index stays valid).
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main(args):
    taxonomy = json.loads((args.source / 'taxonomie.json').read_text(encoding='utf-8'))
    publics = taxonomy['publics']
    corpus_ids = {json.loads(line)['id'] for line in (args.corpus / 'mesures.jsonl').read_text(encoding='utf-8').splitlines() if line.strip()}
    rows = [json.loads(line) for line in (args.source / 'annotations.jsonl').read_text(encoding='utf-8').splitlines() if line.strip()]
    unknown = sorted({r['id'] for r in rows} - corpus_ids)
    if unknown:
        raise SystemExit(f'{len(unknown)} identifiant(s) inconnu(s) du corpus, rien n’est écrit : {", ".join(unknown[:5])}…')
    bad = sorted({p for r in rows for p in r.get('publics', [])} - publics.keys())
    if bad:
        raise SystemExit(f'Public(s) absent(s) de la taxonomie, rien n’est écrit : {", ".join(bad)}')
    if len({r['id'] for r in rows}) != len(rows):
        raise SystemExit('Identifiants dupliqués dans les annotations, rien n’est écrit.')
    lines = [json.dumps({'id': r['id'], 'publics': r.get('publics', []), 'themes': r.get('themes', [])}, ensure_ascii=False) for r in rows]
    (args.corpus / 'annotations.jsonl').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    (args.corpus / 'publics.json').write_text(json.dumps(publics, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(rows)} annotations ({sum(bool(r.get("publics")) for r in rows)} avec un public) et {len(publics)} publics écrits dans {args.corpus}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--source', type=Path, default=ROOT.parent / 'app/data')
    parser.add_argument('--corpus', type=Path, default=ROOT / 'data/programme')
    main(parser.parse_args())
