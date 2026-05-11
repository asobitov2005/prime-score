from __future__ import annotations

from uuid import UUID

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class SpeakingTest(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "speaking_tests"

    title: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)
    access_type: Mapped[str] = mapped_column(String(32), default="public", index=True)
    mode_kind: Mapped[str] = mapped_column(String(32), default="full")
    source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source_detail: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=14)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_by: Mapped[UUID | None] = mapped_column(ForeignKey("admins.id"), nullable=True, index=True)


class SpeakingTestPart(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "speaking_test_parts"

    speaking_test_id: Mapped[UUID] = mapped_column(ForeignKey("speaking_tests.id"), index=True)
    part_number: Mapped[int] = mapped_column(Integer, index=True)
    selection_strategy: Mapped[str] = mapped_column(String(32), default="fixed")
    prompt_count: Mapped[int] = mapped_column(Integer, default=1)
    prep_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    response_target_seconds: Mapped[int] = mapped_column(Integer, default=120)
    part_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)


class SpeakingTopic(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "speaking_topics"

    part_number: Mapped[int] = mapped_column(Integer, index=True)
    topic_title: Mapped[str] = mapped_column(String(255))
    prompt_text: Mapped[str] = mapped_column(Text)
    bullet_points: Mapped[list] = mapped_column(JSONB, default=list)
    followup_group_key: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    difficulty_label: Mapped[str | None] = mapped_column(String(32), nullable=True)
    category_tags: Mapped[list] = mapped_column(JSONB, default=list)
    source_kind: Mapped[str] = mapped_column(String(32), default="custom")
    source_note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    seed_rank: Mapped[int] = mapped_column(Integer, default=0)
    topic_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)


class SpeakingTopicQuestionItem(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "speaking_topic_question_items"

    speaking_topic_id: Mapped[UUID] = mapped_column(ForeignKey("speaking_topics.id"), index=True)
    position: Mapped[int] = mapped_column(Integer, default=1)
    question_text: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(32), default="main")
    item_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)


class SpeakingSession(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "speaking_sessions"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    speaking_test_id: Mapped[UUID] = mapped_column(ForeignKey("speaking_tests.id"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    entry_mode: Mapped[str] = mapped_column(String(32), default="full")
    current_part: Mapped[int | None] = mapped_column(Integer, nullable=True)
    live_provider: Mapped[str | None] = mapped_column(String(64), nullable=True)
    live_model_code: Mapped[str | None] = mapped_column(String(128), nullable=True)
    live_session_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    ephemeral_session_token_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    warning_count: Mapped[int] = mapped_column(Integer, default=0)
    termination_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    started_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    graded_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    session_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)


class SpeakingSessionPart(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "speaking_session_parts"

    speaking_session_id: Mapped[UUID] = mapped_column(ForeignKey("speaking_sessions.id"), index=True)
    part_number: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32), default="queued")
    topic_id: Mapped[UUID | None] = mapped_column(ForeignKey("speaking_topics.id"), nullable=True, index=True)
    response_seconds: Mapped[int] = mapped_column(Integer, default=0)
    part_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)


class SpeakingAudioAsset(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "speaking_audio_assets"

    speaking_session_id: Mapped[UUID] = mapped_column(ForeignKey("speaking_sessions.id"), index=True)
    speaking_session_part_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("speaking_session_parts.id"), nullable=True, index=True
    )
    speaker_role: Mapped[str] = mapped_column(String(32))
    storage_path: Mapped[str] = mapped_column(String(500))
    mime_type: Mapped[str] = mapped_column(String(100))
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    channel_kind: Mapped[str] = mapped_column(String(32), default="full_mix")
    asset_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)


class SpeakingTurn(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "speaking_turns"

    speaking_session_id: Mapped[UUID] = mapped_column(ForeignKey("speaking_sessions.id"), index=True)
    speaking_session_part_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("speaking_session_parts.id"), nullable=True, index=True
    )
    speaker_role: Mapped[str] = mapped_column(String(32), index=True)
    turn_index: Mapped[int] = mapped_column(Integer, default=0)
    text_raw: Mapped[str] = mapped_column(Text, default="")
    text_normalized: Mapped[str | None] = mapped_column(Text, nullable=True)
    language_code: Mapped[str | None] = mapped_column(String(16), nullable=True)
    audio_asset_id: Mapped[UUID | None] = mapped_column(ForeignKey("speaking_audio_assets.id"), nullable=True)
    interruption_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    turn_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)


class SpeakingEvent(UUIDMixin, Base):
    __tablename__ = "speaking_events"

    speaking_session_id: Mapped[UUID] = mapped_column(ForeignKey("speaking_sessions.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(80))
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False)


class SpeakingEvaluation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "speaking_evaluations"

    speaking_session_id: Mapped[UUID] = mapped_column(ForeignKey("speaking_sessions.id"), unique=True, index=True)
    overall_band: Mapped[float | None] = mapped_column(Float, nullable=True)
    fluency_band: Mapped[float | None] = mapped_column(Float, nullable=True)
    lexical_band: Mapped[float | None] = mapped_column(Float, nullable=True)
    grammar_band: Mapped[float | None] = mapped_column(Float, nullable=True)
    pronunciation_band: Mapped[float | None] = mapped_column(Float, nullable=True)
    integrity_penalty_applied: Mapped[bool] = mapped_column(Boolean, default=False)
    integrity_penalty_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    summary_feedback: Mapped[str] = mapped_column(Text, default="")
    strengths: Mapped[list] = mapped_column(JSONB, default=list)
    critical_issues: Mapped[list] = mapped_column(JSONB, default=list)
    pronunciation_issues: Mapped[list] = mapped_column(JSONB, default=list)
    grammar_issues: Mapped[list] = mapped_column(JSONB, default=list)
    lexical_issues: Mapped[list] = mapped_column(JSONB, default=list)
    improvement_actions: Mapped[list] = mapped_column(JSONB, default=list)
    deep_feedback_markdown: Mapped[str] = mapped_column(Text, default="")
    evaluator_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    rubric_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
