"""create admin ai tables

Revision ID: 20260428_000008
Revises: 20260426_000007
Create Date: 2026-04-28 22:30:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260428_000008"
down_revision: str | None = "20260426_000007"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "admin_ai_threads",
        sa.Column("admin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("admins.id"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False, server_default="New AI task"),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="gemini"),
        sa.Column("model_name", sa.String(length=120), nullable=False, server_default="gemini-3.1-pro-preview"),
        sa.Column("task_kind", sa.String(length=64), nullable=False, server_default="test_builder"),
        sa.Column("status", sa.Enum("ACTIVE", "ARCHIVED", name="adminaithreadstatus", native_enum=False), nullable=False, server_default="ACTIVE"),
        sa.Column("last_job_status", sa.Enum("QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELED", name="adminaijobstatus", native_enum=False), nullable=True),
        sa.Column("context", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_admin_ai_threads")),
    )
    op.create_index(op.f("ix_admin_ai_threads_admin_id"), "admin_ai_threads", ["admin_id"], unique=False)

    op.create_table(
        "admin_ai_messages",
        sa.Column("thread_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("admin_ai_threads.id"), nullable=False),
        sa.Column("admin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("admins.id"), nullable=False),
        sa.Column("role", sa.Enum("USER", "ASSISTANT", name="adminaimessagerole", native_enum=False), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("tool_calls", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("extra_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_admin_ai_messages")),
    )
    op.create_index(op.f("ix_admin_ai_messages_admin_id"), "admin_ai_messages", ["admin_id"], unique=False)
    op.create_index(op.f("ix_admin_ai_messages_thread_id"), "admin_ai_messages", ["thread_id"], unique=False)

    op.create_table(
        "admin_ai_jobs",
        sa.Column("thread_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("admin_ai_threads.id"), nullable=False),
        sa.Column("admin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("admins.id"), nullable=False),
        sa.Column("user_message_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("admin_ai_messages.id"), nullable=True),
        sa.Column("assistant_message_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("admin_ai_messages.id"), nullable=True),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="gemini"),
        sa.Column("model_name", sa.String(length=120), nullable=False, server_default="gemini-3.1-pro-preview"),
        sa.Column("task_kind", sa.String(length=64), nullable=False, server_default="test_builder"),
        sa.Column("status", sa.Enum("QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELED", name="adminaijobstatus", native_enum=False), nullable=False, server_default="QUEUED"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("is_background", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("tool_trace", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("result_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_admin_ai_jobs")),
    )
    op.create_index(op.f("ix_admin_ai_jobs_admin_id"), "admin_ai_jobs", ["admin_id"], unique=False)
    op.create_index(op.f("ix_admin_ai_jobs_status"), "admin_ai_jobs", ["status"], unique=False)
    op.create_index(op.f("ix_admin_ai_jobs_thread_id"), "admin_ai_jobs", ["thread_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_admin_ai_jobs_thread_id"), table_name="admin_ai_jobs")
    op.drop_index(op.f("ix_admin_ai_jobs_status"), table_name="admin_ai_jobs")
    op.drop_index(op.f("ix_admin_ai_jobs_admin_id"), table_name="admin_ai_jobs")
    op.drop_table("admin_ai_jobs")

    op.drop_index(op.f("ix_admin_ai_messages_thread_id"), table_name="admin_ai_messages")
    op.drop_index(op.f("ix_admin_ai_messages_admin_id"), table_name="admin_ai_messages")
    op.drop_table("admin_ai_messages")

    op.drop_index(op.f("ix_admin_ai_threads_admin_id"), table_name="admin_ai_threads")
    op.drop_table("admin_ai_threads")
