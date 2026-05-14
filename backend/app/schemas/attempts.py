from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import AttemptStatus, TestMode, TestScope, TestSource, TestType
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


class AttemptTextHighlightRead(BaseModel):
    id: str
    start: int
    end: int


class AttemptUiStateRead(BaseModel):
    theme: str | None = None
    split_ratio: float | None = None
    font_scale: float | None = None


class AttemptProgressRequest(BaseModel):
    time_spent_sec: int | None = None
    active_question_id: str | None = None
    text_highlights: dict[str, list[AttemptTextHighlightRead]] | None = None
    ui_state: AttemptUiStateRead | None = None


class AttemptProgressResponse(BaseModel):
    attempt_id: UUID
    saved_at: datetime
    time_spent_sec: int = 0


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
    answers: dict[str, str] = Field(default_factory=dict)
    active_question_id: str | None = None
    text_highlights: dict[str, list[AttemptTextHighlightRead]] = Field(default_factory=dict)
    ui_state: AttemptUiStateRead | None = None
    test_snapshot: TestSnapshotRead | None = None


class AttemptSubmitRequest(BaseModel):
    confirm: bool = False
    reason: str | None = None


class AttemptSubmitResponse(AttemptRead):
    submitted_at: datetime | None = None


class AttemptBreakdownItemRead(BaseModel):
    label: str
    correct: int
    total: int


class AttemptEventCreate(BaseModel):
    event_type: str
    payload: dict | None = None


class AttemptEventRead(BaseModel):
    event_type: str
    payload: dict | None = None
    created_at: datetime


class AttemptResultRead(BaseModel):
    attempt_id: UUID
    status: AttemptStatus
    test_id: UUID
    test_type: TestType
    test_format: str = "full"
    source: TestSource | None = None
    source_detail: str | None = None
    test_title: str | None = None
    raw_score: int | None = None
    band_score: Decimal | None = None
    answers_count: int = 0
    answered_slots_count: int = 0
    total_questions: int = 0
    time_spent_sec: int = 0
    score_status: str = "queued"
    completed_at: datetime | None = None
    section_breakdown: list[AttemptBreakdownItemRead] = []
    question_type_breakdown: list[AttemptBreakdownItemRead] = []
    diagram_groups: list["AttemptDiagramGroupRead"] = []
    events: list[AttemptEventRead] = []


class AttemptDiagramGroupRead(BaseModel):
    group_id: UUID
    section_title: str
    group_title: str
    question_start: int
    question_end: int
    diagram_title: str | None = None
    diagram_image_url: str


class AttemptReviewItemRead(BaseModel):
    question_id: UUID
    question_number: int
    question_label: str | None = None
    prompt: str
    section_title: str
    group_title: str
    question_type: str
    options: list[str] = []
    answer_value: str | None = None
    is_correct: bool | None = None
    correct_answers: list[str] = []
    explanation: str | None = None
    explanation_reference: dict | None = None


class AttemptReviewRead(BaseModel):
    attempt_id: UUID
    test_title: str | None = None
    test_type: TestType | None = None
    can_show_explanations: bool = False
    diagram_groups: list[AttemptDiagramGroupRead] = []
    items: list[AttemptReviewItemRead] = []
