from __future__ import annotations

from datetime import datetime
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import (
    WritingDifficulty,
    WritingErrorCategory,
    WritingQuestionSubtype,
    WritingSubmissionStatus,
    WritingTaskStatus,
    WritingTaskType,
)


class WritingTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    task_type: WritingTaskType
    prompt_html: str
    image_url: str | None = None
    image_summary: str | None = None
    image_summary_status: str = "not_required"
    word_minimum: int
    time_limit_seconds: int
    difficulty: WritingDifficulty
    status: WritingTaskStatus
    source: str | None = None
    question_subtype: str | None = None
    description: str | None = None
    sample_band: float | None = None
    created_at: datetime


class WritingTaskListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    task_type: WritingTaskType
    image_url: str | None = None
    word_minimum: int
    time_limit_seconds: int
    difficulty: WritingDifficulty
    source: str | None = None
    question_subtype: str | None = None
    description: str | None = None


class WritingTaskListResponse(BaseModel):
    items: list[WritingTaskListItem]
    total: int


class WritingUploadImageResponse(BaseModel):
    url: str


class WritingDraftUpsertRequest(BaseModel):
    task_id: UUID | None = None
    task_type: WritingTaskType
    topic: str | None = Field(default=None, max_length=5000)
    essay_text: str = Field(default="", max_length=20000)
    image_data_url: str | None = None
    started: bool = False
    time_spent_seconds: int = Field(default=0, ge=0)


class WritingDraftRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    draft_key: str
    task_id: UUID | None = None
    task_type: WritingTaskType
    topic: str = ""
    essay_text: str = ""
    image_data_url: str | None = None
    started: bool = False
    time_spent_seconds: int = 0
    updated_at: datetime


class WritingDraftListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    draft_key: str
    task_id: UUID | None = None
    task_type: WritingTaskType
    task_title: str | None = None
    topic: str = ""
    essay_text: str = ""
    image_data_url: str | None = None
    started: bool = False
    time_spent_seconds: int = 0
    updated_at: datetime


class WritingDraftListResponse(BaseModel):
    items: list[WritingDraftListItem]


class AdminWritingTaskCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    task_type: WritingTaskType
    prompt_html: str = Field(min_length=1)
    image_url: str | None = None
    word_minimum: int = Field(default=250, ge=50, le=1000)
    time_limit_seconds: int = Field(default=2400, ge=300, le=10800)
    difficulty: WritingDifficulty = WritingDifficulty.MEDIUM
    source: str | None = None
    question_subtype: WritingQuestionSubtype
    description: str | None = None
    sample_band: float | None = Field(default=None, ge=0, le=9)
    sample_answer: str | None = None
    status: WritingTaskStatus = WritingTaskStatus.DRAFT


class AdminWritingTaskUpdateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    prompt_html: str | None = None
    image_url: str | None = None
    word_minimum: int | None = Field(default=None, ge=50, le=1000)
    time_limit_seconds: int | None = Field(default=None, ge=300, le=10800)
    difficulty: WritingDifficulty | None = None
    source: str | None = None
    question_subtype: WritingQuestionSubtype | None = None
    description: str | None = None
    sample_band: float | None = Field(default=None, ge=0, le=9)
    sample_answer: str | None = None
    status: WritingTaskStatus | None = None


class WritingSubmitRequest(BaseModel):
    task_id: UUID | None = None
    task_type: WritingTaskType | None = None
    topic: str | None = Field(default=None, min_length=1, max_length=5000)
    image_url: str | None = Field(default=None, max_length=1000)
    essay_text: str = Field(min_length=1, max_length=20000)
    time_spent_seconds: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_submission_target(self) -> Self:
        if self.task_id is not None:
            return self
        if self.task_type is None:
            raise ValueError("task_type is required when task_id is not provided.")
        if not (self.topic or "").strip():
            raise ValueError("topic is required when task_id is not provided.")
        return self


class WritingSubmissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    task_id: UUID
    task_type: WritingTaskType
    word_count: int
    status: WritingSubmissionStatus
    submitted_at: datetime
    error_message: str | None = None


class WritingCriterionFeedback(BaseModel):
    band: float
    summary: str
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    evidence_quotes: list[str] = Field(default_factory=list)
    reasoning: str = ""


class WritingInlineAnnotation(BaseModel):
    offset: int
    length: int
    original: str
    replacements: list[str] = Field(default_factory=list)
    category: WritingErrorCategory
    severity: str = "warning"
    short_message: str = ""
    explanation: str = ""
    band_impact: str = ""
    examiner_tip: str = ""
    improved_sentence: str = ""


class WritingVocabularySuggestion(BaseModel):
    current_phrase: str = ""
    improved_phrase: str = ""
    level: str = ""
    why_it_works: str = ""
    example_sentence: str = ""


class WritingRoastFeedback(BaseModel):
    overall_roast: str = ""
    one_liner: str = ""
    task_achievement_zinger: str = ""
    coherence_zinger: str = ""
    lexical_zinger: str = ""
    grammar_zinger: str = ""
    savage_tips: list[str] = Field(default_factory=list)
    pep_talk: str = ""


class WritingEvaluationRead(BaseModel):
    submission_id: UUID
    task_id: UUID
    task_type: WritingTaskType
    task_title: str
    word_count: int
    word_minimum: int
    time_spent_seconds: int
    submitted_at: datetime
    graded_at: datetime
    essay_text: str
    overall_band: float
    potential_band: float | None = None
    word_count_penalty: float = 0.0
    task_achievement: WritingCriterionFeedback
    coherence: WritingCriterionFeedback
    lexical: WritingCriterionFeedback
    grammar: WritingCriterionFeedback
    inline_annotations: list[WritingInlineAnnotation] = Field(default_factory=list)
    vocabulary_suggestions: list[WritingVocabularySuggestion] = Field(default_factory=list)
    improved_version: str | None = None
    overall_summary: str = ""
    next_steps: list[str] = Field(default_factory=list)
    roast: WritingRoastFeedback | None = None
    cache_hit: bool = False
    model_version: str = ""
    prompt_version: str = "v1"


class WritingHistoryItem(BaseModel):
    submission_id: UUID
    task_id: UUID
    task_title: str
    task_type: WritingTaskType
    word_count: int
    time_spent_seconds: int = 0
    overall_band: float | None = None
    status: WritingSubmissionStatus
    submitted_at: datetime
    graded_at: datetime | None = None


class WritingHistoryResponse(BaseModel):
    items: list[WritingHistoryItem]
    total: int


class WritingDashboardSummary(BaseModel):
    total_submissions: int = 0
    average_band: float | None = None
    best_band: float | None = None
    last_band: float | None = None
    last_submitted_at: datetime | None = None
    task_1_average: float | None = None
    task_2_average: float | None = None
