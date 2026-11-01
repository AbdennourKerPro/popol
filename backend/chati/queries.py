"""Question planning: split a multi-part question into autonomous search queries."""
import json

from pydantic import BaseModel, ConfigDict, Field

INSTRUCTIONS = """Tu prépares la recherche dans un résumé de programme politique (mesures courtes, style télégraphique).
À partir de la conversation, écris entre 1 et 3 requêtes de recherche autonomes pour la DERNIÈRE question de
l'utilisateur : une requête par volet distinct de la question (par exemple un volet par sujet ou par dispositif demandé).
Chaque requête doit se comprendre seule : résous les pronoms et les « et pour… ? » avec l'historique, nomme le sujet,
utilise les mots que le résumé emploierait (nom du dispositif, terme administratif ou usuel) et quelques synonymes.
Une question simple a une seule requête. N'invente aucun fait, n'ajoute pas de réponse, pas de chiffres absents de la question."""


class QueryPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")
    queries: list[str] = Field(min_length=1, max_length=3)


async def plan_queries(client, model, messages, timeout=15):
    """Return (queries, usage). Raises ValueError when the plan is unusable."""
    history = [{"role": m.role, "content": m.content[:1500]} for m in messages[-5:]]
    response = await client.with_options(timeout=timeout, max_retries=0).responses.parse(
        model=model, instructions=INSTRUCTIONS, store=False, text_format=QueryPlan, max_output_tokens=600,
        input=[{"role": "user", "content": json.dumps({"conversation": history}, ensure_ascii=False)}])
    plan = response.output_parsed
    queries = [" ".join(q.split()) for q in (plan.queries if plan else [])]
    if not queries or any(not 3 <= len(q) <= 400 for q in queries):
        raise ValueError("Plan de recherche inutilisable")
    return queries, (response.usage.model_dump() if response.usage else None)
