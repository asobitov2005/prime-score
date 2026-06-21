from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AdminSpeakingTopicCreateRequest(BaseModel):
    part_number: int = Field(ge=1, le=3)
    topic_title: str = Field(min_length=1, max_length=255)
    prompt_text: str = Field(default="")
    bullet_points: list[str] = Field(default_factory=list)
    followup_group_key: str | None = Field(default=None, max_length=128)
    linked_part2_topic_id: UUID | None = None
    difficulty_label: str | None = Field(default=None, max_length=32)
    category_tags: list[str] = Field(default_factory=list)
    source_kind: str = Field(default="custom", max_length=32)
    source_note: str | None = Field(default=None, max_length=255)
    active: bool = True
    seed_rank: int = Field(default=0, ge=0)
    icon: str | None = Field(default=None, max_length=64)
    icon_tone: str | None = Field(default=None, max_length=16)
    is_new_topic: bool = False
    metadata: dict = Field(default_factory=dict)


class AdminSpeakingTopicUpdateRequest(BaseModel):
    topic_title: str = Field(min_length=1, max_length=255)
    prompt_text: str = Field(default="")
    bullet_points: list[str] = Field(default_factory=list)
    linked_part2_topic_id: UUID | None = None
    category_tags: list[str] = Field(default_factory=list)
    active: bool = True
    icon: str | None = Field(default=None, max_length=64)
    icon_tone: str | None = Field(default=None, max_length=16)
    is_new_topic: bool = False
    metadata: dict = Field(default_factory=dict)


class AdminSpeakingTopicRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    part_number: int
    topic_title: str
    prompt_text: str
    bullet_points: list[str] = Field(default_factory=list)
    followup_group_key: str | None = None
    difficulty_label: str | None = None
    category_tags: list[str] = Field(default_factory=list)
    source_kind: str
    source_note: str | None = None
    active: bool
    seed_rank: int
    metadata: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class AdminSpeakingTopicListResponse(BaseModel):
    items: list[AdminSpeakingTopicRead]
    total: int


class AdminSpeakingCategoryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    scope: str = Field(default="custom", pattern="^(part1|cross_part|custom)$")
    label: str | None = Field(default=None, max_length=255)


class AdminSpeakingCategoryRead(BaseModel):
    slug: str
    label: str | None = None
    scope: str
    active: bool
    topic_count: int = 0
    created_at: datetime
    updated_at: datetime


class AdminSpeakingCategoryListResponse(BaseModel):
    items: list[AdminSpeakingCategoryRead]
    total: int


class SpeakingTestListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    slug: str
    status: str
    access_type: str
    mode_kind: str
    source: str | None = None
    source_detail: str | None = None
    description: str | None = None
    estimated_minutes: int
    version: int
    created_at: datetime
    updated_at: datetime


class SpeakingTestListResponse(BaseModel):
    items: list[SpeakingTestListItem]
    total: int


class SpeakingSessionCreateRequest(BaseModel):
    speaking_test_id: UUID
    entry_mode: str = Field(default="full", pattern="^(full|part_1|part_2|part_3)$")


class SpeakingSessionCreateResponse(BaseModel):
    session_id: UUID
    speaking_test_id: UUID
    entry_mode: str
    status: str


class SpeakingTopicListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    part_number: int
    topic_title: str
    prompt_text: str
    bullet_points: list[str] = Field(default_factory=list)
    difficulty_label: str | None = None
    category_tags: list[str] = Field(default_factory=list)
    sample_questions: list[str] = Field(default_factory=list)
    icon: str | None = None
    icon_tone: str | None = None
    is_new_topic: bool = False
    followup_group_key: str | None = None


class SpeakingTopicListResponse(BaseModel):
    items: list[SpeakingTopicListItem]
    total: int


class SpeakingHistoryItem(BaseModel):
    session_id: UUID
    speaking_test_id: UUID
    title: str
    entry_mode: str
    status: str
    source: str | None = None
    source_detail: str | None = None
    overall_band: float | None = None
    time_spent_sec: int | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    graded_at: datetime | None = None


class SpeakingHistoryResponse(BaseModel):
    items: list[SpeakingHistoryItem]


class SpeakingEvaluationRead(BaseModel):
    overall_band: float | None = None
    fluency_band: float | None = None
    lexical_band: float | None = None
    grammar_band: float | None = None
    pronunciation_band: float | None = None
    summary_feedback: str = ""
    strengths: list[str] = Field(default_factory=list)
    critical_issues: list[str] = Field(default_factory=list)
    pronunciation_issues: list[str] = Field(default_factory=list)
    grammar_issues: list[str] = Field(default_factory=list)
    lexical_issues: list[str] = Field(default_factory=list)
    improvement_actions: list[str] = Field(default_factory=list)
    deep_feedback_markdown: str = ""
    evaluator_model: str | None = None
    rubric_version: str | None = None


class SpeakingAudioAssetRead(BaseModel):
    id: UUID
    speaker_role: str
    storage_path: str
    mime_type: str
    duration_ms: int | None = None
    channel_kind: str
    metadata: dict = Field(default_factory=dict)


class SpeakingDiarizedTranscriptItem(BaseModel):
    role: str
    text: str
    at: str | None = None
    offset_ms: int | None = None


class SpeakingStructuredFeedbackRead(BaseModel):
    criteria_feedback: dict = Field(default_factory=dict)
    error_feedback: list[dict] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    improvement_actions: list[str] = Field(default_factory=list)


class SpeakingSessionResultResponse(BaseModel):
    session_id: UUID
    speaking_test_id: UUID
    title: str
    entry_mode: str
    status: str
    started_at: datetime | None = None
    ended_at: datetime | None = None
    graded_at: datetime | None = None
    transcript: str = ""
    candidate_transcript: str = ""
    examiner_transcript: str = ""
    diarized_transcript: list[SpeakingDiarizedTranscriptItem] = Field(default_factory=list)
    audio_assets: list[SpeakingAudioAssetRead] = Field(default_factory=list)
    structured_feedback: SpeakingStructuredFeedbackRead = Field(default_factory=SpeakingStructuredFeedbackRead)
    evaluation: SpeakingEvaluationRead | None = None
    turn_count: int | None = None
    planned_question_count: int | None = None
    questions_answered: int | None = None
