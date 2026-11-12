"""In-memory cache of verified answers to standalone questions.

The free provider allows about sixty questions a day for all testers: the same home-page
question asked again is served from here, without a model call and without using a quota.
Only answers that passed the reference check (mode generated, status answered or partial)
are stored; a key binds the question to the corpus version, the model and the profile, so
that a new corpus or model never serves an older answer.
"""
from collections import OrderedDict
import hashlib
import json
from pathlib import Path
import unicodedata

# Fields that describe one request rather than the answer: never stored, recomputed on a hit.
VOLATILE = ('request_id', 'quota', 'latency_ms', 'usage', 'planner_usage', 'research_usage', 'cached')


def normalize(question: str) -> str:
    """Lower case, no accents, single spaces, no final punctuation: « Retraites ? » ≡ « retraites »."""
    text = unicodedata.normalize('NFKD', question.lower().replace('’', "'"))
    text = ' '.join(''.join(c for c in text if not unicodedata.combining(c)).split())
    return text.rstrip(' ?!.…;:,')


def storable(result: dict) -> dict:
    return {k: v for k, v in result.items() if k not in VOLATILE}


class AnswerCache:
    def __init__(self, size: int):
        self.size = max(0, size)
        self.entries: OrderedDict[str, dict] = OrderedDict()

    @property
    def enabled(self) -> bool:
        return self.size > 0

    def __len__(self):
        return len(self.entries)

    def key(self, question, corpus_version, model, profile=()) -> str:
        fields = [normalize(question), corpus_version, model, sorted(profile)]
        return hashlib.sha256(json.dumps(fields, ensure_ascii=False).encode()).hexdigest()

    def get(self, key) -> dict | None:
        if key not in self.entries:
            return None
        self.entries.move_to_end(key)
        return self.entries[key]

    def put(self, key, result: dict) -> None:
        if not self.enabled:
            return
        self.entries[key] = storable(result)
        self.entries.move_to_end(key)
        while len(self.entries) > self.size:
            self.entries.popitem(last=False)

    def load(self, path: Path, corpus_version, model) -> int:
        """Seed from a JSONL file (scripts/warm_cache.py); entries of another corpus or model are ignored."""
        loaded = 0
        if not self.enabled or not Path(path).is_file():
            return 0
        for line in Path(path).read_text(encoding='utf-8').splitlines():
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            result = entry.get('result') if isinstance(entry, dict) else None
            if (not isinstance(result, dict) or entry.get('corpus_version') != corpus_version or entry.get('model') != model
                    or not isinstance(entry.get('question'), str) or result.get('mode') != 'generated'
                    or result.get('status') not in {'answered', 'partial'}):
                continue
            self.put(self.key(entry['question'], corpus_version, model, entry.get('profile', ())), result)
            loaded += 1
        return loaded
