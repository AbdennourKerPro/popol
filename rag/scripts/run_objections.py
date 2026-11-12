#!/usr/bin/env python3
"""Run the hand-review batch of objections (no gold, no score): real generation calls.

PYTHONPATH=backend .venv/bin/python scripts/run_objections.py
Needs the provider key (OPENAI_API_KEY, or GROQ_API_KEY with LLM_PROVIDER=groq).
Each answer is then read by hand: see benchmarks/objections/README.md.
"""
import argparse
import asyncio
import json
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from chati.config import Settings
from chati.corpus import Corpus
from chati.embeddings import make_embedder
from chati.generation import generate
from chati.groq import GroqClient
from chati.models import Message
from chati.objections import is_objection
from chati.web import research_web
from chati.retrieval import Retriever, query_for_messages
from openai import AsyncOpenAI


async def run(args):
    settings = Settings()
    if not settings.provider_key:
        raise SystemExit('Une clé du fournisseur (OPENAI_API_KEY ou GROQ_API_KEY) est nécessaire : ce lot appelle le modèle.')
    corpus = Corpus(settings.corpus_dir, settings.index_enrichment)
    if settings.llm_provider == 'groq':
        client = GroqClient(settings)
    else:
        client = AsyncOpenAI(api_key=settings.api_key, timeout=settings.timeout, max_retries=1)
    retriever = Retriever(corpus, settings, make_embedder(settings, client if settings.llm_provider == 'openai' else None))
    if not retriever.ready:
        raise SystemExit(retriever.index_error)
    questions = [json.loads(line) for line in (args.batch / 'questions.jsonl').read_text().splitlines() if line.strip()]
    cases = []
    try:
        for case in questions:
            start = time.monotonic()
            messages = [Message.model_validate(m) for m in case['messages']]
            rows, ids = await retriever.search(query_for_messages(messages), client)
            result = {'id': case['id'], 'question': messages[-1].content, 'context_ids': [r['id'] for r in rows]}
            # Same path as the server: a doubt triggers the research of examples abroad (OpenAI only).
            web_rows, web_context = [], None
            if settings.objection_research and settings.web_available and is_objection(messages[-1].content):
                try:
                    web_rows, web_context, _ = await research_web(client, settings.generation_model, messages, rows,
                                                                   max_calls=settings.web_max_calls, objective='objection')
                except Exception as exc:
                    result['research_error'] = type(exc).__name__
            result['web_sources'] = [{'id': r['id'], 'title': r['title'], 'url': r['source_url']} for r in web_rows]
            try:
                answer, usage = await generate(client, settings.generation_model, messages, rows + web_rows,
                                               **({'web_context': web_context, 'web_mode': 'objection'} if web_context else {}))
                result.update(answer=answer.model_dump(), model=settings.generation_model, usage=usage)
            except Exception as exc:
                result['error_type'] = type(exc).__name__
            result['latency_ms'] = round((time.monotonic() - start) * 1000)
            cases.append(result)
            print(f"\n{case['id']} — {result['question']}")
            if 'answer' not in result:
                print(f"  erreur : {result['error_type']}")
                continue
            print(f"  statut : {result['answer']['status']}")
            for block in result['answer']['blocks']:
                print(f"  [{block['kind']}] {block['text']}")
                for point in block.get('points', []):
                    print(f"    • {point['text']} {point['source_ids']}")
                print(f"    IDs cités : {', '.join(block['source_ids']) or '—'}")
            for web in result['web_sources']:
                print(f"  {web['id']} : {web['title']} — {web['url']}")
            if result.get('research_error'):
                print(f"  recherche web sans résultat exploitable ({result['research_error']}) : réponse avec le programme seul")
    finally:
        retriever.close()
        await client.close()
    report = {'corpus_version': corpus.version, 'retrieval_mode': settings.mode, 'model': settings.generation_model,
              'question_count': len(cases),
              'limitation': 'Lot sans corrigé : chaque réponse se relit à la main selon benchmarks/objections/README.md.',
              'cases': cases}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(f"\nRapport : {args.output}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--batch', type=Path, default=ROOT / 'benchmarks/objections')
    parser.add_argument('--output', type=Path, default=ROOT / 'output/objections.json')
    asyncio.run(run(parser.parse_args()))
