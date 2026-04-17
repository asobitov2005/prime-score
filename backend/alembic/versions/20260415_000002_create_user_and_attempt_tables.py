"""create user and attempt tables

Revision ID: 20260415_000002
Revises: 20260415_000001
Create Date: 2026-04-15 13:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260415_000002"
down_revision: str | None = "20260415_000001"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=True),
        sa.Column("username", sa.String(length=50), nullable=True),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column("is_premium", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("premium_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("show_on_leaderboard", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("phone", name=op.f("uq_users_phone")),
        sa.UniqueConstraint("telegram_id", name=op.f("uq_users_telegram_id")),
    )
    op.create_index(op.f("ix_users_phone"), "users", ["phone"], unique=False)
    op.create_index(op.f("ix_users_telegram_id"), "users", ["telegram_id"], unique=False)

    op.create_table(
        "attempts",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("test_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("test_type", sa.String(length=32), nullable=False),
        sa.Column("mode", sa.String(length=32), nullable=False),
        sa.Column("scope", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("section_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("test_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("raw_score", sa.Integer(), nullable=True),
        sa.Column("max_score", sa.Integer(), nullable=True),
        sa.Column("band_score", sa.Float(), nullable=True),
        sa.Column("time_limit_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["section_id"], ["test_sections.id"], name=op.f("fk_attempts_section_id_test_sections")),
        sa.ForeignKeyConstraint(["test_id"], ["tests.id"], name=op.f("fk_attempts_test_id_tests")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_attempts_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_attempts")),
    )
    op.create_index(op.f("ix_attempts_test_id"), "attempts", ["test_id"], unique=False)
    op.create_index(op.f("ix_attempts_test_type"), "attempts", ["test_type"], unique=False)
    op.create_index(op.f("ix_attempts_user_id"), "attempts", ["user_id"], unique=False)

    op.create_table(
        "user_answers",
        sa.Column("attempt_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("awarded_score", sa.Float(), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["attempt_id"], ["attempts.id"], name=op.f("fk_user_answers_attempt_id_attempts")),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"], name=op.f("fk_user_answers_question_id_questions")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_answers")),
    )
    op.create_index(op.f("ix_user_answers_attempt_id"), "user_answers", ["attempt_id"], unique=False)
    op.create_index(op.f("ix_user_answers_question_id"), "user_answers", ["question_id"], unique=False)

    op.create_table(
        "attempt_events",
        sa.Column("attempt_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["attempt_id"], ["attempts.id"], name=op.f("fk_attempt_events_attempt_id_attempts")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_attempt_events")),
    )
    op.create_index(op.f("ix_attempt_events_attempt_id"), "attempt_events", ["attempt_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_attempt_events_attempt_id"), table_name="attempt_events")
    op.drop_table("attempt_events")
    op.drop_index(op.f("ix_user_answers_question_id"), table_name="user_answers")
    op.drop_index(op.f("ix_user_answers_attempt_id"), table_name="user_answers")
    op.drop_table("user_answers")
    op.drop_index(op.f("ix_attempts_user_id"), table_name="attempts")
    op.drop_index(op.f("ix_attempts_test_type"), table_name="attempts")
    op.drop_index(op.f("ix_attempts_test_id"), table_name="attempts")
    op.drop_table("attempts")
    op.drop_index(op.f("ix_users_telegram_id"), table_name="users")
    op.drop_index(op.f("ix_users_phone"), table_name="users")
    op.drop_table("users")
