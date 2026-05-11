from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AdminSpeakingTopicCreateRequest(BaseModel):
    part_number: int = Field(ge=1, le=3)
    topic_title: str = Field(min_length=1, max_length=255)
    prompt_text: str = Field(min_length=1)
    bullet_points: list[str] = Field(default_factory=list)
    followup_group_key: str | None = Field(default=None, max_length=128)
    difficulty_label: str | None = Field(default=None, max_length=32)
    category_tags: list[str] = Field(default_factory=list, min_length=1)
    source_kind: str = Field(default="custom", max_length=32)
    source_note: str | None = Field(default=None, max_length=255)
    active: bool = True
    seed_rank: int = Field(default=0, ge=0)
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
