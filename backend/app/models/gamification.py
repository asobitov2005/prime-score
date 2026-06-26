from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class XPTransaction(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "xp_transactions"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "type",
            "source_type",
            "source_id",
            name="uq_xp_transactions_user_type_source",
        ),
        # Leaderboard recompute filters/orders xp by created_at (weekly/monthly windows).
        Index("ix_xp_transactions_created_at", "created_at"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    transaction_type: Mapped[str] = mapped_column("type", String(64), index=True)
    source_type: Mapped[str] = mapped_column(String(64), index=True)
    source_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    xp_amount: Mapped[int] = mapped_column(Integer, default=0)
    counts_toward_leaderboard: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    metadata_json: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)


class Streak(TimestampMixin, Base):
    __tablename__ = "streaks"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), primary_key=True)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    best_streak: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    last_activity_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_activity_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    awarded_milestones: Mapped[list[int]] = mapped_column(JSONB, default=list)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)


class LeaderboardEntry(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "leaderboard_entries"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "period_type",
            "period_start",
            name="uq_leaderboard_entries_user_period",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    period_type: Mapped[str] = mapped_column(String(16), index=True)
    period_start: Mapped[date] = mapped_column(Date, index=True)
    xp_total: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    score_events: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    score_total: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    average_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    full_mock_completions: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    achieved_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
