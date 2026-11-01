# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.14-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend CORPUS_DIR=/app/data/structured \
    STATIC_DIR=/app/frontend/dist INDEX_DIR=/app/runtime/index \
    PDF_PATH=/app/assets/Programme-Mélenchon-LFI.pdf \
    MODEL_CACHE_DIR=/app/models
WORKDIR /app
COPY backend/requirements.lock /app/backend/requirements.lock
RUN pip install --no-cache-dir -r backend/requirements.lock \
    && groupadd --gid 1000 chati \
    && useradd --uid 1000 --gid chati --no-create-home chati \
    && mkdir -p /app/runtime/index && chown -R chati:chati /app/runtime
COPY backend/chati /app/backend/chati
COPY data/structured/mesures.jsonl data/structured/annexes.jsonl data/structured/enrichment.jsonl /app/data/structured/
COPY assets/Programme-Mélenchon-LFI.pdf /app/assets/Programme-Mélenchon-LFI.pdf
# Local multilingual embeddings (no API, no key): the model and the search index are built once,
# at image build time, so that the server starts without downloading anything.
RUN EMBEDDING_PROVIDER=local INDEX_DIR=/app/index-local PYTHONPATH=/app/backend python -m chati.index \
    && chown -R chati:chati /app/models /app/index-local
COPY --from=frontend /build/dist /app/frontend/dist
USER chati
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/api/health', timeout=2)"
CMD ["uvicorn", "chati.main:app", "--host", "0.0.0.0", "--port", "8080", "--no-access-log"]
