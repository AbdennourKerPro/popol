#!/usr/bin/env python3
"""Serve a frozen review packet and save only human annotations. No LLM access."""
import argparse
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
import os
from pathlib import Path
import shutil
import tempfile
import threading
from urllib.parse import unquote, urlsplit

STATIC = Path(__file__).resolve().parent
DIMS = ['accuracy', 'sources', 'limits', 'clarity']


class InvalidReview(ValueError):
    pass


def text_field(value, name, limit=12000):
    if not isinstance(value, str) or len(value) > limit:
        raise InvalidReview(f'Champ {name} invalide ou trop long.')
    return value


def validate_review(data, session):
    if data.get('session_id') != session['session_id']:
        raise InvalidReview('Cette note appartient à une autre session de relecture.')
    case = next((c for c in session['cases'] if c['id'] == data.get('case_id')), None)
    if not case or data.get('run') not in session['run_order']:
        raise InvalidReview('Cas ou passage inconnu.')
    state = data.get('state')
    if state not in ['draft', 'final']:
        raise InvalidReview('État de relecture invalide.')
    scores = data.get('scores')
    reasons = data.get('dimension_reasons')
    if not isinstance(scores, dict) or set(scores) != set(DIMS) or not isinstance(reasons, dict) or set(reasons) != set(DIMS):
        raise InvalidReview('Les quatre dimensions sont nécessaires.')
    for dimension in DIMS:
        allowed = [None, 0, 1, 2] + (['na'] if dimension == 'sources' else [])
        value = scores[dimension]
        if isinstance(value, bool) or value not in allowed or (value not in [None, 'na'] and type(value) is not int):
            raise InvalidReview('Une note doit être 0, 1, 2, ou non évaluée ; N/A seulement pour Sources.')
        text_field(reasons[dimension], dimension)
    criteria = data.get('criteria')
    expected = {c['id'] for c in case['reference']['criteria']}
    if not isinstance(criteria, dict) or set(criteria) != expected:
        raise InvalidReview('La liste des critères ne correspond pas à ce cas.')
    for identifier, judgment in criteria.items():
        if not isinstance(judgment, dict) or type(judgment.get('coverage')) is bool or judgment.get('coverage') not in [None, 0, 0.5, 1]:
            raise InvalidReview('Couverture de critère invalide.')
        text_field(judgment.get('reason'), identifier)
        text_field(judgment.get('excerpt'), identifier)
    conditions = data.get('conditions')
    expected_conditions = {c['when'] for c in case['reference']['conditional_expectations']}
    if not isinstance(conditions, dict) or set(conditions) != expected_conditions:
        raise InvalidReview('Branches conditionnelles invalides.')
    for judgment in conditions.values():
        if not isinstance(judgment, dict) or judgment.get('active') not in ['', 'yes', 'no', 'unsure']:
            raise InvalidReview('Activation de branche invalide.')
        if type(judgment.get('coverage')) is bool or judgment.get('coverage') not in [None, 0, 0.5, 1]:
            raise InvalidReview('Couverture conditionnelle invalide.')
        text_field(judgment.get('reason'), 'branche')
        text_field(judgment.get('excerpt'), 'branche')
    for flag in ['critical_error', 'false_absence']:
        if data.get(flag) not in ['', 'yes', 'no', 'unsure']:
            raise InvalidReview('Signalement invalide.')
    if data.get('verdict') not in ['', 'valid', 'invalid', 'uncertain']:
        raise InvalidReview('Verdict invalide.')
    for field in ['reviewer', 'notes', 'override_reason']:
        text_field(data.get(field), field)
    numeric = [scores[d] for d in DIMS if scores[d] != 'na']
    score = 100 * sum(numeric) / (2 * len(numeric)) if numeric and all(type(v) is int for v in numeric) else None
    gates_known = all(data[f] in ['yes', 'no'] for f in ['critical_error', 'false_absence'])
    calculated_pass = (score >= 75 and scores['accuracy'] >= 1 and (scores['sources'] == 'na' or scores['sources'] >= 1)
                       and data['critical_error'] == 'no' and data['false_absence'] == 'no') if score is not None and gates_known else None
    if state == 'final':
        if not data['verdict'] or not data['notes'].strip():
            raise InvalidReview('Le verdict et une justification sont nécessaires pour finaliser.')
        if data['verdict'] != 'uncertain':
            if score is None or not gates_known or any(not reasons[d].strip() for d in DIMS):
                raise InvalidReview('Notez et justifiez chaque dimension, puis examinez les deux signalements.')
            if any(j['coverage'] is None or not j['reason'].strip() or not j['excerpt'].strip() for j in criteria.values()):
                raise InvalidReview('Chaque critère demande une couverture, une raison et un extrait de la réponse.')
            if any(j['active'] not in ['yes', 'no'] or not j['reason'].strip() or (j['active'] == 'yes' and (j['coverage'] is None or not j['excerpt'].strip())) for j in conditions.values()):
                raise InvalidReview('Examinez les branches conditionnelles et justifiez leur activation ou non-activation.')
            if (data['verdict'] == 'valid') != calculated_pass and not data['override_reason'].strip():
                raise InvalidReview('Votre verdict diffère du calcul de la grille : expliquez cet arbitrage.')
    return {'session_id': session['session_id'], 'case_id': case['id'], 'run': data['run'],
            'state': state, 'reviewer': data['reviewer'], 'scores': scores,
            'dimension_reasons': reasons, 'criteria': criteria, 'conditions': conditions,
            'critical_error': data['critical_error'], 'false_absence': data['false_absence'],
            'verdict': data['verdict'], 'notes': data['notes'], 'override_reason': data['override_reason'],
            'calculated_score': score, 'calculated_pass': calculated_pass,
            'response_sha256': case['responses'][data['run']]['raw_response_sha256'],
            'updated_at': datetime.now(timezone.utc).isoformat(), 'author_type': 'manual_local_review'}


class ReviewStore:
    def __init__(self, path, session):
        self.path, self.session = Path(path), session
        self.lock = threading.RLock()

    def load(self):
        with self.lock:
            if not self.path.exists():
                return {'schema_version': 1, 'session_id': self.session['session_id'], 'reviews': []}
            data = json.loads(self.path.read_text())
            if data.get('session_id') != self.session['session_id']:
                raise InvalidReview('Le fichier de notes appartient à une autre session ; il est conservé sans écrasement.')
            return data

    def save(self, body):
        review = validate_review(body, self.session)
        with self.lock:
            state = self.load()
            key = (review['case_id'], review['run'])
            state['reviews'] = [r for r in state['reviews'] if (r['case_id'], r['run']) != key] + [review]
            self.path.parent.mkdir(parents=True, exist_ok=True)
            fd, temporary = tempfile.mkstemp(prefix='.human-review-', suffix='.json', dir=self.path.parent)
            try:
                with os.fdopen(fd, 'w') as output:
                    json.dump(state, output, ensure_ascii=False, indent=2)
                    output.write('\n')
                os.replace(temporary, self.path)
            finally:
                if os.path.exists(temporary):
                    os.unlink(temporary)
        return review


def make_server(session_path, annotations_path, pdf_path, host='127.0.0.1', port=8081):
    session = json.loads(Path(session_path).read_text())
    store = ReviewStore(annotations_path, session)
    pdf = Path(pdf_path)

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, format, *args):
            pass  # Never log human notes or request bodies.

        def send_headers(self, status, content_type, size):
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(size))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'same-origin')
            self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
            self.end_headers()

        def respond(self, value, status=200):
            body = json.dumps(value, ensure_ascii=False).encode()
            self.send_headers(status, 'application/json; charset=utf-8', len(body))
            self.wfile.write(body)

        def serve_file(self, path, content_type=None):
            if not path.is_file():
                return self.respond({'error': 'Fichier indisponible.'}, 404)
            self.send_headers(200, content_type or mimetypes.guess_type(str(path))[0] or 'application/octet-stream', path.stat().st_size)
            with path.open('rb') as source:
                shutil.copyfileobj(source, self.wfile)

        def do_GET(self):
            path = unquote(urlsplit(self.path).path)
            if path == '/api/session':
                return self.respond(session)
            if path == '/api/annotations':
                try:
                    return self.respond(store.load())
                except (ValueError, OSError) as exc:
                    return self.respond({'error': str(exc)}, 409)
            if path == '/documents/programme.pdf':
                return self.serve_file(pdf, 'application/pdf')
            if path in ['/', '/index.html', '/app.js', '/app.css']:
                return self.serve_file(STATIC / ('index.html' if path == '/' else path[1:]))
            if path.startswith('/assets/'):
                target = (STATIC / path.lstrip('/')).resolve()
                if target.is_relative_to((STATIC / 'assets').resolve()):
                    return self.serve_file(target)
            self.respond({'error': 'Ressource inconnue.'}, 404)

        def do_POST(self):
            if urlsplit(self.path).path != '/api/annotations':
                return self.respond({'error': 'Route inconnue.'}, 404)
            origin = self.headers.get('Origin')
            if origin and origin not in ['http://' + self.headers.get('Host', ''), 'https://' + self.headers.get('Host', '')]:
                return self.respond({'error': 'Origine non autorisée.'}, 403)
            if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                return self.respond({'error': 'JSON requis.'}, 415)
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 256000:
                    return self.respond({'error': 'Requête trop volumineuse ou vide.'}, 413)
                data = json.loads(self.rfile.read(length))
                if not isinstance(data, dict):
                    raise InvalidReview('Objet JSON requis.')
                return self.respond({'review': store.save(data)})
            except (InvalidReview, ValueError, TypeError, KeyError) as exc:
                return self.respond({'error': str(exc)}, 422)
            except OSError:
                return self.respond({'error': 'Enregistrement impossible ; exportez vos notes depuis le navigateur.'}, 500)

    return ThreadingHTTPServer((host, port), Handler)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--session', type=Path, required=True)
    parser.add_argument('--annotations', type=Path, required=True)
    parser.add_argument('--pdf', type=Path, required=True)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8081)
    args = parser.parse_args()
    server = make_server(args.session, args.annotations, args.pdf, args.host, args.port)
    print(f'Atelier de relecture : http://{args.host}:{args.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
