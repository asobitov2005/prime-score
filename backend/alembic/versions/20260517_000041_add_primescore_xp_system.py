"""add primescore xp system

Revision ID: 20260517_000041
Revises: 20260517_000040
Create Date: 2026-05-17
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260517_000041"
down_revision: str | None = "20260517_000040"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("total_xp", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("current_level", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("users", sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("best_streak", sa.Integer(), nullable=False, server_default="0"))

    op.create_table(
        "xp_transactions",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("source_type", sa.String(length=64), nullable=False),
        sa.Column("source_id", sa.String(length=64), nullable=True),
        sa.Column("xp_amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("counts_toward_leaderboard", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_xp_transactions")),
        sa.UniqueConstraint("user_id", "type", "source_type", "source_id", name="uq_xp_transactions_user_type_source"),
    )
    op.create_index(op.f("ix_xp_transactions_user_id"), "xp_transactions", ["user_id"])
    op.create_index(op.f("ix_xp_transactions_type"), "xp_transactions", ["type"])
    op.create_index(op.f("ix_xp_transactions_source_type"), "xp_transactions", ["source_type"])
    op.create_index(op.f("ix_xp_transactions_source_id"), "xp_transactions", ["source_id"])

    op.create_table(
        "streaks",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("best_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_activity_date", sa.Date(), nullable=True),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("awarded_milestones", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("user_id", name=op.f("pk_streaks")),
    )

    op.create_table(
        "leaderboard_entries",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("period_type", sa.String(length=16), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("xp_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("score_events", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("score_total", sa.Float(), nullable=False, server_default="0"),
        sa.Column("average_score", sa.Float(), nullable=True),
        sa.Column("full_mock_completions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("achieved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_leaderboard_entries")),
        sa.UniqueConstraint("user_id", "period_type", "period_start", name="uq_leaderboard_entries_user_period"),
    )
    op.create_index(op.f("ix_leaderboard_entries_user_id"), "leaderboard_entries", ["user_id"])
    op.create_index(op.f("ix_leaderboard_entries_period_type"), "leaderboard_entries", ["period_type"])
    op.create_index(op.f("ix_leaderboard_entries_period_start"), "leaderboard_entries", ["period_start"])


def downgrade() -> None:
    op.drop_index(op.f("ix_leaderboard_entries_period_start"), table_name="leaderboard_entries")
    op.drop_index(op.f("ix_leaderboard_entries_period_type"), table_name="leaderboard_entries")
    op.drop_index(op.f("ix_leaderboard_entries_user_id"), table_name="leaderboard_entries")
    op.drop_table("leaderboard_entries")

    op.drop_table("streaks")

    op.drop_index(op.f("ix_xp_transactions_source_id"), table_name="xp_transactions")
    op.drop_index(op.f("ix_xp_transactions_source_type"), table_name="xp_transactions")
    op.drop_index(op.f("ix_xp_transactions_type"), table_name="xp_transactions")
    op.drop_index(op.f("ix_xp_transactions_user_id"), table_name="xp_transactions")
    op.drop_table("xp_transactions")

    op.drop_column("users", "best_streak")
    op.drop_column("users", "current_streak")
    op.drop_column("users", "current_level")
    op.drop_column("users", "total_xp")
