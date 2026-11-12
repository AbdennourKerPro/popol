#!/usr/bin/env python3
"""Seed the answer cache: ask a running Chati server each question and keep the verified answers.

  PYTHONPATH=backend .venv/bin/python scripts/warm_cache.py --base http://127.0.0.1:8080 \
      [--token LIEN_BETA] --questions data/faq-questions.txt --output data/programme/answers.jsonl

Each line written is {question, corpus_version, model, result}. Only generated answers with the
status answered or partial are kept; the server loads them at start-up (ANSWER_CACHE_FILE) and
ignores lines of another corpus version or model. Real model calls are made: in beta, each new
question counts in the link's quota.
"""
import argparse
import json
from pathlib import Path
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from chati.cache import storable


def events(raw: str):
    for chunk in raw.replace('\r\n', '\n').split('\n\n'):
        lines = chunk.split('\n')
        kind = next((line[6:].strip() for line in lines if line.startswith('event:')), None)
        data = '\n'.join(line[5:].lstrip() for line in lines if line.startswith('data:'))
        if kind and data:
            yield kind, json.loads(data)


def ask(base, token, question, timeout):
    headers = {'Content-Type': 'application/json', **({'Authorization': f'Bearer {token}'} if token else {})}
    body = json.dumps({'messages': [{'role': 'user', 'content': question}]}).encode()
    request = urllib.request.Request(base.rstrip('/') + '/api/chat', data=body, headers=headers, method='POST')
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return dict(events(response.read().decode()))


def main(args):
    questions = [line.strip() for line in args.questions.read_text(encoding='utf-8').splitlines() if line.strip() and not line.lstrip().startswith('#')]
    kept = []
    for question in questions:
        try:
            received = ask(args.base, args.token, question, args.timeout)
        except urllib.error.HTTPError as error:
            print(f'✗ {question} : HTTP {error.code}', flush=True)
            continue
        result = received.get('answer')
        if not result:
            print(f"✗ {question} : {received.get('error', {}).get('message', 'pas de réponse')}", flush=True)
        elif result.get('mode') != 'generated' or result.get('status') not in {'answered', 'partial'}:
            print(f"– {question} : non conservée (mode {result.get('mode')}, statut {result.get('status')})", flush=True)
        else:
            kept.append({'question': question, 'corpus_version': result['corpus_version'], 'model': result['model'], 'result': storable(result)})
            print(f"✓ {question}{' (déjà en cache)' if result.get('cached') else ''}", flush=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(''.join(json.dumps(line, ensure_ascii=False) + '\n' for line in kept), encoding='utf-8')
    print(f'{len(kept)}/{len(questions)} réponses écrites dans {args.output}. Redémarrez le serveur pour les charger.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--base', default='http://127.0.0.1:8080')
    parser.add_argument('--token', default=None, help='jeton du lien d’invitation (bêta)')
    parser.add_argument('--questions', type=Path, default=ROOT / 'data/faq-questions.txt')
    parser.add_argument('--output', type=Path, default=ROOT / 'data/programme/answers.jsonl')
    parser.add_argument('--timeout', type=float, default=240)
    main(parser.parse_args())
