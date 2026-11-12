#!/usr/bin/env python3
"""Second, stricter pass on the publics of data/annotations.jsonl: it can only remove publics.

The first pass tends to name a profile because the text mentions it. Here a model keeps a profile
only when the measure concretely and directly changes something for people of that profile.
The removed pairs are written to data/audit-publics.json for review.
  ../rag/.venv/bin/python scripts/audit_publics.py
"""
import asyncio
import json
import os
from pathlib import Path
import sys
from typing import Literal

from openai import AsyncOpenAI
from pydantic import BaseModel, ConfigDict

APP = Path(__file__).resolve().parents[1]
ANNOTATIONS = APP / 'data/annotations.jsonl'
CORPUS = APP.parent / 'rag/data/programme/mesures.jsonl'
TAXO = json.loads((APP / 'data/taxonomie.json').read_text(encoding='utf-8'))
PUBLICS = tuple(TAXO['publics'])

INSTRUCTIONS = f"""Tu vérifies, mesure par mesure, à qui s'adresse vraiment une mesure d'un programme politique. Pour chaque mesure, on te donne des profils proposés. Garde un profil UNIQUEMENT si la mesure crée pour les personnes de ce profil un droit, une aide, un tarif, une obligation ou un service concret et direct, qu'elles ressentiraient dans leur vie ou leur travail.
Retire le profil si :
- la mesure vise des institutions, des entreprises, l'État, des pays, le commerce ou l'économie en général ;
- le profil n'est cité que comme exemple, comme contexte ou comme lieu de l'action (ex. : financer un hôpital ne concerne pas tous les « senior ») ;
- la mesure bénéficie surtout à d'autres personnes (ex. : régulariser des personnes sans papiers ne concerne pas les salariés ou les parents en général) ;
- l'effet est indirect, général ou lointain (financement, institutions, écologie, politique internationale).
Dans le doute, retire. Tu peux retirer tous les profils. Tu ne peux jamais en ajouter.
Profils :
{json.dumps(TAXO['publics'], ensure_ascii=False, indent=1)}
Réponds pour tous les identifiants fournis, exactement une fois chacun, avec les profils conservés."""


class Item(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: str
    garder: list[Literal[PUBLICS]]


class Batch(BaseModel):
    model_config = ConfigDict(extra='forbid')
    items: list[Item]


async def audit(client, model, rows, texts, semaphore):
    payload = {'mesures': [{'id': a['id'], 'texte': texts[a['id']], 'profils_proposes': a['publics']} for a in rows]}
    async with semaphore:
        response = await client.responses.parse(model=model, instructions=INSTRUCTIONS, store=False,
            input=[{'role': 'user', 'content': json.dumps(payload, ensure_ascii=False)}], text_format=Batch, max_output_tokens=9000)
    return {i.id: i.garder for i in response.output_parsed.items} if response.output_parsed else {}


async def main():
    annotations = [json.loads(line) for line in ANNOTATIONS.read_text(encoding='utf-8').split('\n') if line]
    texts = {}
    for line in CORPUS.read_text(encoding='utf-8').split('\n'):
        if line:
            r = json.loads(line)
            texts[r['id']] = r['texte']
    todo = [a for a in annotations if a['publics']]
    batches = [todo[i:i + 20] for i in range(0, len(todo), 20)]
    semaphore = asyncio.Semaphore(4)
    async with AsyncOpenAI(api_key=os.environ['OPENAI_API_KEY'], timeout=180, max_retries=2) as client:
        results = await asyncio.gather(*(audit(client, os.environ.get('OPENAI_MODEL', 'gpt-6-luna'), b, texts, semaphore) for b in batches))
    verdict = {k: v for r in results for k, v in r.items()}
    removed = {}
    for a in todo:
        if a['id'] not in verdict:
            raise SystemExit(f"Pas de verdict pour {a['id']}")
        kept = [p for p in a['publics'] if p in verdict[a['id']]]
        if len(kept) != len(a['publics']):
            removed[a['id']] = {'texte': texts[a['id']], 'avant': a['publics'], 'apres': kept}
        a['publics'] = kept
    ANNOTATIONS.write_text(''.join(json.dumps(a, ensure_ascii=False) + '\n' for a in annotations), encoding='utf-8')
    (APP / 'data/audit-publics.json').write_text(json.dumps(removed, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{len(todo)} mesures vérifiées, {len(removed)} modifiées, {sum(1 for r in removed.values() if not r["apres"])} sans profil', file=sys.stderr)


asyncio.run(main())
