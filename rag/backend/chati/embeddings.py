"""Query/passage embeddings: OpenAI API, or a multilingual model run locally (no API, no key)."""
import asyncio

import numpy as np


class OpenAIEmbedder:
    def __init__(self, client, model):
        self.client, self.model = client, model

    async def embed(self, texts, kind="query"):
        response = await self.client.embeddings.create(model=self.model, input=list(texts))
        return [np.asarray(item.embedding, dtype=np.float32) for item in sorted(response.data, key=lambda item: getattr(item, 'index', 0))]


class LocalEmbedder:
    """ONNX model through fastembed. The model is loaded once, on first use, and runs in a
    worker thread so that a request never blocks the event loop."""

    def __init__(self, model, cache_dir):
        self.model_name, self.cache_dir, self._model = model, str(cache_dir), None
        self._lock = asyncio.Lock()
        # E5 models expect role prefixes; MiniLM-style models do not.
        self.prefixes = {"query": "query: ", "passage": "passage: "} if "e5" in model.lower() else {}

    def _load(self):
        if self._model is None:
            from fastembed import TextEmbedding
            self._model = TextEmbedding(model_name=self.model_name, cache_dir=self.cache_dir)
        return self._model

    def embed_sync(self, texts, kind="query"):
        prefix = self.prefixes.get(kind, "")
        return [np.asarray(v, dtype=np.float32) for v in self._load().embed([prefix + t for t in texts])]

    async def embed(self, texts, kind="query"):
        async with self._lock:  # one inference at a time on a small instance
            return await asyncio.to_thread(self.embed_sync, list(texts), kind)


def make_embedder(settings, client=None):
    if settings.embedding_provider == "local":
        return LocalEmbedder(settings.local_embedding_model, settings.model_cache_dir)
    return OpenAIEmbedder(client, settings.embedding_model) if client is not None else None
