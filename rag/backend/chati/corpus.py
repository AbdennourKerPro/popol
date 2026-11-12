import hashlib
import json
from pathlib import Path


class Corpus:
    def __init__(self, directory: Path, enrichment: bool = True):
        self.rows: list[dict] = []
        digest = hashlib.sha256()
        for filename in ["mesures.jsonl", "textes.jsonl"]:
            content = (directory / filename).read_bytes()
            digest.update(filename.encode() + b"\0" + content)
            self.rows.extend(json.loads(line) for line in content.decode().splitlines() if line.strip())
        self.version = digest.hexdigest()
        self.by_id = {row["id"]: row for row in self.rows}
        # Index-only paraphrases: never shown, cited or sent to the generator.
        self.aliases: dict[str, str] = {}
        self.enrichment_version = ""
        path = directory / "enrichment.jsonl"
        if enrichment and path.is_file():
            content = path.read_bytes()
            self.aliases = {r["id"]: r["alias"] for r in map(json.loads, content.decode().splitlines()) if r["id"] in self.by_id}
            self.enrichment_version = hashlib.sha256(content).hexdigest()
        if len(self.by_id) != len(self.rows):
            raise ValueError("Identifiants de sources dupliqués")
        # Optional audience annotations (scripts/sync_annotations.py). They only orient the
        # ranking for a declared profile, so they stay out of the corpus version.
        self.publics: dict[str, str] = {}
        self.publics_by_id: dict[str, set[str]] = {}
        self.themes_by_id: dict[str, list[str]] = {}
        if (directory / "publics.json").is_file():
            self.publics = json.loads((directory / "publics.json").read_text(encoding="utf-8"))
        if (directory / "annotations.jsonl").is_file():
            for line in (directory / "annotations.jsonl").read_text(encoding="utf-8").splitlines():
                if line.strip() and (entry := json.loads(line))["id"] in self.by_id:
                    if entry.get("publics"):
                        self.publics_by_id[entry["id"]] = set(entry["publics"])
                    self.themes_by_id[entry["id"]] = entry.get("themes", [])

    def index_text(self, row: dict) -> str:
        alias = self.aliases.get(row['id'])
        parent = self.by_id.get(row.get('parent_id'))
        return f"{row['type']} : {row['section']} > {row['sous_section']}\n" + (f"{parent['texte']}\n" if parent else "") + row['texte'] + (f"\nAutres formulations : {alias}" if alias else "")

    def full_context(self) -> str:
        """Whole corpus as one compact, stable text (cacheable prompt prefix).

        Section and subsection titles are written once per group instead of on
        every row. Row order and text are untouched, and the output is identical
        between calls so that the provider can cache it.
        """
        if getattr(self, '_full_context', None) is None:
            lines, group = [], None
            for row in self.rows:
                key = (row['type'] == 'mesure', row['section'], row['sous_section'])
                if key != group:
                    if group is None or key[:2] != group[:2]:
                        kind = 'MESURES' if key[0] else 'TEXTES EXPLICATIFS (contexte et raisons : jamais des mesures)'
                        lines.append(f"\n# {kind} — {row['section']}")
                    lines.append(f"## {row['sous_section']}")
                    group = key
                lines.append(f"{row['id']} {row['texte']}")
            self._full_context = "\n".join(lines).strip()
        return self._full_context

    def expand(self, ids: list[str], limit: int = 14) -> list[dict]:
        """Retrieved rows, each sub-measure preceded by the measure it details.

        A parent measure only announces its sub-measures: they fill the remaining slots.
        """
        selected = []
        def add(identifier):
            if identifier in self.by_id and identifier not in selected and len(selected) < limit:
                selected.append(identifier)
        for identifier in ids:
            parent = self.by_id.get(identifier, {}).get("parent_id")
            if parent:
                add(parent)
            add(identifier)
        for identifier in list(selected):
            for child in self.by_id[identifier].get("sous_mesures_ids", []):
                add(child)
        return [self.by_id[i] for i in selected]

    def public_source(self, identifier: str) -> dict:
        row = self.by_id[identifier]
        return {"id": identifier, "type": row["type"], "categorie": row.get("categorie"), "section": row["section"],
                "subsection": row["sous_section"], "text": row["texte"], "corpus_version": self.version,
                "document_label": "L’Avenir en commun, programme officiel", "source_url": row["source_url"]}
