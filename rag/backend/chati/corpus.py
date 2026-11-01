import hashlib
import json
from pathlib import Path


class Corpus:
    def __init__(self, directory: Path, enrichment: bool = True):
        self.rows: list[dict] = []
        digest = hashlib.sha256()
        for filename in ["mesures.jsonl", "annexes.jsonl"]:
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

    def index_text(self, row: dict) -> str:
        alias = self.aliases.get(row['id'])
        return f"{row['type']} : {row['section']} > {row['sous_section']}\n{row['texte']}" + (f"\nAutres formulations : {alias}" if alias else "")

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
                        kind = 'MESURES' if key[0] else 'ANNEXES (lexique, abréviations, lois : jamais des mesures)'
                        lines.append(f"\n# {kind} — {row['section']}")
                    lines.append(f"## {row['sous_section']}")
                    group = key
                lines.append(f"{row['id']} {row['texte']}")
            self._full_context = "\n".join(lines).strip()
        return self._full_context

    def expand(self, ids: list[str], limit: int = 14) -> list[dict]:
        selected = []
        for identifier in ids:
            dependencies = []
            if identifier == "s03-ss01-m015":
                dependencies.append("s03-ss01-m014")
            if identifier.startswith("a01-ss01-b") and 3 <= int(identifier.rsplit("b", 1)[1]) <= 7:
                dependencies.append("a01-ss01-b002")
            for dependency in dependencies + [identifier]:
                if dependency in self.by_id and dependency not in selected and len(selected) < limit:
                    selected.append(dependency)
        return [self.by_id[i] for i in selected]

    def public_source(self, identifier: str) -> dict:
        row = self.by_id[identifier]
        pages = row.get("verification_pdf", {}).get("pages", [])
        anchor = row["source"].get("ancre_sous_section")
        return {"id": identifier, "type": row["type"], "section": row["section"],
                "subsection": row["sous_section"], "text": row["texte"], "pages": pages,
                "corpus_version": self.version, "document_label": "Résumé du programme fourni",
                "source_url": row["source_url"] + (f"#{anchor}" if anchor else ""),
                "pdf_url": "/documents/programme.pdf" + (f"#page={pages[0]}" if pages else "")}
