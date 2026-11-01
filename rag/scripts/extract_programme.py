#!/usr/bin/env python3
"""Extract the archived published Google Doc without third-party dependencies.

Run from any directory: python scripts/extract_programme.py
One source paragraph beginning with a dash is one measure; no paraphrasing.
"""

import argparse
from collections import Counter
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE_URL = "https://docs.google.com/document/d/e/2PACX-1vTBSBoatwd0abhiVuok2s0IOQmbuf_QImbB0SrwSZ63w9PcSqfdkcWQxszNhSWlZxfkML7XHOiWAm9o/pub"
BLOCK_TAGS = {"h1", "h2", "h3", "p", "li"}
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class Node:
    def __init__(self, tag="root", attrs=(), parent=None):
        self.tag, self.attrs, self.parent = tag, dict(attrs), parent
        self.children = []

    def text(self):
        return "".join(c if isinstance(c, str) else c.text() for c in self.children)

    def walk(self):
        yield self
        for c in self.children:
            if isinstance(c, Node):
                yield from c.walk()


class DocumentParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = self.current = Node()

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.current)
        self.current.children.append(node)
        if tag == "br":
            node.children.append("\n")
        if tag not in VOID_TAGS:
            self.current = node

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID_TAGS:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        node = self.current
        while node.parent is not None:
            if node.tag == tag:
                self.current = node.parent
                return
            node = node.parent

    def handle_data(self, data):
        self.current.children.append(data)


def clean(text):
    return re.sub(r"\s+", " ", text).strip()


def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def extract(source):
    parser = DocumentParser()
    parser.feed(source.read_text(encoding="utf-8"))
    contents = [n for n in parser.root.walk() if n.attrs.get("id") == "contents"]
    if len(contents) != 1:
        raise ValueError("Expected exactly one #contents document container")
    # Ignore list-item wrappers around headings/paragraphs, avoiding double counts.
    blocks = [n for n in contents[0].walk() if n.tag in BLOCK_TAGS
              and not any(c.tag in BLOCK_TAGS for c in list(n.walk())[1:])
              and clean(n.text())]
    result = {
        "schema_version": "1.1",
        "titre": clean(blocks[0].text()),
        "nature_source": "Résumé fourni par l’utilisateur ; statut officiel non vérifié",
        "source": {"url": SOURCE_URL, "fichier_html": str(source.relative_to(ROOT)) if source.is_relative_to(ROOT) else str(source),
                   "sha256": hashlib.sha256(source.read_bytes()).hexdigest()},
        "regle_extraction": "Une mesure correspond à un paragraphe source commençant par un tiret. Seuls le tiret initial et les espaces sont normalisés dans texte ; texte_source est conservé.",
        "sections": [], "annexes": [],
    }
    section = subsection = appendix = None
    consumed, unclassified, preamble = [], [], []
    for index, node in enumerate(blocks, 1):
        raw, text = node.text(), clean(node.text())
        locator = {"bloc_html": index, "balise": node.tag}
        if node.attrs.get("id"):
            locator["ancre_html"] = node.attrs["id"]
        if node.tag == "h1":
            match = re.fullmatch(r"([1-8])\.\s+(.+)", text)
            subsection = None
            if match:
                if appendix:
                    raise ValueError("Programme section found after an appendix")
                section = {"id": f"s{int(match[1]):02d}", "numero": int(match[1]), "titre": match[2],
                           "source": locator, "nombre_mesures_annonce": None, "sous_sections": []}
                result["sections"].append(section)
            else:
                section = None
                appendix = {"id": f"a{len(result['annexes']) + 1:02d}", "titre": text,
                            "source": locator, "sous_sections": []}
                result["annexes"].append(appendix)
        elif node.tag == "h2":
            owner = section or appendix
            if not owner:
                unclassified.append({**locator, "texte": text})
                continue
            subsection = {"id": f"{owner['id']}-ss{len(owner['sous_sections']) + 1:02d}",
                          "titre": text, "source": locator}
            subsection["mesures" if section else "blocs"] = []
            owner["sous_sections"].append(subsection)
        elif section:
            count = re.fullmatch(r"\((\d+) mesures\)", text)
            if count:
                section["nombre_mesures_annonce"] = int(count[1])
            elif node.tag == "p" and re.match(r"^[-–—]\s+", text) and subsection:
                measure = {"id": f"{subsection['id']}-m{len(subsection['mesures']) + 1:03d}",
                           "texte": re.sub(r"^[-–—]\s+", "", text), "texte_source": raw,
                           "source": {**locator, "ancre_sous_section": subsection['source'].get('ancre_html')}}
                subsection["mesures"].append(measure)
                consumed.append(index)
            else:
                unclassified.append({**locator, "texte": text})
        elif appendix:
            if not subsection:
                unclassified.append({**locator, "texte": text})
                continue
            block = {"id": f"{subsection['id']}-b{len(subsection['blocs']) + 1:03d}",
                     "texte": text, "texte_source": raw,
                     "source": {**locator, "ancre_sous_section": subsection['source'].get('ancre_html')}}
            if node.tag == "li":
                parent = node.parent
                level = re.search(r"lst-kix_\S+-(\d+)(?:\s|$)", parent.attrs.get("class", ""))
                block["niveau_liste_source"] = int(level[1]) if level else None
            subsection["blocs"].append(block)
        else:
            preamble.append({**locator, "texte": text})
    result["preambule"] = preamble
    flat = []
    for sec in result["sections"]:
        for sub in sec["sous_sections"]:
            for m in sub["mesures"]:
                flat.append({**m, "type": "mesure", "section_id": sec["id"], "section": sec["titre"],
                             "sous_section_id": sub["id"], "sous_section": sub["titre"],
                             "texte_indexation": f"{sec['titre']} > {sub['titre']}\n{m['texte']}",
                             "source_url": SOURCE_URL, "source_sha256": result["source"]["sha256"]})
        sec["nombre_mesures_extrait"] = sum(len(s["mesures"]) for s in sec["sous_sections"])
    # Enforce coverage of every source measure paragraph in programme sections.
    first = next(i for i, n in enumerate(blocks, 1) if n.tag == "h1")
    end = next(i for i, n in enumerate(blocks, 1) if n.tag == "h1" and clean(n.text()) == "LEXIQUE")
    expected = [i for i, n in enumerate(blocks, 1) if first <= i < end and n.tag == "p" and re.match(r"^[-–—]\s+", clean(n.text()))]
    if expected != consumed or unclassified:
        raise ValueError(f"Incomplete extraction: {len(expected)} measure paragraphs, {len(consumed)} consumed; unclassified={unclassified}")
    if [s["numero"] for s in result["sections"]] != list(range(1, 9)):
        raise ValueError("Expected the eight programme sections in order")
    if any(not sub["mesures"] for sec in result["sections"] for sub in sec["sous_sections"]):
        raise ValueError("Empty programme subsection")
    if any("\ufffd" in m["texte"] for m in flat):
        raise ValueError("Replacement character in HTML measure text")
    duplicates = [text for text, count in Counter(m["texte"] for m in flat).items() if count > 1]
    report = {"blocs_html_non_vides": len(blocks), "paragraphes_mesures_source": len(expected),
              "mesures_extraites": len(flat), "sous_sections": sum(len(s["sous_sections"]) for s in result["sections"]),
              "blocs_non_classes": unclassified, "textes_mesures_repetes": duplicates,
              "comptages": [{"section": s["titre"], "annonce": s["nombre_mesures_annonce"], "extrait": s["nombre_mesures_extrait"],
                             "ecart": s["nombre_mesures_extrait"] - s["nombre_mesures_annonce"]} for s in result["sections"]],
              "limite": "Les nombres annoncés ne définissent pas le découpage. Une puce peut contenir plusieurs propositions. Aucune mesure n’est inventée pour atteindre ces nombres."}
    return result, flat, report


def markdown(data):
    lines = [f"# {data['titre']}", "", f"Source : {SOURCE_URL}", "", data["regle_extraction"], ""]
    for sec in data["sections"]:
        lines += [f"## {sec['numero']}. {sec['titre']}", "", f"{sec['nombre_mesures_extrait']} mesures extraites ; {sec['nombre_mesures_annonce']} annoncées dans la source.", ""]
        for sub in sec["sous_sections"]:
            lines += [f"### {sub['titre']}", ""]
            lines += [f"- **{m['id']}** — {m['texte']}" for m in sub["mesures"]]
            lines.append("")
    for appendix in data["annexes"]:
        lines += [f"## Annexe : {appendix['titre']}", ""]
        for sub in appendix["sous_sections"]:
            lines += [f"### {sub['titre']}", ""]
            for block in sub["blocs"]:
                lines += [("- " if block["source"]["balise"] == "li" else "") + f"**{block['id']}** — " + block["texte"], ""]
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--html", type=Path, default=ROOT / "data/source/programme-lfi.html")
    ap.add_argument("--output", type=Path, default=ROOT / "data/structured")
    args = ap.parse_args()
    data, flat, report = extract(args.html.resolve())
    args.output.mkdir(parents=True, exist_ok=True)
    dump(args.output / "programme.json", data)
    (args.output / "mesures.jsonl").write_text("".join(json.dumps(m, ensure_ascii=False) + "\n" for m in flat), encoding="utf-8")
    annexes = [{**b, "type": "annexe_bloc", "section_id": a['id'], "section": a['titre'],
                "sous_section_id": s['id'], "sous_section": s['titre'],
                "source_url": data['source']['url'], "source_sha256": data['source']['sha256']}
               for a in data['annexes'] for s in a['sous_sections'] for b in s['blocs']]
    (args.output / "annexes.jsonl").write_text("".join(json.dumps(b, ensure_ascii=False) + "\n" for b in annexes), encoding="utf-8")
    (args.output / "programme.md").write_text(markdown(data), encoding="utf-8")
    dump(args.output / "extraction-report.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
