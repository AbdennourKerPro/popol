#!/usr/bin/env python3
"""Run retrieval diagnostics, optionally generation. Never inject gold into prompts.

PYTHONPATH=backend .venv/bin/python scripts/run_benchmark.py
Add --generate only with an OpenAI key and after choosing RETRIEVAL_MODE.
Generation results require a separate semantic assessment against the references.
"""
import argparse
import asyncio
from dataclasses import replace
import json
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from chati.config import Settings
from chati.corpus import Corpus
from chati.generation import generate
from chati.models import Message
from chati.retrieval import Retriever, query_for_messages
from benchmark_rules import group_coverage
from openai import AsyncOpenAI


async def run(args):
    settings = Settings()
    corpus = Corpus(settings.corpus_dir)
    retriever = Retriever(corpus, settings)
    if not retriever.ready:
        raise SystemExit(retriever.index_error)
    if (args.generate or settings.mode == 'hybrid') and not settings.api_key:
        raise SystemExit('OPENAI_API_KEY est nécessaire pour cette exécution.')
    questions = [json.loads(line) for line in (args.benchmark / 'questions.jsonl').read_text().splitlines()]
    # Gold is used solely after retrieval, not in query construction or generation.
    refs = {r['id']: r for r in map(json.loads, (args.benchmark / 'references.jsonl').read_text().splitlines())}
    client = AsyncOpenAI(api_key=settings.api_key, timeout=settings.timeout, max_retries=1) if settings.api_key else None
    cases = []
    try:
        for case in questions:
            start = time.monotonic()
            messages = [Message.model_validate(m) for m in case['messages']]
            rows, ids = await retriever.search(query_for_messages(messages), client)
            context_ids = [r['id'] for r in rows]
            ref = refs[case['id']]
            # Conditional groups need the actual answer branch, assessed later.
            coverages = [value for g in ref['evidence_groups'] if (value := group_coverage(g, context_ids)) is not None]
            result = {'id': case['id'], 'category': ref['category'], 'retrieved_ids': ids,
                      'context_ids': context_ids, 'known_evidence_coverage': sum(coverages) / len(coverages) if coverages else None,
                      'conditional_groups_not_scored': sum(g['when'] != 'always' for g in ref['evidence_groups'])}
            if args.generate:
                try:
                    answer, usage = await generate(client, settings.model, messages, rows)
                    result.update(answer=answer.model_dump(), model=settings.model, usage=usage)
                except Exception as exc:
                    result['error_type'] = type(exc).__name__
            result['latency_ms'] = round((time.monotonic() - start) * 1000)
            cases.append(result)
            print(f"{case['id']} : couverture des preuves connues = {result['known_evidence_coverage']}", flush=True)
    finally:
        retriever.close()
        if client:
            await client.close()
    coverages = [c['known_evidence_coverage'] for c in cases if c['known_evidence_coverage'] is not None]
    report = {'corpus_version': corpus.version, 'retrieval_mode': settings.mode,
              'generation_executed': args.generate, 'model': settings.model if args.generate else None,
              'question_count': len(cases), 'cases_with_unconditional_evidence': len(coverages),
              'mean_known_evidence_coverage': sum(coverages) / len(coverages) if coverages else None,
              'limitation': 'Diagnostic des groupes de preuves connus uniquement. Les références ouvertes peuvent accepter d’autres sources ; les groupes conditionnels sont exclus sans lecture de la réponse. Ce résultat ne note ni la qualité des réponses, ni la justesse sémantique des citations, ni la généralisation.',
              'cases': cases}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(f"Rapport : {args.output}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--benchmark', type=Path, default=ROOT / 'benchmarks/chati-v1')
    parser.add_argument('--output', type=Path, default=ROOT / 'output/benchmark.json')
    parser.add_argument('--generate', action='store_true')
    asyncio.run(run(parser.parse_args()))
