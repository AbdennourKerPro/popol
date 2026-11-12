#!/usr/bin/env python3
"""Apply llm-corrections.jsonl to app/data/annotations.jsonl, minus the refusals of llm-decisions.json.

  python3 annotation-review/apply_llm_corrections.py           # dry run
  python3 annotation-review/apply_llm_corrections.py --write   # writes, with a backup in annotation-review/

Only « corriger » lines are applied. Fields changed by a human in reviews.json take precedence.
"""
import argparse
from collections import Counter
from datetime import datetime
import json
from pathlib import Path
import shutil

HERE = Path(__file__).resolve().parent
ANNOTATIONS = HERE.parent / 'app/data/annotations.jsonl'
FIELDS = ('publics', 'themes', 'portee', 'resume')


def lines(path):
    return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    rows = lines(ANNOTATIONS)
    llm = {r['id']: r for r in lines(HERE / 'llm-corrections.jsonl')}
    decisions = json.loads((HERE / 'llm-decisions.json').read_text(encoding='utf-8'))
    human = json.loads((HERE / 'reviews.json').read_text(encoding='utf-8'))['reviews'] if (HERE / 'reviews.json').is_file() else {}
    keep, replace = decisions['garder_actuel'], decisions['remplacer']
    applied, refused = Counter(), Counter()
    for row in rows:
        review = llm[row['id']]
        before = {f: row[f] for f in FIELDS}
        after = dict(before)
        if review['verdict'] == 'corriger':
            for field in FIELDS:
                if row['id'] in keep[field] and review[field] != before[field]:
                    refused[field] += 1
                else:
                    after[field] = review[field]
            for field, value in replace.get(row['id'], {}).items():
                if field != 'motif':
                    after[field] = value
        reviewed_by_hand = human.get(row['id'])
        if reviewed_by_hand and reviewed_by_hand['verdict'] in ('ok', 'corrige'):
            for field in FIELDS:
                if (reviewed_by_hand.get(field) or None) != before[field]:
                    after[field] = reviewed_by_hand.get(field) or None
        for field in FIELDS:
            if after[field] != before[field]:
                applied[field] += 1
        row.update(after)
    print('Appliqué par champ :', dict(applied), '| refusé par champ :', dict(refused), '| remplacements :', len(replace))
    if args.write:
        backup = HERE / f'annotations.avant-llm.{datetime.now():%Y%m%d-%H%M%S}.jsonl'
        shutil.copy(ANNOTATIONS, backup)
        ANNOTATIONS.write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows), encoding='utf-8')
        print('Écrit. Sauvegarde :', backup.name)
    else:
        print('Essai à blanc (ajouter --write).')


if __name__ == '__main__':
    main()
