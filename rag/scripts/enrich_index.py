#!/usr/bin/env python3
"""Generate index-only paraphrases for every corpus row (written to stdout as JSONL).

The output (data/programme/enrichment.jsonl) improves search only: it is never
displayed, cited or given to the answer generator. It must be reviewed before use.
Run in the app image so the key stays in the container:
  docker compose run --rm -v $PWD/scripts:/s:ro app python /s/enrich_index.py > data/programme/enrichment.jsonl
"""
import asyncio
import json
import os
import sys
from pathlib import Path

from openai import AsyncOpenAI
from pydantic import BaseModel, ConfigDict

INSTRUCTIONS = """Tu prépares l'index de recherche d'un programme politique.
Pour chaque passage fourni, écris une courte ligne « alias » (30 mots maximum) qui aide
à retrouver ce passage quand un citoyen le décrit avec d'autres mots : synonymes courants,
reformulation en langage de tous les jours, nom usuel du sujet, et une question naturelle
qu'il pourrait poser. Contraintes strictes : n'ajoute AUCUN fait, chiffre, date, nom propre,
effet ou jugement absent du passage ; reste neutre ; pas de nouvelle mesure ; pas de guillemets.
Un alias ne répète pas le passage mot pour mot. Réponds pour tous les identifiants fournis,
exactement une fois chacun."""


class Item(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    alias: str


class Batch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    items: list[Item]


async def enrich(client, model, section, subsection, rows, semaphore):
    payload = {"section": section, "sous_section": subsection,
               "passages": [{"id": r["id"], "texte": r["texte"]} for r in rows]}
    wanted = {r["id"] for r in rows}
    async with semaphore:
        for _ in range(3):
            response = await client.responses.parse(model=model, instructions=INSTRUCTIONS, store=False,
                input=[{"role": "user", "content": json.dumps(payload, ensure_ascii=False)}],
                text_format=Batch, max_output_tokens=6000)
            batch = response.output_parsed
            if batch and {i.id for i in batch.items} == wanted and len(batch.items) == len(wanted) \
                    and all(0 < len(i.alias) <= 400 for i in batch.items):
                return batch.items
    raise SystemExit(f"Échec d'enrichissement : {section} > {subsection}")


async def main():
    directory = Path(os.environ.get("CORPUS_DIR", "data/programme"))
    rows = [json.loads(l) for n in ("mesures.jsonl", "textes.jsonl") for l in (directory / n).read_text().splitlines() if l.strip()]
    groups = {}
    for r in rows:
        groups.setdefault((r["section"], r["sous_section"]), []).append(r)
    semaphore = asyncio.Semaphore(4)
    async with AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"], timeout=120, max_retries=2) as client:
        tasks = []
        for (section, sub), items in groups.items():
            for start in range(0, len(items), 30):
                tasks.append(enrich(client, os.environ.get("OPENAI_MODEL", "gpt-6-luna"), section, sub, items[start:start + 30], semaphore))
        done = {i.id: " ".join(i.alias.split()) for batch in await asyncio.gather(*tasks) for i in batch}
    for r in rows:
        print(json.dumps({"id": r["id"], "alias": done[r["id"]]}, ensure_ascii=False))
    print(f"{len(done)} alias générés", file=sys.stderr)


if __name__ == "__main__":
    asyncio.run(main())
