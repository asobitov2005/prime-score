from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import AttemptMode, AttemptScope, TestType


class AttemptStartRequest(BaseModel):
    test_type: TestType
    mode: AttemptMode
    scope: AttemptScope
    section_id: UUID | None = None
    audio_duration_seconds: int = 0


class AttemptStartResponse(BaseModel):
    attempt_id: UUID
    started_at: datetime
    mode: AttemptMode
    scope: AttemptScope
    time_limit_seconds: int
    snapshot_version: int
    detail: str


class AttemptAnswerPayload(BaseModel):
    question_id: UUID
    value: str | list[str]


class AttemptResult(BaseModel):
    attempt_id: UUID
    submitted_at: datetime
    raw_score: int
    max_score: int
    band_score: float | None
    section_breakdown: list[dict[str, str | int]]


class AttemptReview(BaseModel):
    attempt_id: UUID
    answers: list[dict[str, str | int | bool]]

