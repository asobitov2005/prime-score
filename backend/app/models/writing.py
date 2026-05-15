from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.models.enum_values import EnumValueString
from app.models.enums import (
    WritingDifficulty,
    WritingConfigEntityType,
    WritingConfigStatus,
    WritingPromptFormat,
    WritingPromptKey,
    WritingQuestionSubtype,
    WritingSubmissionStatus,
    WritingTaskStatus,
    WritingTaskType,
    WritingTaskTypeScope,
)


class WritingTask(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "writing_tasks"

    title: Mapped[str] = mapped_column(String(255))
    task_type: Mapped[WritingTaskType] = mapped_column(
        EnumValueString(WritingTaskType), index=True
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
        EnumValueString(WritingDifficulty), default=WritingDifficulty.MEDIUM
    )
    status: Mapped[WritingTaskStatus] = mapped_column(
        EnumValueString(WritingTaskStatus),
        default=WritingTaskStatus.DRAFT,
        index=True,
    )
    source: Mapped[str | None] = mapped_column(String(120), nullable=True)
    question_subtype: Mapped[WritingQuestionSubtype | None] = mapped_column(
        EnumValueString(WritingQuestionSubtype), nullable=True, index=True
    )
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
        EnumValueString(WritingTaskType), index=True
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
        EnumValueString(WritingTaskType), index=True
    )
    essay_text: Mapped[str] = mapped_column(Text)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    essay_hash: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[WritingSubmissionStatus] = mapped_column(
        EnumValueString(WritingSubmissionStatus),
        default=WritingSubmissionStatus.QUEUED,
        index=True,
    )
    celery_task_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True
    )
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0)
    desired_score: Mapped[float | None] = mapped_column(Float, nullable=True)
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
    grader_profile_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rubric_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    anchor_set_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    roast_profile_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    improved_profile_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    annotation_profile_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    cache_hit: Mapped[bool] = mapped_column(default=False)
    graded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True
    )


class WritingPromptProfile(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "writing_prompt_profiles"

    slug: Mapped[str] = mapped_column(String(120), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    task_type_scope: Mapped[WritingTaskTypeScope] = mapped_column(
        EnumValueString(WritingTaskTypeScope), index=True
    )
    status: Mapped[WritingConfigStatus] = mapped_column(
        EnumValueString(WritingConfigStatus), default=WritingConfigStatus.DRAFT, index=True
    )
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(default=False, index=True)
    created_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("admins.id"), nullable=True, index=True
    )


class WritingPromptEntry(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "writing_prompt_entries"
    __table_args__ = (
        UniqueConstraint("profile_id", "key", name="uq_writing_prompt_entries_profile_key"),
    )

    profile_id: Mapped[UUID] = mapped_column(
        ForeignKey("writing_prompt_profiles.id"), index=True
    )
    key: Mapped[WritingPromptKey] = mapped_column(
        EnumValueString(WritingPromptKey), index=True
    )
    body: Mapped[str] = mapped_column(Text)
    format: Mapped[WritingPromptFormat] = mapped_column(
        EnumValueString(WritingPromptFormat), default=WritingPromptFormat.TEXT
    )


class WritingRubricVersion(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "writing_rubric_versions"

    task_type_scope: Mapped[WritingTaskTypeScope] = mapped_column(
        EnumValueString(WritingTaskTypeScope), index=True
    )
    version: Mapped[int] = mapped_column(Integer, default=1)
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[WritingConfigStatus] = mapped_column(
        EnumValueString(WritingConfigStatus), default=WritingConfigStatus.DRAFT, index=True
    )
    is_active: Mapped[bool] = mapped_column(default=False, index=True)
    created_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("admins.id"), nullable=True, index=True
    )


class WritingAnchorSet(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "writing_anchor_sets"

    slug: Mapped[str] = mapped_column(String(120), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    task_type_scope: Mapped[WritingTaskTypeScope] = mapped_column(
        EnumValueString(WritingTaskTypeScope), index=True
    )
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[WritingConfigStatus] = mapped_column(
        EnumValueString(WritingConfigStatus), default=WritingConfigStatus.DRAFT, index=True
    )
    is_active: Mapped[bool] = mapped_column(default=False, index=True)
    created_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("admins.id"), nullable=True, index=True
    )


class WritingAnchorItem(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "writing_anchor_items"

    anchor_set_id: Mapped[UUID] = mapped_column(
        ForeignKey("writing_anchor_sets.id"), index=True
    )
    band: Mapped[float] = mapped_column(Float)
    essay: Mapped[str] = mapped_column(Text)
    criteria: Mapped[dict] = mapped_column(JSONB, default=dict)
    rationale: Mapped[str] = mapped_column(Text, default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class WritingDescriptor(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "writing_descriptors"
    __table_args__ = (
        UniqueConstraint(
            "task_type_scope",
            "criterion_key",
            "band",
            "version",
            name="uq_writing_descriptors_scope_criterion_band_version",
        ),
    )

    task_type_scope: Mapped[WritingTaskTypeScope] = mapped_column(
        EnumValueString(WritingTaskTypeScope), index=True
    )
    criterion_key: Mapped[str] = mapped_column(String(64), index=True)
    band: Mapped[int] = mapped_column(Integer, index=True)
    descriptor_text: Mapped[str] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[WritingConfigStatus] = mapped_column(
        EnumValueString(WritingConfigStatus), default=WritingConfigStatus.PUBLISHED, index=True
    )
    is_active: Mapped[bool] = mapped_column(default=True, index=True)
    created_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("admins.id"), nullable=True, index=True
    )


class WritingBenchmarkCard(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "writing_benchmark_cards"

    card_id: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    task_type_scope: Mapped[WritingTaskTypeScope] = mapped_column(
        EnumValueString(WritingTaskTypeScope), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    band: Mapped[float] = mapped_column(Float, index=True)
    use_when: Mapped[str] = mapped_column(Text)
    benchmark_profile: Mapped[str] = mapped_column(Text)
    tolerance_lesson: Mapped[str] = mapped_column(Text)
    band_limiting_signs: Mapped[list] = mapped_column(JSONB, default=list)
    do_not_use_when: Mapped[str] = mapped_column(Text)
    tags: Mapped[list] = mapped_column(JSONB, default=list)
    source: Mapped[str] = mapped_column(String(120), default="blueprint_v1")
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[WritingConfigStatus] = mapped_column(
        EnumValueString(WritingConfigStatus), default=WritingConfigStatus.PUBLISHED, index=True
    )
    is_active: Mapped[bool] = mapped_column(default=True, index=True)
    created_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("admins.id"), nullable=True, index=True
    )


class WritingEvaluationRun(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "writing_evaluation_runs"

    submission_id: Mapped[UUID] = mapped_column(
        ForeignKey("writing_submissions.id"), unique=True, index=True
    )
    evaluation_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("writing_evaluations.id"), nullable=True, index=True
    )
    pipeline_version: Mapped[str] = mapped_column(String(32), default="blueprint_v1")
    mode: Mapped[str] = mapped_column(String(32), default="full_diagnostic")
    initial_scores: Mapped[dict] = mapped_column(JSONB, default=dict)
    selected_benchmarks: Mapped[list] = mapped_column(JSONB, default=list)
    calibration_result: Mapped[dict] = mapped_column(JSONB, default=dict)
    audit_result: Mapped[dict] = mapped_column(JSONB, default=dict)
    confidence: Mapped[str] = mapped_column(String(32), default="Medium")
    possible_score_range: Mapped[str] = mapped_column(String(32), default="")
    meta_learning_note: Mapped[str] = mapped_column(Text, default="")


class WritingConfigAuditLog(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "writing_config_audit_logs"

    actor_admin_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("admins.id"), nullable=True, index=True
    )
    entity_type: Mapped[WritingConfigEntityType] = mapped_column(
        EnumValueString(WritingConfigEntityType), index=True
    )
    entity_id: Mapped[UUID] = mapped_column(index=True)
    action: Mapped[str] = mapped_column(String(64))
    previous_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    new_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
