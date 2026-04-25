from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import AccessType, QuestionType, TestFormat, TestMode, TestScope, TestSource, TestStatus, TestType


class TestSectionSnapshotRead(BaseModel):
    section_id: UUID
    section_number: int
    label: str | None = None
    title: str | None = None
    subtitle: str | None = None
    intro: str | None = None
    content: str | None = None
    paragraphs: list[str] = []
    show_labels: bool = False
    question_count: int = 0
    audio_duration_seconds: int | None = None
    question_groups: list["TestQuestionGroupSnapshotRead"] = []


class TestQuestionSnapshotRead(BaseModel):
    question_id: UUID
    question_number: int
    section_id: UUID
    section_title: str
    group_id: UUID
    group_title: str
    question_type: QuestionType
    prompt: str
    instructions: str
    label: str | None = None
    options: list[str] = []
    selection_limit: int | None = None
    word_limit: int | None = None


class TestQuestionGroupSnapshotRead(BaseModel):
    group_id: UUID
    group_title: str
    question_type: QuestionType
    question_start: int
    question_end: int
    shared_options: list[str] = []
    shared_content: dict[str, str] = {}
    questions: list[TestQuestionSnapshotRead] = []


class TestCatalogItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    test_type: TestType
    format: str | None = "full"
    access_type: AccessType
    status: TestStatus
    source: TestSource | None = None
    source_detail: str | None = None
    description: str | None = None
    exam_time_limit_min: int
    total_questions: int = 40
    version: int = 1
    section_count: int = 0


class TestListResponse(BaseModel):
    items: list[TestCatalogItemRead]


class TestSnapshotRead(BaseModel):
    test_id: UUID
    title: str
    test_type: TestType
    format: str | None = "full"
    access_type: AccessType
    status: TestStatus
    version: int
    scope: TestScope
    mode: TestMode
    section_id: UUID | None = None
    exam_time_limit_min: int
    time_limit_seconds: int
    total_questions: int
    audio_duration_seconds: int | None = None
    payment_paused: bool = True
    question_bank_enabled: bool = False
    sections: list[TestSectionSnapshotRead] = []
    questions: list[TestQuestionSnapshotRead] = []
    snapshot_at: datetime | None = None


class TestDetailRead(TestCatalogItemRead):
    payment_paused: bool = True
    question_bank_enabled: bool = False
    sections: list[TestSectionSnapshotRead] = []


class TestStartRequest(BaseModel):
    scope: TestScope
    section_id: UUID | None = None
    mode: TestMode = TestMode.practice
    force_new: bool = False


class TestStartResponse(BaseModel):
    attempt_id: UUID
    time_limit_seconds: int
    test_snapshot: TestSnapshotRead
