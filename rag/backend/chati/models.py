from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Message(StrictModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=12000)


class ChatRequest(StrictModel):
    messages: list[Message] = Field(min_length=1, max_length=24)
    research: bool = False
    focus_measure_id: str | None = Field(default=None, pattern=r'^p\dc\d{2}-ss\d{2}-m\d{3}$')
    # Situation declared by the user (audience identifiers of publics.json), at most three.
    profile: list[str] = Field(default_factory=list, max_length=3)

    @model_validator(mode='after')
    def check_history(self):
        if self.messages[-1].role != 'user' or sum(len(m.content) for m in self.messages) > 40000:
            raise ValueError("Historique trop long ou dernier message utilisateur manquant")
        return self


class Point(StrictModel):
    text: str
    source_ids: list[str]


class Block(StrictModel):
    kind: Literal["answer", "explanation", "comparison", "benefits", "limits", "quote"]
    text: str
    source_ids: list[str]
    # One sourced item per measure (explanation, benefits, comparison only).
    points: list[Point] = Field(default_factory=list)


class MeasureExplanation(StrictModel):
    id: str
    explanation: str
    expected_benefit: str
    benefit_basis: Literal["explicit_text", "subsection_title", "analysis", "none"]


class GeneratedAnswer(StrictModel):
    status: Literal["answered", "partial", "clarification", "not_in_corpus"]
    blocks: list[Block]
    measures: list[MeasureExplanation]
    # Aspects asked by the user that the provided passages do not cover, each written
    # as a short search query. Drives the check made before an absence is stated.
    not_found: list[str] = Field(default_factory=list, max_length=4)
    # Two or three questions the user could ask next, written in the same call (no extra cost).
    suivis: list[str] = Field(default_factory=list)  # more than three are cut by the server


class FeedbackRequest(StrictModel):
    """A thumbs up or down on one answer. Neither the question nor the answer is sent."""
    request_id: UUID
    rating: Literal["up", "down"]
    reason: Literal["incomplet", "hors_sujet", "pas_clair", "erreur"] | None = None
    status: Literal["answered", "partial", "clarification", "not_in_corpus"]
    mode: Literal["generated", "consultation"]
    source_ids: list[str] = Field(default_factory=list, max_length=20)

    @model_validator(mode='after')
    def reason_only_when_down(self):
        if self.reason is not None and self.rating != 'down':
            raise ValueError("Un motif accompagne seulement un avis négatif")
        return self
