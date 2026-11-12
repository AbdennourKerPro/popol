#!/usr/bin/env python3
"""Apply the reviewed annotations to app/data/annotations.jsonl.

  python3 annotation-review/apply_reviews.py           # dry run: shows what would change
  python3 annotation-review/apply_reviews.py --write   # writes (a backup is kept next to the file)

Only measures reviewed « correct » or « corrigé » are applied; « douteux » ones are left alone.
The app data is then rebuilt by `npm run data`.
"""
import argparse
from datetime import datetime
import json
from pathlib import Path
import re
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
ANNOTATIONS = ROOT / 'app/data/annotations.jsonl'
REVIEWS = Path(__file__).resolve().parent / 'reviews.json'
FIELDS = ('publics', 'themes', 'portee', 'resume')


def numbers(text):
    return {re.sub(r'[\s  .,]', '', n) for n in re.findall(r'\d[\d\s  .,]*\d|\d', text or '')}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    reviews = json.loads(REVIEWS.read_text(encoding='utf-8'))['reviews']
    rows = [json.loads(line) for line in ANNOTATIONS.read_text(encoding='utf-8').split('\n') if line]
    texts = {json.loads(line)['id']: json.loads(line)['texte'] for line in (ROOT / 'rag/data/programme/mesures.jsonl').read_text(encoding='utf-8').split('\n') if line}
    changes, skipped = 0, []
    for row in rows:
        review = reviews.get(row['id'])
        if not review or review['verdict'] not in ('ok', 'corrige'):
            if review and review['verdict'] == 'doute':
                skipped.append(row['id'])
            continue
        new = {'publics': review['publics'], 'themes': review['themes'], 'portee': review['portee'], 'resume': review.get('resume') or None}
        diff = {f: (row[f], new[f]) for f in FIELDS if row[f] != new[f]}
        if not diff:
            continue
        if new['resume'] and numbers(new['resume']) - numbers(texts[row['id']]):
            print(f"  ATTENTION {row['id']} : la phrase contient un chiffre absent de la mesure", file=sys.stderr)
        changes += 1
        print(f"{row['id']}: " + '; '.join(f'{f}: {a!r} -> {b!r}' for f, (a, b) in diff.items()))
        row.update(new)
    print(f'\n{changes} mesure(s) modifiée(s), {len(skipped)} douteuse(s) laissée(s) telle(s) quelle(s).')
    if args.write and changes:
        backup = ANNOTATIONS.with_name(f'annotations.{datetime.now():%Y%m%d-%H%M%S}.bak')
        shutil.copy(ANNOTATIONS, backup)
        ANNOTATIONS.write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows), encoding='utf-8')
        print(f'Écrit. Sauvegarde : {backup.name}. Relancer ensuite : cd app && npm run data')
    elif not args.write:
        print('Essai à blanc : rien n’est écrit (ajouter --write).')


if __name__ == '__main__':
    main()
