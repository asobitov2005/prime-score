from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.core.enums import AttemptStatus, TestMode, TestScope, TestType
from app.schemas.tests import TestSnapshotRead


class AttemptAnswerRequest(BaseModel):
    question_id: UUID
    value: str | None = None


class AttemptAnswerResponse(BaseModel):
    attempt_id: UUID
    question_id: UUID
    question_number: int
    value: str | None = None
    saved_at: datetime
    score_status: str = "draft"


class AttemptRead(BaseModel):
    attempt_id: UUID
    test_id: UUID
    test_version: int
    scope: TestScope
    section_id: UUID | None = None
    mode: TestMode
    status: AttemptStatus
    started_at: datetime
    completed_at: datetime | None = None
    time_spent_sec: int = 0
    total_questions: int = 0
    answers_count: int = 0
    raw_score: int | None = None
    band_score: Decimal | None = None
    score_status: str = "queued"
    test_title: str | None = None
    test_type: TestType | None = None
    time_limit_seconds: int = 0
    last_answered_question_number: int | None = None
    test_snapshot: TestSnapshotRead | None = None


class AttemptSubmitResponse(AttemptRead):
    submitted_at: datetime | None = None


class AttemptBreakdownItemRead(BaseModel):
    label: str
    correct: int
    total: int


class AttemptResultRead(BaseModel):
    attempt_id: UUID
    status: AttemptStatus
    test_id: UUID
    test_type: TestType
    test_title: str | None = None
    raw_score: int | None = None
    band_score: Decimal | None = None
    answers_count: int = 0
    total_questions: int = 0
    score_status: str = "queued"
    completed_at: datetime | None = None
    section_breakdown: list[AttemptBreakdownItemRead] = []
    question_type_breakdown: list[AttemptBreakdownItemRead] = []


class AttemptReviewItemRead(BaseModel):
    question_id: UUID
    question_number: int
    prompt: str
    section_title: str
    group_title: str
    question_type: str
    answer_value: str | None = None
    is_correct: bool | None = None
    correct_answers: list[str] = []
    explanation: str | None = None


class AttemptReviewRead(BaseModel):
    attempt_id: UUID
    test_title: str | None = None
    test_type: TestType | None = None
    can_show_explanations: bool = False
    items: list[AttemptReviewItemRead] = []
