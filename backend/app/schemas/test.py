from uuid import UUID

from pydantic import BaseModel

from app.models.enums import AccessType, QuestionType, TestSource, TestStatus, TestType


class TestCard(BaseModel):
    id: UUID
    title: str
    type: TestType
    access_type: AccessType
    status: TestStatus
    source: TestSource
    source_detail: str | None
    is_favorite: bool
    is_locked: bool


class QuestionGroupSummary(BaseModel):
    id: UUID
    section_title: str
    question_type: QuestionType
    question_start: int
    question_end: int


class TestDetail(BaseModel):
    id: UUID
    title: str
    type: TestType
    access_type: AccessType
    status: TestStatus
    source: TestSource
    source_detail: str | None
    version: int
    exam_time_limit_seconds: int | None
    total_questions: int
    sections: list[QuestionGroupSummary]

