"""Deterministic sample of measures to review: the risky ones first, then a spread of the rest."""
import json
from pathlib import Path
import random

ROOT = Path(__file__).resolve().parents[1]
SEED = 20261109
SIZE = 80


def build(annotations, audit, texts):
    """Ids to review. Stratified so that each kind of risk is looked at: a pure random draw would
    mostly show the 668 measures that concern everyone."""
    rng = random.Random(SEED)
    ids = list(annotations)
    chosen: list[str] = []

    def take(pool, count):
        pool = [i for i in pool if i not in chosen]
        rng.shuffle(pool)
        chosen.extend(pool[:count])

    take([i for i in ids if annotations[i]['resume'] is None], 3)  # no reliable restatement
    emptied = [i for i in audit if not audit[i]['apres']]
    reduced = [i for i in audit if audit[i]['apres']]
    take(emptied, 8)  # the second pass removed every profile: was it right?
    take(reduced, 6)  # ... or only some
    # One measure per public, rarest first, so that each profile of the taxonomy is checked.
    by_public: dict[str, list[str]] = {}
    for i in ids:
        for p in annotations[i]['publics']:
            by_public.setdefault(p, []).append(i)
    for public in sorted(by_public, key=lambda p: len(by_public[p])):
        take(by_public[public], 1)
    take([i for i in ids if len(annotations[i]['publics']) >= 3], 4)
    take([i for i in ids if annotations[i]['portee'] == 'large'], 6)
    take([i for i in ids if not annotations[i]['publics'] and annotations[i]['portee'] == 'ciblee'], 6)
    take([i for i in ids if texts[i]['categorie'] == 'sous_mesure'], 4)
    # Fill what is left with an even mix of targeted measures and measures aimed at everyone.
    left = SIZE - len(chosen)
    take([i for i in ids if annotations[i]['publics']], left // 2)
    take([i for i in ids if not annotations[i]['publics']], SIZE - len(chosen))
    rng.shuffle(chosen)
    return chosen[:SIZE]


def load_json_lines(path):
    return [json.loads(line) for line in path.read_text(encoding='utf-8').split('\n') if line]
