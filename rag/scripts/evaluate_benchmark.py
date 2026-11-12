#!/usr/bin/env python3
"""Record a benchmark through the running API; never send gold to the app.

Run collection first. A separate audit and aggregation assess the saved answers.
No API key is read by this script. Completed cases are checkpointed once.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def collect_case(base_url, case, timeout):
    start = time.monotonic()
    events, answer, error = [], None, None
    payload = {'messages': case['messages'], 'research': False}
    request = urllib.request.Request(base_url + '/api/chat',
        data=json.dumps(payload, ensure_ascii=False).encode(),
        headers={'Content-Type': 'application/json'})
    done = False
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            kind, data_lines = '', []
            for raw in response:
                line = raw.decode('utf-8').rstrip('\r\n')
                if line.startswith('event: '):
                    kind = line[7:]
                elif line.startswith('data: '):
                    data_lines.append(line[6:])
                elif not line and data_lines:
                    data = json.loads('\n'.join(data_lines))
                    events.append({'event': kind, 'data': data})
                    if kind == 'answer':
                        answer = data
                    elif kind == 'error':
                        error = data.get('message', 'API error')
                    elif kind == 'done':
                        done = True
                    data_lines = []
        if not done and error is None:
            error = 'Incomplete SSE stream (no done event)'
    except urllib.error.HTTPError as exc:
        error = f'HTTP {exc.code}'
    except (OSError, ValueError) as exc:
        error = type(exc).__name__
    return {'id': case['id'], 'messages': case['messages'], 'research': False,
            'answer': answer, 'error': error, 'done': done, 'events': events,
            'client_latency_ms': round((time.monotonic() - start) * 1000)}


def collect(args):
    args.output.mkdir(parents=True, exist_ok=True)
    metadata_path = args.output / 'run.json'
    raw_path = args.output / 'responses.jsonl'
    questions_path = args.benchmark / 'questions.jsonl'
    questions = [json.loads(line) for line in questions_path.read_text().splitlines()]
    if len(questions) != 40 or len({q['id'] for q in questions}) != 40:
        raise SystemExit('Expected exactly 40 distinct cases')
    with urllib.request.urlopen(args.url + '/api/status', timeout=10) as response:
        status = json.load(response)
    if not status['index_ready'] or not status['generation_available'] or status['consultation_mode']:
        raise SystemExit('Generation and retrieval must be available; consultation mode is excluded')
    fingerprints = {str(path.relative_to(ROOT)): digest(path) for path in
                    sorted((ROOT / 'backend/chati').glob('*.py'))}
    fingerprints.update({str(path.relative_to(ROOT)): digest(path) for path in
                         [questions_path, args.benchmark / 'references.jsonl', args.benchmark / 'manifest.json',
                          ROOT / 'data/programme/mesures.jsonl', ROOT / 'data/programme/textes.jsonl']})
    if metadata_path.exists():
        metadata = json.loads(metadata_path.read_text())
        if metadata['fingerprints'] != fingerprints or metadata['app_status'] != status:
            raise SystemExit('Configuration changed: use a new output directory')
    else:
        metadata = {'started_at': datetime.now(timezone.utc).isoformat(), 'app_status': status,
                    'url': args.url, 'research': False, 'concurrency': args.concurrency,
                    'attempts_per_case': 1, 'fingerprints': fingerprints,
                    'transport': 'POST /api/chat, real service; gold never sent',
                    'collection_complete': False}
        metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
    completed = [json.loads(line) for line in raw_path.read_text().splitlines()] if raw_path.exists() else []
    if len({r['id'] for r in completed}) != len(completed):
        raise SystemExit('Duplicate case in checkpoint')
    completed_ids = {r['id'] for r in completed}
    if len(completed) == 40 and metadata.get('collection_complete'):
        print('40/40 already recorded. Original run preserved; use a new directory for another generation.')
        return
    remaining = [q for q in questions if q['id'] not in completed_ids]
    with raw_path.open('a') as output, ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = [pool.submit(collect_case, args.url, q, args.timeout) for q in remaining]
        for future in as_completed(futures):
            result = future.result()
            output.write(json.dumps(result, ensure_ascii=False) + '\n')
            output.flush()
            completed.append(result)
            print(f"{len(completed):02d}/40 {result['id']} {'ERROR: ' + result['error'] if result['error'] else 'OK'} {result['client_latency_ms']}ms", flush=True)
    metadata.update(completed_at=datetime.now(timezone.utc).isoformat(),
                    collection_complete=len(completed) == 40,
                    response_count=len(completed),
                    responses_sha256=digest(raw_path))
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8080')
    parser.add_argument('--benchmark', type=Path, default=ROOT / 'benchmarks/chati-v1')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--concurrency', type=int, choices=[1, 2, 3], default=2)
    parser.add_argument('--timeout', type=int, default=240)
    collect(parser.parse_args())
