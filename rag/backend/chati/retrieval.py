from collections import defaultdict
import json
import re
import sqlite3
import unicodedata

import numpy as np

from .config import Settings
from .corpus import Corpus
from .embeddings import OpenAIEmbedder
from .synonyms import expansion

STOPWORDS = set("a au aux avec ce ces cet cette combien comment dans de des du elle elles en est et eux il ils je la le les leur leurs lui ma mais me mes mon ne nos notre nous on ou par pas pour pourquoi que quel quelle quelles quels qui sa sans se ses son sont sur ta te tes ton tu un une vos votre vous y selon resume programme propose propositions explique exactement serait seraient veut peut faire dont aussi".split())


def words(text):
    text = "".join(c for c in unicodedata.normalize("NFKD", text.lower()) if not unicodedata.combining(c))
    return [w for w in re.findall(r"[a-z0-9]+", text) if w not in STOPWORDS and (len(w) > 1 or w.isdigit())]


def query_for_messages(messages):
    current = messages[-1].content
    prior = [m.content for m in messages[:-1] if m.role == 'user'][-1:]
    return current if len(current) > 180 else ' '.join(prior + [current])


class Retriever:
    def __init__(self, corpus: Corpus, settings: Settings, embedder=None):
        self.corpus, self.settings, self.embedder = corpus, settings, embedder
        self.db = sqlite3.connect(":memory:", check_same_thread=False)
        self.db.execute("CREATE VIRTUAL TABLE documents USING fts5(id UNINDEXED, title, body, alias, tokenize='unicode61 remove_diacritics 2')")
        self.db.executemany("INSERT INTO documents VALUES (?,?,?,?)", [(r['id'], r['sous_section'], r['texte'], corpus.aliases.get(r['id'], '')) for r in corpus.rows])
        self.vectors = None
        self.vector_ids = []
        self.index_error = None
        path = settings.index_dir / "embeddings.npz"
        if settings.mode == "hybrid":
            try:
                with np.load(path, allow_pickle=False) as saved:
                    metadata = json.loads(str(saved['metadata'].item()))
                    vectors = saved['vectors'].astype(np.float32)
                    ids = saved['ids'].tolist()
                if (metadata['corpus_version'] != corpus.version or metadata['model'] != settings.effective_embedding_model
                        or metadata.get('enrichment_version', '') != corpus.enrichment_version):
                    raise ValueError("Index incompatible avec le corpus ou le modèle d’embedding")
                if ids != [r['id'] for r in corpus.rows] or vectors.ndim != 2 or len(vectors) != len(ids) or not np.isfinite(vectors).all():
                    raise ValueError("Index sémantique invalide")
                norms = np.linalg.norm(vectors, axis=1, keepdims=True)
                if (norms == 0).any():
                    raise ValueError("Vecteur vide dans l’index")
                self.vectors = vectors / norms
                self.vector_ids = ids
            except (OSError, ValueError, KeyError, json.JSONDecodeError):
                self.index_error = "Index absent ou incompatible. Exécutez la commande d’indexation puis redémarrez Chati."

    @property
    def needs_remote_embeddings(self):
        return self.settings.mode == "hybrid" and self.settings.embedding_provider == "openai"

    @property
    def ready(self):
        return self.settings.mode == "lexical" or self.vectors is not None

    def lexical(self, query: str, count=20):
        terms = words(query)
        if self.settings.synonyms:
            terms += words(" ".join(expansion(query)))
        terms = list(dict.fromkeys(terms))[:40]
        if not terms:
            return []
        expression = " OR ".join(f'"{term}"*' for term in terms)
        return [r[0] for r in self.db.execute("SELECT id FROM documents WHERE documents MATCH ? ORDER BY bm25(documents,0,3,1,1) LIMIT ?", (expression, count)).fetchall()]

    async def rank(self, queries: list[str], client=None, depth=30, profile=()):
        """One fused (lexical + semantic) ranking per query; embeddings in a single call.
        With a profile, candidates already retrieved that concern it get a small bonus."""
        if not self.ready:
            raise ValueError(self.index_error)
        embeddings = []
        if self.settings.mode == "hybrid":
            embedder = self.embedder or OpenAIEmbedder(client, self.settings.embedding_model)
            embeddings = await embedder.embed(queries, "query")
            if len(embeddings) != len(queries):
                raise ValueError("Embedding de requête invalide")
        rankings = []
        for n, query in enumerate(queries):
            parts = [self.lexical(query)]
            if embeddings:
                vector = embeddings[n]
                if vector.shape != (self.vectors.shape[1],) or not np.isfinite(vector).all() or np.linalg.norm(vector) == 0:
                    raise ValueError("Embedding de requête invalide")
                similarities = self.vectors @ (vector / np.linalg.norm(vector))
                parts.append([self.vector_ids[i] for i in np.argsort(-similarities)[:20]])
            scores = defaultdict(float)
            for part in parts:
                for rank, identifier in enumerate(part, 1):
                    scores[identifier] += 1 / (60 + rank)
            if profile:
                wanted = set(profile)
                for identifier in scores:
                    if self.corpus.publics_by_id.get(identifier, set()) & wanted:
                        scores[identifier] += self.settings.profile_boost
            rankings.append(sorted(scores, key=scores.get, reverse=True)[:depth])
        return rankings

    def select(self, rankings: list[list[str]], count=8):
        """Interleave the queries (every part of a question gets slots) and, when
        configured, cap the passages taken from one subsection once the first `keep_top`
        are chosen. The cap is soft: unused slots are filled with the best remaining."""
        cap, keep = self.settings.per_subsection, self.settings.keep_top
        by_id = self.corpus.by_id
        group = lambda i: (by_id[i]['type'], by_id[i]['sous_section'])
        chosen, used = [], {}
        for enforce in ([True, False] if cap else [False]):
            for depth in range(max(map(len, rankings), default=0)):
                for ranking in rankings:
                    if len(chosen) < count and depth < len(ranking) and ranking[depth] not in chosen \
                            and not (enforce and len(chosen) >= keep and used.get(group(ranking[depth]), 0) >= cap):
                        chosen.append(ranking[depth])
                        used[group(ranking[depth])] = used.get(group(ranking[depth]), 0) + 1
        return chosen

    async def search(self, query: str, client=None, count=None, extra_queries=(), profile=()):
        count = count or self.settings.retrieval_count
        queries = list(dict.fromkeys([query, *extra_queries]))
        ids = self.select(await self.rank(queries, client, profile=profile), count)
        return self.corpus.expand(ids), ids

    def close(self):
        self.db.close()
