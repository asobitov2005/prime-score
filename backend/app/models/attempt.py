from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Enum, ForeignKey, Float, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import AttemptMode, AttemptScope, AttemptStatus, TestType


class Attempt(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "attempts"
    __table_args__ = (
        # Hot path: per-user completed-attempt lookups (leaderboard, stats, history).
        Index("ix_attempts_user_id_status", "user_id", "status"),
        # ORDER BY created_at DESC for admin/user listings and daily trends.
        Index("ix_attempts_created_at", "created_at"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    test_id: Mapped[UUID] = mapped_column(ForeignKey("tests.id"), index=True)
    test_type: Mapped[TestType] = mapped_column(Enum(TestType, native_enum=False), index=True)
    mode: Mapped[AttemptMode] = mapped_column(Enum(AttemptMode, native_enum=False))
    scope: Mapped[AttemptScope] = mapped_column(Enum(AttemptScope, native_enum=False))
    status: Mapped[AttemptStatus] = mapped_column(Enum(AttemptStatus, native_enum=False), default=AttemptStatus.IN_PROGRESS)
    section_id: Mapped[UUID | None] = mapped_column(ForeignKey("test_sections.id"), nullable=True)
    test_snapshot: Mapped[dict] = mapped_column(JSONB, default=dict)
    raw_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    band_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    time_limit_seconds: Mapped[int] = mapped_column(Integer, default=0)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attempt_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)


class UserAnswer(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "user_answers"

    attempt_id: Mapped[UUID] = mapped_column(ForeignKey("attempts.id"), index=True)
    question_id: Mapped[UUID] = mapped_column(ForeignKey("questions.id"), index=True)
    value: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_correct: Mapped[bool | None] = mapped_column(nullable=True)
    awarded_score: Mapped[float | None] = mapped_column(Float, nullable=True)


class AttemptEvent(UUIDMixin, Base):
    __tablename__ = "attempt_events"

    attempt_id: Mapped[UUID] = mapped_column(ForeignKey("attempts.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(80))
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
