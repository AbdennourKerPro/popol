#!/usr/bin/env python3
"""Add new profiles of data/taxonomie.json to the existing annotations (offline, one-off).

Re-annotating everything would also rewrite the checked restatements. This pass only asks, for
each measure, which of the NEW profiles it concretely concerns, with the strict criteria of
audit_publics.py. It can only add those profiles: the other labels are left untouched.
The added pairs are written to data/ajout-publics.json for review.
  ../rag/.venv/bin/python scripts/add_publics.py soignant enseignant ...
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
NEW = tuple(sys.argv[1:])
if not NEW or any(p not in TAXO['publics'] for p in NEW):
    raise SystemExit(f'Donner les nouveaux profils, parmi : {", ".join(TAXO["publics"])}')
BATCH = 20

INSTRUCTIONS = f"""Tu prépares les données d'un outil qui montre à chaque personne les mesures d'un programme politique qui changent concrètement SA vie. Pour chaque mesure, indique lesquels des profils ci-dessous elle concerne.
Indique un profil UNIQUEMENT si la mesure crée pour les personnes de ce profil un droit, une aide, un tarif, une protection, une obligation ou un service concret et direct, qu'elles ressentiraient dans leur vie ou leur travail. Exemples : « égalité salariale entre femmes et hommes » -> femme ; « recruter des infirmières et revaloriser leurs salaires » -> soignant ; « ouvrir le mariage... » ou « PMA pour toutes » -> lgbti ; « récépissé de contrôle d'identité » -> discrimine, quartier_populaire ; « régulariser les travailleurs sans papiers » -> etranger ; « retraite anticipée pour les métiers pénibles » -> metier_penible.
N'indique PAS le profil si :
- la mesure vise des institutions, des entreprises, l'État, des pays ou l'économie en général ;
- le profil n'est cité que comme exemple, contexte ou lieu de l'action ;
- la mesure bénéficie à tout le monde sans viser ce profil (une mesure pour tous les salariés ne vise pas les femmes ni les soignants en particulier) ;
- l'effet est indirect, général ou lointain.
Dans le doute, n'indique rien. La plupart des mesures n'en concernent aucun : liste vide.
Profils :
{json.dumps({p: TAXO['publics'][p] for p in NEW}, ensure_ascii=False, indent=1)}
Réponds pour tous les identifiants fournis, exactement une fois chacun."""


class Item(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: str
    profils: list[Literal[NEW]]


class Batch(BaseModel):
    model_config = ConfigDict(extra='forbid')
    items: list[Item]


async def ask(client, model, rows, by_id, semaphore):
    payload = {'chapitre': rows[0]['chapitre'], 'sous_section': rows[0]['sous_section'], 'mesures': [
        {'id': r['id'], 'texte': r['texte'], **({'mesure_parente': by_id[r['parent_id']]['texte']} if r['parent_id'] else {})} for r in rows]}
    async with semaphore:
        response = await client.responses.parse(model=model, instructions=INSTRUCTIONS, store=False,
            input=[{'role': 'user', 'content': json.dumps(payload, ensure_ascii=False)}], text_format=Batch, max_output_tokens=6000)
    return {i.id: i.profils for i in response.output_parsed.items} if response.output_parsed else {}


async def main():
    annotations = [json.loads(line) for line in ANNOTATIONS.read_text(encoding='utf-8').split('\n') if line]
    rows = [json.loads(line) for line in CORPUS.read_text(encoding='utf-8').split('\n') if line]
    by_id = {r['id']: r for r in rows}
    groups = {}
    for r in rows:
        groups.setdefault(r['sous_section_id'], []).append(r)
    jobs = [rs[i:i + BATCH] for rs in groups.values() for i in range(0, len(rs), BATCH)]
    verdict = {}
    semaphore = asyncio.Semaphore(4)
    model = os.environ.get('OPENAI_MODEL', 'gpt-6-luna')
    async with AsyncOpenAI(api_key=os.environ['OPENAI_API_KEY'], timeout=180, max_retries=2) as client:
        for attempt in range(3):
            todo = [rs for rs in jobs if any(r['id'] not in verdict for r in rs)]
            if not todo:
                break
            for got in await asyncio.gather(*(ask(client, model, rs, by_id, semaphore) for rs in todo)):
                verdict.update(got)
            print(f'passe {attempt + 1} : {len(verdict)} / {len(rows)}', file=sys.stderr)
    missing = [r['id'] for r in rows if r['id'] not in verdict]
    if missing:
        raise SystemExit(f'{len(missing)} mesures sans verdict : {missing[:5]}')
    added = {}
    for a in annotations:
        new = [p for p in dict.fromkeys(verdict[a['id']]) if p not in a['publics']]
        if new:
            added[a['id']] = {'texte': by_id[a['id']]['texte'], 'ajout': new}
            a['publics'] = a['publics'] + new
    ANNOTATIONS.write_text(''.join(json.dumps(a, ensure_ascii=False) + '\n' for a in annotations), encoding='utf-8')
    (APP / 'data/ajout-publics.json').write_text(json.dumps(added, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    counts = {p: sum(p in v['ajout'] for v in added.values()) for p in NEW}
    print(f'{len(added)} mesures modifiées : {counts}', file=sys.stderr)


asyncio.run(main())
