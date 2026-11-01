#!/usr/bin/env python3
"""Retrieval-only ablation on the benchmark: no generation, no judge.

Measures, per configuration, the recall of the corrigé's unconditional evidence groups
(benchmark_rules.group_coverage) in the top 8 and in the expanded context, and how many
distinct subsections the 8 passages cover. Run inside the app image (key stays there):
  docker compose run --rm -T -v $PWD/scripts:/s:ro -v $PWD/benchmarks:/b:ro app python /s/eval_retrieval.py
Uses the real embeddings and planner API, so it costs a few cents.
"""
import asyncio
from dataclasses import replace
import json
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from benchmark_rules import group_coverage
from openai import AsyncOpenAI
from chati.config import Settings
from chati.corpus import Corpus
from chati.index import build
from chati.models import Message
from chati.queries import plan_queries
from chati.retrieval import Retriever, query_for_messages

ONLY = os.environ.get('ONLY', '')
BENCH = Path(sys.argv[1] if len(sys.argv) > 1 else "/b/chati-v1")
CONFIGS = {  # name: (enrichment, synonyms, per_subsection, planning, keep_top, count)
    "A baseline": (False, False, 0, False, 0, 8),
    "enrichissement seul": (True, False, 0, False, 0, 8),
    "synonymes seuls": (False, True, 0, False, 0, 8),
    "plafond 4 seul": (False, False, 4, False, 0, 8),
    "plafond 3 seul": (False, False, 3, False, 0, 8),
    "décomposition seule": (False, False, 0, True, 0, 8),
    "enrichi + synonymes": (True, True, 0, False, 0, 8),
    "enrichi + décomp. (sans synonymes)": (True, False, 0, True, 0, 8),
    "enrichi + syn. + plafond 4": (True, True, 4, False, 0, 8),
    "enrichi + syn. + décomp.": (True, True, 0, True, 0, 8),
    "tout (plafond 4 + décomp.)": (True, True, 4, True, 0, 8),
    "tout (plafond 3 + décomp.)": (True, True, 3, True, 0, 8),
    "enrichi + syn., 12 passages": (True, True, 0, False, 0, 12),
    "enrichi + syn., 16 passages": (True, True, 0, False, 0, 16),
    "enrichi + syn., 20 passages": (True, True, 0, False, 0, 20),
    "base, 12 passages": (False, False, 0, False, 0, 12),
    "base, 20 passages": (False, False, 0, False, 0, 20),
    "plafond 2, 5 premiers intacts, seul": (False, False, 2, False, 5, 8),
    "enrichi + syn. + plafond 2 (5 intacts)": (True, True, 2, False, 5, 8),
    "enrichi + syn. + décomp. + plafond 2 (5 intacts)": (True, True, 2, True, 5, 8),
}


async def main():
    base = Settings()
    refs = [json.loads(l) for l in (BENCH / "references.jsonl").read_text().splitlines()]
    cases = [r for r in refs if any(g["when"] == "always" for g in r["evidence_groups"])]
    async with AsyncOpenAI(api_key=base.api_key, timeout=60, max_retries=2) as client:
        enriched_dir, plain_dir = base.index_dir.parent / "index-enriched", base.index_dir.parent / "index-plain"
        for directory, flag in [(enriched_dir, True), (plain_dir, False)]:
            if not (directory / "embeddings.npz").exists():
                await build(replace(base, index_dir=directory, index_enrichment=flag))
        plans = {}
        for r in cases if any(c[3] for n, c in CONFIGS.items() if not ONLY or ONLY in n) else []:
            msgs = [Message(**m) for m in r["messages"]]
            try:
                plans[r["id"]] = (await plan_queries(client, base.model, msgs))[0]
            except Exception as exc:  # noqa: BLE001 - reported, falls back to a single query
                plans[r["id"]] = []
                print("planner failed", r["id"], type(exc).__name__, file=sys.stderr)
        results = {}
        for name, (enrich, syn, cap, plan, keep, count) in CONFIGS.items():
            if ONLY and ONLY not in name:
                continue
            settings = replace(base, mode="hybrid", index_enrichment=enrich, synonyms=syn, per_subsection=cap, keep_top=keep, retrieval_count=count,
                               index_dir=enriched_dir if enrich else plain_dir)
            corpus = Corpus(settings.corpus_dir, enrich)
            retriever = Retriever(corpus, settings)
            assert retriever.ready, (name, retriever.index_error)
            rows = []
            for r in cases:
                msgs = [Message(**m) for m in r["messages"]]
                context, top = await retriever.search(query_for_messages(msgs), client, extra_queries=plans[r["id"]] if plan else ())
                groups = [g for g in r["evidence_groups"] if g["when"] == "always"]
                ids = [c["id"] for c in context]
                rows.append({"id": r["id"], "top8": [group_coverage(g, top) for g in groups],
                             "context": [group_coverage(g, ids) for g in groups],
                             "subsections": len({corpus.by_id[i]["sous_section"] for i in top})})
            retriever.close()
            flat = [v for x in rows for v in x["top8"]]
            results[name] = {"recall_macro": sum(sum(x["top8"]) / len(x["top8"]) for x in rows) / len(rows),
                             "recall_micro": sum(flat) / len(flat), "groups": len(flat),
                             "context_recall_micro": sum(v for x in rows for v in x["context"]) / len(flat),
                             "cases_fully_covered": sum(all(v == 1 for v in x["top8"]) for x in rows), "cases": len(rows),
                             "mean_distinct_subsections": sum(x["subsections"] for x in rows) / len(rows),
                             "missed": [x["id"] for x in rows if any(v < 1 for v in x["top8"])]}
            print(name, {k: (round(v, 3) if isinstance(v, float) else v) for k, v in results[name].items() if k != "missed"}, results[name]["missed"], file=sys.stderr, flush=True)
    print(json.dumps({"plans": plans, "results": results}, ensure_ascii=False, indent=1))


asyncio.run(main())
