from dataclasses import dataclass
import os
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    corpus_dir: Path = Path(os.environ.get("CORPUS_DIR", "data/programme"))
    index_dir: Path = Path(os.environ.get("INDEX_DIR", ".runtime/index"))
    static_dir: Path = Path(os.environ.get("STATIC_DIR", "frontend/dist"))
    llm_provider: str = os.environ.get("LLM_PROVIDER", "openai")
    api_key: str = os.environ.get("OPENAI_API_KEY", "")
    model: str = os.environ.get("OPENAI_MODEL", "gpt-6-luna")
    groq_api_key: str = os.environ.get("GROQ_API_KEY", "")
    groq_model: str = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
    groq_base_url: str = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    groq_reasoning_effort: str = os.environ.get("GROQ_REASONING_EFFORT", "low")
    groq_max_completion_tokens: int = int(os.environ.get("GROQ_MAX_COMPLETION_TOKENS", "2500"))
    groq_temperature: float = float(os.environ.get("GROQ_TEMPERATURE", "0.3"))
    groq_strict_schema: bool = os.environ.get("GROQ_STRICT_SCHEMA", "true").lower() == "true"
    # Groq free plan, organisation-wide: 30 requests/min and 8 000 tokens/min for gpt-oss.
    llm_rpm_limit: int = int(os.environ.get("LLM_RPM_LIMIT", "30"))
    llm_tpm_limit: int = int(os.environ.get("LLM_TPM_LIMIT", "8000"))
    llm_tokens_per_request: int = int(os.environ.get("LLM_TOKENS_PER_REQUEST", "3000"))
    llm_max_wait: float = float(os.environ.get("LLM_MAX_WAIT_SECONDS", "20"))
    embedding_provider: str = os.environ.get("EMBEDDING_PROVIDER", "openai")
    embedding_model: str = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")
    local_embedding_model: str = os.environ.get("LOCAL_EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
    model_cache_dir: Path = Path(os.environ.get("MODEL_CACHE_DIR", ".runtime/models"))
    beta_mode: bool = os.environ.get("BETA_MODE", "false").lower() == "true"
    firebase_project_id: str = os.environ.get("FIREBASE_PROJECT_ID", "")
    quota_backend: str = os.environ.get("QUOTA_BACKEND", "firestore")
    quota_collection_prefix: str = os.environ.get("QUOTA_COLLECTION_PREFIX", "chati")
    invite_daily_limit: int = int(os.environ.get("INVITE_DAILY_LIMIT", "5"))
    quota_timezone: str = os.environ.get("QUOTA_TIMEZONE", "Europe/Paris")
    budget_timezone: str = os.environ.get("BUDGET_TIMEZONE", "UTC")
    daily_request_cap: int = int(os.environ.get("DAILY_REQUEST_CAP", "900"))
    daily_token_cap: int = int(os.environ.get("DAILY_TOKEN_CAP", "170000"))
    mode: str = os.environ.get("RETRIEVAL_MODE", "lexical")
    index_enrichment: bool = os.environ.get("INDEX_ENRICHMENT", "true").lower() == "true"
    synonyms: bool = os.environ.get("SYNONYMS", "true").lower() == "true"
    query_planning: bool = os.environ.get("QUERY_PLANNING", "false").lower() == "true"
    per_subsection: int = int(os.environ.get("RETRIEVAL_PER_SUBSECTION", "0"))
    retrieval_count: int = int(os.environ.get("RETRIEVAL_COUNT", "12"))
    verify_absence: bool = os.environ.get("VERIFY_ABSENCE", "false").lower() == "true"
    keep_top: int = int(os.environ.get("RETRIEVAL_KEEP_TOP", "0"))
    # Small bonus added to the fused score of retrieved measures that concern the declared profile.
    profile_boost: float = float(os.environ.get("PROFILE_BOOST", "0.005"))
    context_mode: str = os.environ.get("CONTEXT_MODE", "retrieval")
    consultation: bool = os.environ.get("CONSULTATION_MODE", "false").lower() == "true"
    timeout: float = float(os.environ.get("OPENAI_TIMEOUT", "60"))
    concurrency: int = int(os.environ.get("MAX_CONCURRENT_REQUESTS", "4"))
    web_enabled: bool = os.environ.get("WEB_SEARCH_ENABLED", "true").lower() == "true"
    web_max_calls: int = int(os.environ.get("WEB_MAX_TOOL_CALLS", "3"))
    # Answer a doubt or an objection with verified examples abroad and the legal basis (web, OpenAI only).
    objection_research: bool = os.environ.get("OBJECTION_RESEARCH", "true").lower() == "true"
    # Verified answers to standalone questions, kept in memory (0 disables the cache).
    answer_cache_size: int = int(os.environ.get("ANSWER_CACHE_SIZE", "300"))
    answer_cache_file: Path = Path(os.environ.get("ANSWER_CACHE_FILE", "data/programme/answers.jsonl"))
    # Send each answer block as soon as the model has written it (provisional display).
    stream_blocks: bool = os.environ.get("STREAM_BLOCKS", "false").lower() == "true"

    @property
    def provider_key(self) -> str:
        return self.groq_api_key if self.llm_provider == "groq" else self.api_key

    @property
    def generation_model(self) -> str:
        return self.groq_model if self.llm_provider == "groq" else self.model

    @property
    def effective_embedding_model(self) -> str:
        return self.local_embedding_model if self.embedding_provider == "local" else self.embedding_model

    @property
    def web_available(self) -> bool:
        return bool(self.web_enabled and self.llm_provider == "openai" and self.api_key and not self.consultation)

    def __post_init__(self):
        if self.llm_provider not in {"openai", "groq"}:
            raise ValueError("LLM_PROVIDER doit valoir openai ou groq")
        if self.embedding_provider not in {"openai", "local"}:
            raise ValueError("EMBEDDING_PROVIDER doit valoir openai ou local")
        if self.groq_reasoning_effort not in {"low", "medium", "high"}:
            raise ValueError("GROQ_REASONING_EFFORT doit valoir low, medium ou high")
        if self.quota_backend not in {"firestore", "memory"}:
            raise ValueError("QUOTA_BACKEND doit valoir firestore ou memory")
        if not 1 <= self.invite_daily_limit <= 1000 or self.daily_request_cap < 1 or self.daily_token_cap < 1000:
            raise ValueError("Quotas invalides")
        if self.llm_provider == "groq" and self.mode == "hybrid" and self.embedding_provider == "openai":
            raise ValueError("Groq ne fournit pas d’embeddings : utilisez EMBEDDING_PROVIDER=local ou RETRIEVAL_MODE=lexical")
        if self.mode not in {"hybrid", "lexical"}:
            raise ValueError("RETRIEVAL_MODE doit valoir hybrid ou lexical")
        if self.context_mode not in {"retrieval", "full"}:
            raise ValueError("CONTEXT_MODE doit valoir retrieval ou full")
        if not 1 <= self.retrieval_count <= 40:
            raise ValueError("RETRIEVAL_COUNT doit être compris entre 1 et 40")
        if not 0 <= self.per_subsection <= 8:
            raise ValueError("RETRIEVAL_PER_SUBSECTION doit être compris entre 0 et 8")
        if self.concurrency < 1 or not 1 <= self.timeout <= 180:
            raise ValueError("Limites de requêtes invalides")
        if not 1 <= self.web_max_calls <= 5:
            raise ValueError("WEB_MAX_TOOL_CALLS doit être compris entre 1 et 5")
        if self.answer_cache_size < 0:
            raise ValueError("ANSWER_CACHE_SIZE doit être positif ou nul")
