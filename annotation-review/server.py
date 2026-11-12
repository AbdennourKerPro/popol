#!/usr/bin/env python3
"""Review interface for the measure annotations (profiles, themes, reach, restatement).

Local only, no dependency, no model access:  python3 annotation-review/server.py
Reads the corpus (rag/data/programme) and the annotations (app/data), writes only reviews.json here.
"""
import argparse
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
import os
from pathlib import Path
import tempfile
import threading
from urllib.parse import urlsplit

from sample import ROOT, build, load_json_lines

HERE = Path(__file__).resolve().parent
APP_DATA = ROOT / 'app/data'
REVIEWS = HERE / 'reviews.json'
SAMPLE = HERE / 'sample.json'
PORTEES = ['large', 'ciblee', 'collective']
VERDICTS = [None, 'ok', 'corrige', 'doute']
LOCK = threading.Lock()


def load_context():
    taxonomie = json.loads((APP_DATA / 'taxonomie.json').read_text(encoding='utf-8'))
    annotations = {r['id']: r for r in load_json_lines(APP_DATA / 'annotations.jsonl')}
    corpus = {r['id']: r for r in load_json_lines(ROOT / 'rag/data/programme/mesures.jsonl')}
    audit_path = APP_DATA / 'audit-publics.json'
    audit = json.loads(audit_path.read_text(encoding='utf-8')) if audit_path.is_file() else {}
    if SAMPLE.is_file():
        sample = json.loads(SAMPLE.read_text(encoding='utf-8'))
    else:
        sample = build(annotations, audit, corpus)
        SAMPLE.write_text(json.dumps(sample, indent=1) + '\n', encoding='utf-8')
    mesures = {}
    for i in sample:
        row = corpus[i]
        parent = corpus.get(row.get('parent_id'))
        mesures[i] = {'texte': row['texte'], 'partie': row['partie'], 'chapitre': row['chapitre'], 'sous_section': row['sous_section'],
                      'categorie': row['categorie'], 'url': row['source_url'], 'parent': parent['texte'] if parent else None}
    return {'taxonomie': taxonomie, 'sample': sample, 'mesures': mesures,
            'annotations': {i: {k: annotations[i][k] for k in ('publics', 'themes', 'portee', 'resume')} for i in sample},
            'audit': {i: audit[i] for i in sample if i in audit}}


def read_reviews():
    return json.loads(REVIEWS.read_text(encoding='utf-8')) if REVIEWS.is_file() else {'version': 1, 'reviews': {}}


def write_reviews(data):
    handle, name = tempfile.mkstemp(dir=HERE, prefix='.reviews-', suffix='.tmp')
    with os.fdopen(handle, 'w', encoding='utf-8') as out:
        json.dump(data, out, ensure_ascii=False, indent=1)
        out.write('\n')
    os.replace(name, REVIEWS)


class Invalid(ValueError):
    pass


def validate(entry, context):
    taxonomie = context['taxonomie']
    if not isinstance(entry, dict) or entry.get('id') not in context['mesures']:
        raise Invalid('Mesure inconnue.')
    if entry.get('verdict') not in VERDICTS:
        raise Invalid('Verdict invalide.')
    publics, themes = entry.get('publics'), entry.get('themes')
    if not isinstance(publics, list) or len(set(publics)) != len(publics) or not set(publics) <= set(taxonomie['publics']):
        raise Invalid('Profils invalides.')
    if not isinstance(themes, list) or not 1 <= len(themes) <= 3 or len(set(themes)) != len(themes) or not set(themes) <= set(taxonomie['themes']):
        raise Invalid('De 1 à 3 thèmes, du vocabulaire.')
    if entry.get('portee') not in PORTEES:
        raise Invalid('Portée invalide.')
    for name, limit in (('resume', 400), ('comment', 2000)):
        if entry.get(name) is not None and (not isinstance(entry[name], str) or len(entry[name]) > limit):
            raise Invalid(f'Champ {name} invalide.')
    return {k: entry.get(k) for k in ('id', 'verdict', 'publics', 'themes', 'portee', 'resume', 'comment')}


class Handler(BaseHTTPRequestHandler):
    context: dict = {}
    allowed_hosts: set = set()

    def log_message(self, *_):
        pass

    def send(self, status, body, content_type='application/json; charset=utf-8'):
        payload = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'")
        self.end_headers()
        self.wfile.write(payload)

    def trusted(self):
        # Refuses requests whose Host is not this very server (DNS rebinding) or whose origin is elsewhere.
        if self.headers.get('Host') not in self.allowed_hosts:
            return False
        origin = self.headers.get('Origin')
        return origin is None or urlsplit(origin).netloc in self.allowed_hosts

    def do_GET(self):
        if not self.trusted():
            return self.send(403, {'error': 'Hôte non autorisé.'})
        path = urlsplit(self.path).path
        if path == '/api/data':
            with LOCK:
                return self.send(200, {**self.context, 'reviews': read_reviews()['reviews']})
        name = 'index.html' if path == '/' else path.lstrip('/')
        target = (HERE / name).resolve()
        if name not in {'index.html', 'app.js', 'style.css'} or not target.is_file():
            return self.send(404, {'error': 'Introuvable.'})
        self.send(200, target.read_bytes(), mimetypes.guess_type(name)[0] or 'application/octet-stream')

    def do_POST(self):
        if not self.trusted() or self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            return self.send(403, {'error': 'Requête refusée.'})
        if urlsplit(self.path).path != '/api/review':
            return self.send(404, {'error': 'Introuvable.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length < 20000:
                raise Invalid('Taille invalide.')
            entry = validate(json.loads(self.rfile.read(length)), self.context)
        except (ValueError, json.JSONDecodeError) as error:
            return self.send(400, {'error': str(error) if isinstance(error, Invalid) else 'Requête invalide.'})
        entry['updated'] = datetime.now(timezone.utc).isoformat(timespec='seconds')
        with LOCK:
            data = read_reviews()
            if entry['verdict'] is None and not entry['comment']:
                data['reviews'].pop(entry['id'], None)
            else:
                data['reviews'][entry['id']] = entry
            write_reviews(data)
        self.send(200, {'saved': True, 'updated': entry['updated']})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8083)
    args = parser.parse_args()
    Handler.context = load_context()
    Handler.allowed_hosts = {f'127.0.0.1:{args.port}', f'localhost:{args.port}'}
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'Relecture des annotations : http://127.0.0.1:{args.port}  ({len(Handler.context["sample"])} mesures, Ctrl+C pour arrêter)')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
