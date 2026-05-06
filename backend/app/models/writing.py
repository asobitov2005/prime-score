from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import (
    WritingDifficulty,
    WritingSubmissionStatus,
    WritingTaskStatus,
    WritingTaskType,
)


class WritingTask(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "writing_tasks"

    title: Mapped[str] = mapped_column(String(255))
    task_type: Mapped[WritingTaskType] = mapped_column(
        Enum(WritingTaskType, native_enum=False), index=True
    )
    prompt_html: Mapped[str] = mapped_column(Text)
    image_storage_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    image_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_summary_status: Mapped[str] = mapped_column(
        String(32), default="not_required"
    )
    word_minimum: Mapped[int] = mapped_column(Integer, default=250)
    time_limit_seconds: Mapped[int] = mapped_column(Integer, default=2400)
    difficulty: Mapped[WritingDifficulty] = mapped_column(
        Enum(WritingDifficulty, native_enum=False), default=WritingDifficulty.MEDIUM
    )
    status: Mapped[WritingTaskStatus] = mapped_column(
        Enum(WritingTaskStatus, native_enum=False),
        default=WritingTaskStatus.DRAFT,
        index=True,
    )
    source: Mapped[str | None] = mapped_column(String(120), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sample_band: Mapped[float | None] = mapped_column(Float, nullable=True)
    sample_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("admins.id"), nullable=True, index=True
    )


class WritingDraft(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "writing_drafts"
    __table_args__ = (
        UniqueConstraint("user_id", "draft_key", name="uq_writing_drafts_user_id_draft_key"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    draft_key: Mapped[str] = mapped_column(String(160), index=True)
    task_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("writing_tasks.id"), nullable=True, index=True
    )
    task_type: Mapped[WritingTaskType] = mapped_column(
        Enum(WritingTaskType, native_enum=False), index=True
    )
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0)


class WritingSubmission(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "writing_submissions"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    task_id: Mapped[UUID] = mapped_column(
        ForeignKey("writing_tasks.id"), index=True
    )
    task_type: Mapped[WritingTaskType] = mapped_column(
        Enum(WritingTaskType, native_enum=False), index=True
    )
    essay_text: Mapped[str] = mapped_column(Text)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    essay_hash: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[WritingSubmissionStatus] = mapped_column(
        Enum(WritingSubmissionStatus, native_enum=False),
        default=WritingSubmissionStatus.QUEUED,
        index=True,
    )
    celery_task_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True
    )
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)


class WritingEvaluation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "writing_evaluations"

    submission_id: Mapped[UUID] = mapped_column(
        ForeignKey("writing_submissions.id"), unique=True, index=True
    )
    task_achievement_band: Mapped[float] = mapped_column(Float)
    coherence_band: Mapped[float] = mapped_column(Float)
    lexical_band: Mapped[float] = mapped_column(Float)
    grammar_band: Mapped[float] = mapped_column(Float)
    overall_band: Mapped[float] = mapped_column(Float, index=True)
    potential_band: Mapped[float | None] = mapped_column(Float, nullable=True)
    word_count_penalty: Mapped[float] = mapped_column(Float, default=0.0)
    feedback: Mapped[dict] = mapped_column(JSONB, default=dict)
    inline_annotations: Mapped[list] = mapped_column(JSONB, default=list)
    improved_version: Mapped[str | None] = mapped_column(Text, nullable=True)
    rubric_reasoning: Mapped[dict] = mapped_column(JSONB, default=dict)
    roast_feedback: Mapped[dict] = mapped_column(JSONB, default=dict)
    model_version: Mapped[str] = mapped_column(String(120), default="")
    prompt_version: Mapped[str] = mapped_column(String(32), default="v1")
    anchors_version: Mapped[str] = mapped_column(String(32), default="v1")
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    cache_hit: Mapped[bool] = mapped_column(default=False)
    graded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True
    )
