"""Build versioned semantic vectors: python -m chati.index."""
import asyncio
from contextlib import AsyncExitStack
import json
import os
import tempfile

import numpy as np
from openai import AsyncOpenAI

from .config import Settings
from .corpus import Corpus
from .embeddings import LocalEmbedder, OpenAIEmbedder


async def build(settings: Settings):
    corpus = Corpus(settings.corpus_dir, settings.index_enrichment)
    vectors = []
    if settings.embedding_provider == "openai" and not settings.api_key:
        raise SystemExit("OPENAI_API_KEY est nécessaire pour créer les embeddings (ou EMBEDDING_PROVIDER=local).")
    async with AsyncExitStack() as stack:
        if settings.embedding_provider == "local":
            embedder = LocalEmbedder(settings.local_embedding_model, settings.model_cache_dir)
        else:
            client = await stack.enter_async_context(AsyncOpenAI(api_key=settings.api_key, timeout=settings.timeout, max_retries=1))
            embedder = OpenAIEmbedder(client, settings.embedding_model)
        for start in range(0, len(corpus.rows), 64):
            batch = corpus.rows[start:start + 64]
            vectors.extend(await embedder.embed([corpus.index_text(r) for r in batch], "passage"))
            print(f"Indexation : {min(start + 64, len(corpus.rows))}/{len(corpus.rows)}", flush=True)
    matrix = np.asarray(vectors, dtype=np.float32)
    if matrix.ndim != 2 or matrix.shape[0] != len(corpus.rows) or not np.isfinite(matrix).all() or (np.linalg.norm(matrix, axis=1) == 0).any():
        raise ValueError("Réponse d’embeddings invalide ; index précédent conservé")
    settings.index_dir.mkdir(parents=True, exist_ok=True)
    metadata = json.dumps({"corpus_version": corpus.version, "enrichment_version": corpus.enrichment_version, "model": settings.effective_embedding_model, "dimensions": matrix.shape[1]})
    fd, temporary = tempfile.mkstemp(suffix=".npz", dir=settings.index_dir)
    try:
        with os.fdopen(fd, 'wb') as out:
            np.savez_compressed(out, vectors=matrix, ids=np.array([r['id'] for r in corpus.rows]), metadata=np.array(metadata))
        os.replace(temporary, settings.index_dir / "embeddings.npz")
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print("Index prêt. Redémarrez le service Chati pour le charger.")


if __name__ == "__main__":
    asyncio.run(build(Settings()))
