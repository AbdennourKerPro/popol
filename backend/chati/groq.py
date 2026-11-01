"""Groq (OpenAI-compatible chat completions) behind the `client.responses.parse` interface.

generation.py, queries.py and verification.py only call `client.responses.parse(...)`.
This adapter honours that call with Groq's chat completions and strict JSON schemas, so
the rest of the pipeline is unchanged. It also enforces Groq's organisation-wide
per-minute limits in-process (single instance), so that a burst waits or is refused
politely instead of consuming the daily quota with rejected calls.
"""
import asyncio
from collections import deque
from contextvars import ContextVar
import time
from types import SimpleNamespace

from openai import AsyncOpenAI, BadRequestError, RateLimitError

# Per-request token counter (set by the endpoint), so every attempt is accounted for.
TOKEN_COUNTER: ContextVar = ContextVar("llm_token_counter", default=None)

_DROP = {"title", "default", "minLength", "maxLength", "minItems", "maxItems", "pattern", "format", "description"}


class LLMBusy(Exception):
    """The provider's per-minute budget is exhausted for longer than we are willing to wait."""

    def __init__(self, retry_after):
        super().__init__(f"busy for {retry_after:.0f}s")
        self.retry_after = max(1, round(retry_after))


def strict_schema(model):
    """JSON schema accepted by strict structured outputs: refs inlined, every property
    required, no additional properties, validation keywords removed (pydantic re-checks)."""
    schema = model.model_json_schema()
    defs = schema.pop("$defs", {})

    def walk(node):
        if isinstance(node, list):
            return [walk(x) for x in node]
        if not isinstance(node, dict):
            return node
        if "$ref" in node:
            return walk(defs[node["$ref"].rsplit("/", 1)[-1]])
        out = {}
        for key, value in node.items():
            if key == "properties":
                out[key] = {name: walk(sub) for name, sub in value.items()}
            elif key not in _DROP:
                out[key] = walk(value)
        if out.get("type") == "object" and "properties" in out:
            out["required"] = list(out["properties"])
            out["additionalProperties"] = False
        return out

    return walk(schema)


class RateGate:
    """Sliding one-minute window of requests and tokens, shared by all requests."""

    def __init__(self, rpm, tpm, max_wait, clock=time.monotonic, sleep=asyncio.sleep):
        self.rpm, self.tpm, self.max_wait, self.clock, self.sleep = rpm, tpm, max_wait, clock, sleep
        self.events = deque()  # [timestamp, tokens]
        self.blocked_until = 0.0

    def _prune(self, now):
        while self.events and now - self.events[0][0] >= 60:
            self.events.popleft()

    def _wait_needed(self, now, estimate):
        self._prune(now)
        if self.blocked_until > now:
            return self.blocked_until - now
        used = sum(tokens for _, tokens in self.events)
        if len(self.events) < self.rpm and used + estimate <= self.tpm:
            return 0.0
        return max(0.5, 60 - (now - self.events[0][0])) if self.events else 0.0

    async def acquire(self, estimate):
        waited = 0.0
        while True:
            now = self.clock()
            wait = self._wait_needed(now, estimate)
            if wait == 0:
                entry = [now, estimate]
                self.events.append(entry)
                return entry
            if waited + wait > self.max_wait:
                raise LLMBusy(wait)
            step = min(wait, 1.0)
            await self.sleep(step)
            waited += step

    def settle(self, entry, tokens):
        if tokens is None:
            try:
                self.events.remove(entry)
            except ValueError:
                pass
        else:
            entry[1] = tokens

    def cooldown(self, seconds):
        self.blocked_until = max(self.blocked_until, self.clock() + min(max(seconds, 1), 3600))


class _Usage:
    def __init__(self, data):
        self.data = data

    def model_dump(self):
        return self.data


def _flatten(content):
    if isinstance(content, str):
        return content
    return "\n".join(part.get("text", "") for part in content if isinstance(part, dict))


def _retry_after(error, default=30.0):
    headers = getattr(getattr(error, "response", None), "headers", None) or {}
    try:
        return float(headers.get("retry-after", default))
    except (TypeError, ValueError):
        return default


class GroqResponses:
    def __init__(self, client, settings, gate):
        self.client, self.settings, self.gate = client, settings, gate

    async def parse(self, *, model, instructions, input, text_format, max_output_tokens=None, **_openai_only):
        s = self.settings
        messages = [{"role": "system", "content": instructions}]
        messages += [{"role": m["role"], "content": _flatten(m["content"])} for m in input]
        limit = min(max_output_tokens or s.groq_max_completion_tokens, s.groq_max_completion_tokens)
        strict = s.groq_strict_schema
        for attempt in range(2):
            if not strict:
                messages[0] = {"role": "system", "content": instructions + "\nRéponds uniquement par un objet JSON valide conforme au schéma."}
            entry = await self.gate.acquire(s.llm_tokens_per_request)
            try:
                response = await self.client.chat.completions.create(
                    model=model, messages=messages, temperature=s.groq_temperature, max_completion_tokens=limit,
                    response_format={"type": "json_schema", "json_schema": {"name": text_format.__name__, "strict": strict, "schema": strict_schema(text_format)}},
                    extra_body={"reasoning_effort": s.groq_reasoning_effort, "include_reasoning": False})
            except RateLimitError as exc:
                self.gate.settle(entry, None)
                self.gate.cooldown(_retry_after(exc))
                raise
            except BadRequestError:
                self.gate.settle(entry, None)
                if strict and attempt == 0:
                    strict = False  # schema rejected by constrained decoding: retry once in best-effort mode
                    continue
                raise
            except Exception:
                self.gate.settle(entry, None)
                raise
            usage = getattr(response, "usage", None)
            total = getattr(usage, "total_tokens", None)
            self.gate.settle(entry, total if total else s.llm_tokens_per_request)
            counter = TOKEN_COUNTER.get()
            if counter is not None:
                counter[0] += total or s.llm_tokens_per_request
            choice = response.choices[0]
            if choice.finish_reason == "length":
                raise ValueError("Réponse tronquée par la limite de tokens")
            parsed = text_format.model_validate_json(choice.message.content or "")
            details = getattr(usage, "completion_tokens_details", None)
            return SimpleNamespace(output_parsed=parsed, usage=_Usage({
                "input_tokens": getattr(usage, "prompt_tokens", 0) or 0,
                "output_tokens": getattr(usage, "completion_tokens", 0) or 0,
                "total_tokens": total or 0,
                "input_tokens_details": {"cached_tokens": 0, "cache_write_tokens": 0},
                "output_tokens_details": {"reasoning_tokens": getattr(details, "reasoning_tokens", 0) or 0}}))
        raise ValueError("Schéma de sortie refusé par le fournisseur")


class GroqClient:
    """Drop-in for AsyncOpenAI in this application: exposes `.responses.parse` and `.close`."""

    def __init__(self, settings, http_client=None):
        self._client = http_client or AsyncOpenAI(api_key=settings.groq_api_key, base_url=settings.groq_base_url, timeout=settings.timeout, max_retries=1)
        self.gate = RateGate(settings.llm_rpm_limit, settings.llm_tpm_limit, settings.llm_max_wait)
        self.responses = GroqResponses(self._client, settings, self.gate)

    def with_options(self, **_options):  # used by plan_queries for a short timeout
        return self

    async def close(self):
        await self._client.close()
