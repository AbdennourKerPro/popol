#!/usr/bin/env python3
"""Compare extracted measures with PDF text using Poppler (no OCR or LLM).

Matching tolerates accents/punctuation/spacing and PDF replacement glyphs only.
An unmatched measure is reported for review, never silently rewritten.
"""
import argparse
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unicodedata
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
NS = {"h": "http://www.w3.org/1999/xhtml"}


def tokens(text):
    return re.findall(r"[a-z0-9\ufffd]+", "".join(c for c in unicodedata.normalize("NFKD", text.lower()) if not unicodedata.combining(c)))


def verify(pdf, rows, start_page=1):
    with tempfile.TemporaryDirectory(prefix="popol-pdf-") as tmp:
        bbox = Path(tmp) / "bbox.html"
        subprocess.run(["pdftotext", "-bbox-layout", str(pdf), str(bbox)], check=True, capture_output=True)
        pages = ET.parse(bbox).getroot().findall(".//h:page", NS)
    def signature(word):
        return (word.text, round(float(word.attrib["xMin"]), 1), round(float(word.attrib["yMin"]), 1))
    # This archived Firefox print has fixed Google banners. Learn their exact
    # text + positions on the cover; do not crop the document's heading area.
    banners = {signature(w) for w in pages[0].findall(".//h:word", NS) if float(w.attrib["yMin"]) < 120}
    corpus, page_numbers = [], []
    for pn, page in enumerate(pages, 1):
        if pn < start_page:
            continue
        words = []
        for word in page.findall(".//h:word", NS):
            y = float(word.attrib["yMin"])
            if y < 15 or y > float(page.attrib["height"]) - 27 or signature(word) in banners:
                continue
            words.append(word)
        # Mixed font spans are emitted in separate Poppler blocks; recover
        # visual reading order rather than trusting XML block order.
        lines = []
        for word in sorted(words, key=lambda w: (float(w.attrib["yMin"]), float(w.attrib["xMin"]))):
            y = float(word.attrib["yMin"])
            if not lines or abs(y - lines[-1][0]) > 3:
                lines.append((y, []))
            lines[-1][1].append(word)
        for _, line in lines:
            for word in sorted(line, key=lambda w: float(w.attrib["xMin"])):
                ts = tokens(word.text or "")
                corpus.extend(ts)
                page_numbers.extend([pn] * len(ts))
    positions = defaultdict(list)
    for i, token in enumerate(corpus):
        positions[token].append(i)
    results = []
    previous_start = -1
    for row in rows:
        source_tokens = tokens(row["texte"])
        anchors = [i for i in range(min(12, len(source_tokens))) if positions[source_tokens[i]]]
        matches = []
        if anchors:
            # A rare source word may exist only in the lexicon while its PDF
            # occurrence in this measure has a broken ligature. Use all anchors.
            starts = {pos - anchor for anchor in anchors for pos in positions[source_tokens[anchor]]}
            for start in sorted(starts):
                if start < 0:
                    continue
                window = corpus[start:start + len(source_tokens)]
                if len(window) != len(source_tokens):
                    continue
                if all(a == b or ("\ufffd" in b and re.fullmatch(re.escape(b).replace("\ufffd", "[a-z0-9]+"), a)) for a, b in zip(source_tokens, window)):
                    matches.append({"position_token": start, "pages_pdf": sorted(set(page_numbers[start:start + len(source_tokens)])),
                                    "glyphes_pdf_indetermines": sum(t.count("\ufffd") for t in window)})
        # The HTML measures follow PDF order. Repeated short phrases elsewhere
        # (including in the lexicon) are resolved by taking the next occurrence.
        candidates = [m for m in matches if m["position_token"] > previous_start]
        selected = min(candidates, key=lambda m: m["position_token"]) if candidates else None
        if selected:
            previous_start = selected["position_token"]
        result = {"id": row["id"], "statut": "correspondance_normalisee" if selected else "a_verifier",
                  "correspondance": selected, "nombre_occurrences": len(matches)}
        if not selected:
            result["texte_html"] = row["texte"]
        results.append(result)
    matched = sum(r["statut"] == "correspondance_normalisee" for r in results)
    return {"pdf": str(pdf.relative_to(ROOT)) if pdf.is_relative_to(ROOT) else str(pdf),
            "pdf_sha256": hashlib.sha256(pdf.read_bytes()).hexdigest(), "pages_pdf": len(pages),
            "mesures_comparees": len(rows), "mesures_correspondantes": matched,
            "mesures_a_verifier": len(rows) - matched,
            "mesures_correspondantes_sans_glyphe_indetermine": sum(r["correspondance"] is not None and r["correspondance"]["glyphes_pdf_indetermines"] == 0 for r in results),
            "mesures_correspondantes_avec_glyphes_indetermines": sum(r["correspondance"] is not None and r["correspondance"]["glyphes_pdf_indetermines"] > 0 for r in results),
            "methode": "Comparaison intégrale des tokens de chaque mesure, après normalisation des accents, espaces et ponctuation. Les caractères U+FFFD du PDF sont des jokers de lettres/chiffres ; les variantes correspondantes sont comptées. Les bandeaux récurrents sont retirés par texte et coordonnées.",
            "limite": "Contrôle du contenu des mesures uniquement : ni identité binaire des documents, ni validation de la véracité ou du statut officiel du résumé. Une correspondance avec glyphe indéterminé ne valide pas ce glyphe.",
            "mesures": results}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--pdf", type=Path, default=ROOT / "assets/Programme-Mélenchon-LFI.pdf")
    ap.add_argument("--measures", type=Path, default=ROOT / "data/structured/mesures.jsonl")
    ap.add_argument("--output", type=Path, default=ROOT / "data/structured/pdf-verification.json")
    ap.add_argument("--start-page", type=int, default=1, help="First physical PDF page to search (41 for annexes)")
    args = ap.parse_args()
    rows = [json.loads(line) for line in args.measures.read_text(encoding="utf-8").splitlines() if line.strip()]
    report = verify(args.pdf.resolve(), rows, args.start_page)
    if any(r.get('type') == 'annexe_bloc' for r in rows):
        report['premiere_page_recherche'] = args.start_page
        report['limite'] = "Contrôle des blocs d’annexe, distincts des propositions. Les glyphes indéterminés restent non validés ; aucune vérification de la véracité ni du statut officiel du résumé."
        # Preserve the existing measure report contract; use accurate unit names
        # for the separate appendix report.
        report = {k.replace('mesures', 'blocs_annexe'): v for k, v in report.items()}
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    matches = report.get('mesures', report.get('blocs_annexe'))
    for row, match in zip(rows, matches):
        row["verification_pdf"] = {"fichier": report["pdf"], "sha256": report["pdf_sha256"],
                                   "statut": match["statut"], "pages": match["correspondance"]["pages_pdf"] if match["correspondance"] else [],
                                   "glyphes_indetermines": match["correspondance"]["glyphes_pdf_indetermines"] if match["correspondance"] else None}
    args.measures.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k not in {'mesures', 'blocs_annexe'}}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
