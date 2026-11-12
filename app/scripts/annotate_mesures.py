#!/usr/bin/env python3
"""Annotate every measure of the programme for the question journey (offline, one-off).

For each measure a model fills: who it concretely concerns (`publics`), its themes, its reach
(`portee`) and a plain-language restatement (`resume`). Vocabulary: data/taxonomie.json.
Output: data/annotations.jsonl. The app never calls a model: it only reads this file.

The restatement is checked by script: no figure and no capitalised name that the measure (or its
parent) does not contain. After three failed attempts `resume` is null and the app shows the
exact measure text instead. Run with the RAG's virtualenv and OPENAI_API_KEY in the environment:
  ../rag/.venv/bin/python scripts/annotate_mesures.py
"""
import asyncio
import json
import os
from pathlib import Path
import re
import sys
import unicodedata
from typing import Literal

from openai import AsyncOpenAI
from pydantic import BaseModel, ConfigDict

APP = Path(__file__).resolve().parents[1]
CORPUS = APP.parent / 'rag/data/programme/mesures.jsonl'
OUT = APP / 'data/annotations.jsonl'
TAXO = json.loads((APP / 'data/taxonomie.json').read_text(encoding='utf-8'))
PUBLICS, THEMES = tuple(TAXO['publics']), tuple(TAXO['themes'])
BATCH = 18

INSTRUCTIONS = f"""Tu prépares les données d'un outil qui montre à chaque personne les mesures d'un programme politique qui la concernent. Pour chaque mesure fournie, réponds :

publics : les profils pour lesquels la mesure change CONCRÈTEMENT quelque chose (un droit, une aide, un tarif, une obligation, un service qui leur est destiné). N'indique un profil que si la mesure (ou son contexte) le vise clairement. Liste vide si la mesure concerne tout le monde ou le fonctionnement de l'État, des entreprises, du pays ou de la planète, sans bénéficiaire précis. Exemples : « gratuité de la cantine » -> parent, enfant_scolarise ; « SMIC à 1 700 € » -> salarie ; « interdire les fermes-usines » -> [] ; « créer un pôle public du médicament » -> [].
Profils possibles :
{json.dumps(TAXO['publics'], ensure_ascii=False, indent=1)}

themes : 1 à 3 thèmes, le principal d'abord.
{json.dumps(TAXO['themes'], ensure_ascii=False, indent=1)}

portee : « large » si une grande partie de la population est concernée directement ; « ciblee » si c'est un groupe précis ; « collective » si l'effet passe par les institutions, le pays, l'économie ou la planète.

resume : une phrase simple (28 mots maximum), sans jargon, qui dit ce que prévoit la mesure, au conditionnel présent (« Le SMIC passerait à 1 700 € net »). Elle reformule le texte, rien de plus : AUCUN chiffre, seuil, date, nom propre, institution ou fait absent du texte de la mesure (ou de la mesure parente fournie) ; aucun jugement, aucune promesse d'effet (pas de « tu gagneras », « ça fera baisser »). Pas de pronom personnel (ni tu, ni vous, ni nous). Une sous-mesure se lit avec sa mesure parente : la phrase doit rester compréhensible seule.
Réponds pour tous les identifiants fournis, exactement une fois chacun."""


class Item(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: str
    publics: list[Literal[PUBLICS]]
    themes: list[Literal[THEMES]]
    portee: Literal['large', 'ciblee', 'collective']
    resume: str


class Batch(BaseModel):
    model_config = ConfigDict(extra='forbid')
    items: list[Item]


def norm(text):
    return ''.join(c for c in unicodedata.normalize('NFKD', text.lower()) if not unicodedata.combining(c))


def numbers(text):
    return {re.sub(r'[\s .,]', '', n) for n in re.findall(r'\d[\d\s .,]*\d|\d', text)}


def problems(item, source):
    """Why a restatement cannot be trusted ([] if it can)."""
    text, found = item.resume.strip(), []
    if not 20 <= len(text) <= 260:
        found.append('longueur')
    if numbers(text) - numbers(source):
        found.append('chiffre absent du texte')
    known = norm(source)
    names = [w for w in re.findall(r'(?<=[a-zàâéèêîôûç,;:] )[A-ZÉÈÀ][\wéèêàâîôûç\-]+', text) if norm(w) not in known]
    if names:
        found.append(f'nom propre absent : {names[:3]}')
    if re.search(r'\b(tu|toi|vous|nous|ton|ta|tes|votre|vos|notre)\b', text, re.I):
        found.append('pronom personnel')
    if not 1 <= len(item.themes) <= 3 or len(set(item.themes)) != len(item.themes) or len(set(item.publics)) != len(item.publics):
        found.append('étiquettes')
    return found


async def annotate(client, model, sub, rows, by_id, semaphore):
    payload = {'chapitre': rows[0]['chapitre'], 'sous_section': sub, 'mesures': [
        {'id': r['id'], 'texte': r['texte'], **({'mesure_parente': by_id[r['parent_id']]['texte']} if r['parent_id'] else {})} for r in rows]}
    async with semaphore:
        response = await client.responses.parse(model=model, instructions=INSTRUCTIONS, store=False,
            input=[{'role': 'user', 'content': json.dumps(payload, ensure_ascii=False)}], text_format=Batch, max_output_tokens=9000)
    batch = response.output_parsed
    return {i.id: i for i in batch.items} if batch else {}


async def main():
    rows = [json.loads(line) for line in CORPUS.read_text(encoding='utf-8').split('\n') if line]
    by_id = {r['id']: r for r in rows}
    done, failed = {}, {}
    pending = list(rows)
    semaphore = asyncio.Semaphore(4)
    model = os.environ.get('OPENAI_MODEL', 'gpt-6-luna')
    async with AsyncOpenAI(api_key=os.environ['OPENAI_API_KEY'], timeout=180, max_retries=2) as client:
        for attempt in range(3):
            groups = {}
            for r in pending:
                groups.setdefault(r['sous_section_id'], []).append(r)
            jobs = [(sub, rs[i:i + BATCH]) for sub, rs in groups.items() for i in range(0, len(rs), BATCH)]
            results = await asyncio.gather(*(annotate(client, model, by_id[rs[0]['id']]['sous_section'], rs, by_id, semaphore) for _, rs in jobs))
            for (_, rs), got in zip(jobs, results):
                for r in rs:
                    item = got.get(r['id'])
                    if not item:
                        continue
                    source = r['texte'] + ' ' + (by_id[r['parent_id']]['texte'] if r['parent_id'] else '') + ' ' + r['sous_section']
                    issues = problems(item, source)
                    # Labels are kept even if the sentence is not: they do not state facts.
                    if issues and ('étiquettes' in issues):
                        continue
                    if issues:
                        failed[r['id']] = (issues, item)
                        done.setdefault(r['id'], item.model_copy(update={'resume': None}))
                        continue
                    failed.pop(r['id'], None)
                    done[r['id']] = item
            pending = [r for r in rows if r['id'] not in done or r['id'] in failed]
            print(f'passe {attempt + 1} : {len(done)} annotées, {len(pending)} à refaire', file=sys.stderr)
            if not pending:
                break
    missing = [r['id'] for r in rows if r['id'] not in done]
    if missing:
        raise SystemExit(f'{len(missing)} mesures sans annotation : {missing[:5]}')
    lines = [json.dumps({'id': r['id'], 'publics': done[r['id']].publics, 'themes': done[r['id']].themes,
                         'portee': done[r['id']].portee, 'resume': done[r['id']].resume}, ensure_ascii=False) for r in rows]
    OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'{len(lines)} annotations ; {sum(1 for r in rows if done[r["id"]].resume is None)} sans résumé fiable', file=sys.stderr)


asyncio.run(main())
