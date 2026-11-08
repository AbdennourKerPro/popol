#!/usr/bin/env python3
"""Extraction du livre depuis son sommaire HTML, sans navigateur."""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import logging
import re
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urldefrag, urljoin, urlsplit

import requests
from bs4 import BeautifulSoup, Tag
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE = 'https://melenchon2027.fr/programme/livre/'
LOG = logging.getLogger('scraper')


def text(node):
    # Aucun séparateur artificiel entre les balises inline (6<sup>e</sup>).
    # Les espaces Unicode, accents et ponctuations de la source sont conservés.
    return node.get_text(separator='', strip=False).strip()


def uid(*values):
    return hashlib.sha256('\0'.join(map(str, values)).encode()).hexdigest()[:24]


def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def content(node):
    return {'texte': text(node), 'html': str(node)}


class Client:
    def __init__(self, output, delay, timeout, retries, refresh):
        self.cache = output / 'sources'
        self.cache.mkdir(parents=True, exist_ok=True)
        self.delay, self.timeout, self.refresh = delay, timeout, refresh
        self.last = 0.0
        self.pages, self.errors = {}, {}
        self.session = requests.Session()
        self.session.headers['User-Agent'] = 'ProgrammeArchive/1.0 (Python requests; public programme archival)'
        retry = Retry(total=retries, connect=retries, read=retries, status=retries,
                      backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504],
                      allowed_methods=['GET'], respect_retry_after_header=True)
        self.session.mount('https://', HTTPAdapter(max_retries=retry))

    def get(self, url):
        url = urldefrag(url)[0].rstrip('/') + '/'
        if url in self.pages:
            return self.pages[url]['soup']
        path = self.cache / (uid(url) + '.html')
        try:
            cached = path.exists() and not self.refresh
            if cached:
                raw = path.read_bytes()
            else:
                time.sleep(max(0, self.delay - (time.monotonic() - self.last)))
                try:
                    response = self.session.get(url, timeout=self.timeout)
                    response.raise_for_status()
                    if 'text/html' not in response.headers.get('Content-Type', ''):
                        raise ValueError('Réponse non HTML')
                    raw = response.content
                finally:
                    self.last = time.monotonic()
                path.write_bytes(raw)
            soup = BeautifulSoup(raw, 'html.parser', from_encoding='utf-8')
            if soup.select_one('main') is None:
                raise ValueError('Élément main absent')
            self.pages[url] = {'soup': soup, 'url': url, 'fichier': str(path.name),
                               'sha256': hashlib.sha256(raw).hexdigest(), 'cache': cached}
            LOG.info('%s %s', 'CACHE' if cached else 'GET', url)
            return soup
        except (requests.RequestException, ValueError, OSError) as exc:
            self.errors[url] = str(exc)
            LOG.error('%s: %s', url, exc)
            return None


def discover(soup, url):
    nav = soup.select_one('main nav.tdm')
    if nav is None:
        raise ValueError(f'Sommaire absent: {url}')
    return nav


def measure_nodes(section):
    # Une mesure clé peut contenir une liste : son bloc entier est une mesure.
    return [n for n in section.select('.mesure-cle, li.mesure, li.sous_mesure')
            if not any('mesure-cle' in p.get('class', []) or
                       (p.name == 'li' and 'mesure' in p.get('class', []))
                       for p in n.parents if p is not section)]


def extract_section(section, chapter_url, part, chapter, number):
    title = section.select_one('h3.section-title')
    if title is None or not title.get('id'):
        raise ValueError(f'Titre/ancre de sous-section absent: {chapter_url}')
    anchor = title['id']
    source = chapter_url + '#' + anchor
    nodes = measure_nodes(section)
    measures = []
    node_ids = {id(node): uid(source, i) for i, node in enumerate(nodes, 1)}
    for i, node in enumerate(nodes, 1):
        key = 'mesure-cle' in node.get('class', [])
        submeasure = 'sous_mesure' in node.get('class', [])
        parent_id = None
        if submeasure:
            wrapper = node.find_parent('ul').parent
            parent = wrapper.find_previous_sibling('li', class_='mesure')
            if parent is None:
                parent = node.find_parent('li', class_='mesure')
            parent_id = node_ids.get(id(parent))
            if parent_id is None:
                raise ValueError(f'Sous-mesure sans parent: {source}')
        copy = BeautifulSoup(str(node), 'html.parser').find()
        label = copy.find(re.compile('^h[1-6]$')) if key else None
        if label:
            label.extract()
        value = text(copy)
        if not value:
            raise ValueError(f'Mesure vide: {source}')
        measures.append({'id': uid(source, i), 'type': 'cle' if key else ('sous_mesure' if submeasure else 'complementaire'),
                         'parent_id': parent_id, 'sous_mesures_ids': [],
                         'texte': value, 'html': str(node), 'url_source': source,
                         'ordre': i, 'partie': part['titre'], 'partie_id': part['id'],
                         'chapitre': chapter['titre'], 'chapitre_id': chapter['id'],
                         'sous_section': text(title), 'sous_section_id': anchor})
    for measure in measures:
        if measure['parent_id']:
            next(m for m in measures if m['id'] == measure['parent_id'])['sous_mesures_ids'].append(measure['id'])
    explanatory = BeautifulSoup(str(section), 'html.parser').find()
    for n in explanatory.select('.mesure-cle, li.mesure, li.sous_mesure, h3.section-title'):
        n.decompose()
    blocks = [content(n) for n in explanatory.find_all(
        ['p', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'table', 'ul', 'ol'], recursive=False)
        if text(n)]
    return {'id': anchor, 'titre': text(title), 'ordre': number, 'url_source': source,
            'textes_explicatifs': blocks, 'texte_integral': text(section),
            'html': str(section), 'mesures': measures}


def run(args):
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    client = Client(output, args.delay, args.timeout, args.retries, args.refresh)
    expected, extracted, structure_errors = {BASE}, set(), []
    section_expected, section_extracted = set(), set()
    chapters_expected, chapters_extracted = set(), set()
    rows = []
    result = {'schema_version': '1.0', 'url_source': BASE,
              'extrait_le': datetime.now(timezone.utc).isoformat(),
              'convention_texte': 'Texte DOM sans reformulation; espaces Unicode conservés; blancs de bord retirés. HTML et réponses sources archivés.',
              'introductions': [], 'parties': []}
    toc = client.get(BASE)
    if toc is None:
        raise RuntimeError('Impossible de charger le sommaire')
    nav = discover(toc, BASE)
    result['sommaire_html'] = str(nav)
    extracted.add(BASE)
    groups = nav.select(':scope > div.partie')
    if not groups:
        raise ValueError('Aucune partie découverte')
    for group in groups:
        head = group.select_one('h2 a[href]')
        if head is None:
            structure_errors.append('Entrée sans titre dans le sommaire')
            continue
        url = urljoin(BASE, head['href']).rstrip('/') + '/'
        expected.add(url)
        chapter_links = group.select(':scope > a[href]')
        chapters_expected.update(urljoin(BASE, a['href']).rstrip('/') + '/' for a in chapter_links)
        expected.update(chapters_expected)
        soup = client.get(url)
        if not chapter_links:
            if soup:
                main = soup.select_one('main')
                result['introductions'].append({'titre': text(head), 'url_source': url,
                    **content(main), 'blocs': [content(n) for n in main.select('section > *')]})
                extracted.add(url)
            continue
        part = {'id': uid(url), 'titre': text(head), 'url_source': url,
                'textes_explicatifs': [], 'chapitres': []}
        result['parties'].append(part)
        part_nav = None
        if soup:
            main = soup.select_one('main')
            part.update({'html': str(main), 'texte_integral': text(main)})
            part['textes_explicatifs'] = [content(n) for n in main.select(':scope > section')]
            try:
                part_nav = discover(soup, url)
                extracted.add(url)
            except ValueError as exc:
                structure_errors.append(str(exc))
        links = {urljoin(BASE, a['href']).rstrip('/') + '/': a for a in chapter_links}
        if part_nav:
            for a in part_nav.select('div.chapitre > h2 a[href]'):
                chapter_url = urljoin(BASE, a['href']).rstrip('/') + '/'
                links.setdefault(chapter_url, a)
                chapters_expected.add(chapter_url)
                expected.add(chapter_url)
            for a in part_nav.select('a[href*="#"]'):
                section_expected.add(urljoin(BASE, a['href']).replace('/#', '#'))
        for chapter_url, a in links.items():
            chapter = {'id': uid(chapter_url), 'titre': text(a), 'url_source': chapter_url,
                       'sous_sections': []}
            part['chapitres'].append(chapter)
            page = client.get(chapter_url)
            if page is None:
                continue
            main = page.select_one('main.chapitre')
            if main is None:
                structure_errors.append(f'Conteneur chapitre absent: {chapter_url}')
                continue
            chapter.update({'html': str(main), 'texte_integral': text(main)})
            sections = main.select('.chapitre_sections > section')
            if not sections:
                structure_errors.append(f'Chapitre sans sous-section: {chapter_url}')
                continue
            found_nodes = 0
            for i, section in enumerate(sections, 1):
                try:
                    sub = extract_section(section, chapter_url, part, chapter, i)
                    chapter['sous_sections'].append(sub)
                    section_extracted.add(sub['url_source'].replace('/#', '#'))
                    rows.extend(sub['mesures'])
                    found_nodes += len(sub['mesures'])
                except ValueError as exc:
                    structure_errors.append(str(exc))
            dom_count = len(measure_nodes(main))
            if found_nodes != dom_count:
                structure_errors.append(f'Mesures DOM/export différentes: {chapter_url}: {dom_count}/{found_nodes}')
            # Détecte aussi les éléments de liste non classés qui pourraient être oubliés.
            unknown = [str(n) for n in main.select('.chapitre_sections li')
                       if not n.find_parent(class_='mesure-cle') and
                       not {'mesure', 'sous_mesure'}.intersection(n.get('class', [])) and
                       not (n.find('li', class_='sous_mesure') and not ''.join(
                           str(t) for t in n.find_all(string=True, recursive=False)).strip()) and
                       not n.find_parent('li', class_='mesure')]
            if unknown:
                structure_errors.append({'url': chapter_url, 'listes_non_classees': unknown})
            extracted.add(chapter_url)
            chapters_extracted.add(chapter_url)
    duplicates = defaultdict(list)
    for row in rows:
        duplicates[row['texte']].append(row['id'])
    missing = sorted(expected - extracted)
    missing_sections = sorted(section_expected - section_extracted)
    extra_sections = sorted(section_extracted - section_expected)
    report = {'parties': len(result['parties']), 'chapitres_attendus': len(chapters_expected),
              'chapitres_extraits': len(chapters_extracted), 'sous_sections_attendues': len(section_expected),
              'sous_sections_extraites': len(section_extracted), 'mesures': len(rows),
              'mesures_par_type': dict(Counter(r['type'] for r in rows)),
              'reference_indicative_mesures': args.expected_measures,
              'ecart_reference': len(rows) - args.expected_measures,
              'pages_attendues': len(expected), 'pages_extraites': len(extracted),
              'pages_non_extraites': missing, 'sous_sections_non_extraites': missing_sections,
              'sous_sections_absentes_du_sommaire': extra_sections,
              'erreurs_reseau': client.errors, 'erreurs_structure': structure_errors,
              'ids_dupliques': [k for k, v in Counter(r['id'] for r in rows).items() if v > 1],
              'textes_identiques': [{'texte': k, 'ids': v} for k, v in duplicates.items() if len(v) > 1]}
    report['extraction_complete'] = bool(rows) and not any([
        missing, missing_sections, extra_sections, structure_errors, client.errors, report['ids_dupliques']])
    report['avertissements'] = []
    if report['ecart_reference']:
        report['avertissements'].append('Le total diffère de la référence indicative; aucun contenu ajouté ni supprimé pour atteindre ce chiffre.')
    result['controle_exhaustivite'] = report
    dump(output / 'programme_complet.json', result)
    dump(output / 'rapport_exhaustivite.json', report)
    dump(output / 'sources' / 'manifest.json', [
        {k: v for k, v in p.items() if k != 'soup'} for p in client.pages.values()])
    with (output / 'mesures.jsonl').open('w', encoding='utf-8') as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + '\n')
    fields = ['id', 'type', 'texte', 'url_source', 'ordre', 'parent_id', 'sous_mesures_ids', 'partie_id', 'partie',
              'chapitre_id', 'chapitre', 'sous_section_id', 'sous_section', 'html']
    with (output / 'mesures.csv').open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows({**r, 'sous_mesures_ids': json.dumps(r['sous_mesures_ids'])} for r in rows)
    LOG.info('Bilan: %s chapitres, %s sous-sections, %s mesures; complet=%s. Voir rapport_exhaustivite.json.',
             len(chapters_extracted), len(section_extracted), len(rows), report['extraction_complete'])
    return 0 if report['extraction_complete'] else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path(__file__).parent / 'outputs')
    parser.add_argument('--delay', type=float, default=1.0, help='Pause minimale entre requêtes (s)')
    parser.add_argument('--timeout', type=float, default=30)
    parser.add_argument('--retries', type=int, default=4)
    parser.add_argument('--expected-measures', type=int, default=1069, help='Référence indicative, pas un objectif imposé')
    parser.add_argument('--refresh', action='store_true', help='Retélécharger les sources au lieu du cache local')
    args = parser.parse_args()
    if args.delay < 0 or args.timeout <= 0 or args.retries < 0:
        parser.error('delay/retries doivent être positifs ou nuls, timeout strictement positif')
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
    try:
        return run(args)
    except (RuntimeError, ValueError, OSError) as exc:
        LOG.error('%s', exc)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
