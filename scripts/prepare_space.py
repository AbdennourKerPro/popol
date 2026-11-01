#!/usr/bin/env python3
"""Build a minimal, secret-free folder to push to a Hugging Face Space (Docker SDK).

  python scripts/prepare_space.py [output_dir]      # default: output/space

The folder holds only what the image needs (no benchmarks, tests, docs, .env or keys). Non-secret
settings are baked into its Dockerfile; the secrets (GROQ_API_KEY, FIREBASE_PROJECT_ID,
FIREBASE_SERVICE_ACCOUNT_JSON) are set in the Space settings, never here.
"""
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
FILES = ['Dockerfile', 'backend/requirements.lock', 'assets/Programme-Mélenchon-LFI.pdf',
         'data/structured/mesures.jsonl', 'data/structured/annexes.jsonl', 'data/structured/enrichment.jsonl',
         'frontend/package.json', 'frontend/package-lock.json', 'frontend/index.html', 'frontend/tsconfig.json',
         'frontend/vite.config.ts']
TREES = ['backend/chati', 'frontend/src', 'frontend/public']
FRONT_MATTER = """---
title: Chati
emoji: 💬
colorFrom: red
colorTo: blue
sdk: docker
app_port: 8080
pinned: false
---

Chati, le Chat Insoumis : bêta fermée (accès sur invitation). Le code est celui du dépôt du projet.
"""
SPACE_ENV = """
# Réglages de la bêta (non secrets). Les secrets se saisissent dans les paramètres du Space.
ENV LLM_PROVIDER=groq GROQ_MODEL=openai/gpt-oss-120b GROQ_REASONING_EFFORT=low \\
    RETRIEVAL_MODE=hybrid EMBEDDING_PROVIDER=local INDEX_DIR=/app/index-local HF_HUB_OFFLINE=1 \\
    RETRIEVAL_COUNT=12 WEB_SEARCH_ENABLED=false BETA_MODE=true QUOTA_BACKEND=firestore \\
    INVITE_DAILY_LIMIT=5 QUOTA_TIMEZONE=Europe/Paris DAILY_TOKEN_CAP=170000 DAILY_REQUEST_CAP=900 \\
    BUDGET_TIMEZONE=UTC MAX_CONCURRENT_REQUESTS=2
"""


def main(out: Path):
    if out.exists():
        shutil.rmtree(out)
    for name in FILES:
        (out / name).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / name, out / name)
    ignore = shutil.ignore_patterns('__pycache__', '*.pyc', '*.tsbuildinfo')
    for tree in TREES:
        shutil.copytree(ROOT / tree, out / tree, ignore=ignore)
    dockerfile = (out / 'Dockerfile').read_text()
    marker = 'USER chati\n'
    assert marker in dockerfile
    (out / 'Dockerfile').write_text(dockerfile.replace(marker, SPACE_ENV.lstrip('\n') + marker, 1))
    (out / 'README.md').write_text(FRONT_MATTER)
    print(f'Dossier du Space prêt : {out}')


if __name__ == '__main__':
    main(Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / 'output' / 'space').resolve())
