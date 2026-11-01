#!/usr/bin/env python3
"""Check the beta configuration before opening it to testers (costs about 300 Groq tokens).

  python scripts/beta_check.py            # reads the same environment variables as the server

1. Groq: the key works, the model accepts our strict JSON schema, and your remaining limits.
2. Firestore: the credentials can create, reserve, release and delete an invitation.
Nothing is printed that could reveal a key.
"""
import asyncio
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from openai import AsyncOpenAI  # noqa: E402
from chati.config import Settings  # noqa: E402
from chati.groq import strict_schema  # noqa: E402
from chati.models import GeneratedAnswer  # noqa: E402
from chati.quota import FirestoreStore, hash_token  # noqa: E402

OK, KO = '\033[32mOK\033[0m', '\033[31mÉCHEC\033[0m'


async def check_groq(s):
    if not s.groq_api_key:
        print(f'[Groq] {KO} GROQ_API_KEY absente')
        return False
    client = AsyncOpenAI(api_key=s.groq_api_key, base_url=s.groq_base_url, timeout=30, max_retries=0)
    try:
        raw = await client.chat.completions.with_raw_response.create(
            model=s.groq_model, temperature=s.groq_temperature, max_completion_tokens=800,
            messages=[{'role': 'system', 'content': 'Tu réponds en JSON.'}, {'role': 'user', 'content': 'Écris « ok » dans un bloc answer sans source, statut clarification.'}],
            response_format={'type': 'json_schema', 'json_schema': {'name': 'GeneratedAnswer', 'strict': True, 'schema': strict_schema(GeneratedAnswer)}},
            extra_body={'reasoning_effort': s.groq_reasoning_effort, 'include_reasoning': False})
        response = raw.parse()
        parsed = GeneratedAnswer.model_validate_json(response.choices[0].message.content)
        h = raw.headers
        print(f'[Groq] {OK} modèle {s.groq_model}, schéma strict accepté, {response.usage.total_tokens} tokens utilisés, statut={parsed.status}')
        print('       limites restantes : ' + ', '.join(f'{k}={h.get(k)}' for k in ('x-ratelimit-remaining-requests', 'x-ratelimit-remaining-tokens', 'x-ratelimit-limit-tokens') if h.get(k)))
        return True
    except Exception as exc:  # noqa: BLE001 - diagnostic tool
        print(f'[Groq] {KO} {type(exc).__name__}: {str(exc)[:300]}')
        return False
    finally:
        await client.close()


async def check_firestore(s):
    try:
        store = FirestoreStore(s)
        token = await store.create_invite('beta_check', 1, 1)
        invite = hash_token(token)
        grant = await store.reserve(invite)
        await store.release(grant)
        back = await store.peek(invite)
        ok = back.used == 0 and back.limit == 1
        await store.invites.document(invite).delete()
        await store.usage.document(f'{invite}_{grant.day}').delete()
        print(f'[Firestore] {OK if ok else KO} projet {s.firebase_project_id or "(déduit des identifiants)"}, collections {s.quota_collection_prefix}_invites/_usage/_budget')
        return ok
    except Exception as exc:  # noqa: BLE001
        print(f'[Firestore] {KO} {type(exc).__name__}: {str(exc)[:300]}')
        return False


async def main():
    s = Settings()
    print(f'Fournisseur={s.llm_provider} embeddings={s.embedding_provider} bêta={s.beta_mode} quotas={s.quota_backend}')
    results = [await check_groq(s) if s.llm_provider == 'groq' else True, await check_firestore(s) if s.quota_backend == 'firestore' else True]
    sys.exit(0 if all(results) else 1)


if __name__ == '__main__':
    asyncio.run(main())
