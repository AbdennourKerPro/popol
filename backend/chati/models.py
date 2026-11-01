from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Message(StrictModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=12000)


class ChatRequest(StrictModel):
    messages: list[Message] = Field(min_length=1, max_length=24)
    research: bool = False
    focus_measure_id: str | None = Field(default=None, pattern=r'^s\d{2}-ss\d{2}-m\d{3}$')

    @model_validator(mode='after')
    def check_history(self):
        if self.messages[-1].role != 'user' or sum(len(m.content) for m in self.messages) > 40000:
            raise ValueError("Historique trop long ou dernier message utilisateur manquant")
        return self


class Block(StrictModel):
    kind: Literal["answer", "explanation", "comparison", "benefits", "limits", "quote"]
    text: str
    source_ids: list[str]


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
