"""create writing tables

Revision ID: 20260503_000014
Revises: 20260501_000013
Create Date: 2026-05-03 12:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260503_000014"
down_revision: str | None = "20260501_000013"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "writing_tasks",
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column(
            "task_type",
            sa.Enum("TASK_1", "TASK_2", name="writingtasktype", native_enum=False),
            nullable=False,
        ),
        sa.Column("prompt_html", sa.Text(), nullable=False),
        sa.Column("image_storage_path", sa.String(length=512), nullable=True),
        sa.Column("image_summary", sa.Text(), nullable=True),
        sa.Column(
            "image_summary_status",
            sa.String(length=32),
            nullable=False,
            server_default="not_required",
        ),
        sa.Column("word_minimum", sa.Integer(), nullable=False, server_default="250"),
        sa.Column(
            "time_limit_seconds", sa.Integer(), nullable=False, server_default="2400"
        ),
        sa.Column(
            "difficulty",
            sa.Enum(
                "EASY", "MEDIUM", "HARD", name="writingdifficulty", native_enum=False
            ),
            nullable=False,
            server_default="MEDIUM",
        ),
        sa.Column(
            "status",
            sa.Enum(
                "DRAFT",
                "PUBLISHED",
                "ARCHIVED",
                name="writingtaskstatus",
                native_enum=False,
            ),
            nullable=False,
            server_default="DRAFT",
        ),
        sa.Column("source", sa.String(length=120), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sample_band", sa.Float(), nullable=True),
        sa.Column("sample_answer", sa.Text(), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("admins.id"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_writing_tasks")),
    )
    op.create_index(
        op.f("ix_writing_tasks_task_type"), "writing_tasks", ["task_type"]
    )
    op.create_index(op.f("ix_writing_tasks_status"), "writing_tasks", ["status"])
    op.create_index(
        op.f("ix_writing_tasks_created_by"), "writing_tasks", ["created_by"]
    )

    op.create_table(
        "writing_submissions",
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "task_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("writing_tasks.id"),
            nullable=False,
        ),
        sa.Column(
            "task_type",
            sa.Enum("TASK_1", "TASK_2", name="writingtasktype", native_enum=False),
            nullable=False,
        ),
        sa.Column("essay_text", sa.Text(), nullable=False),
        sa.Column("word_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("essay_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "QUEUED",
                "GRADING",
                "COMPLETED",
                "FAILED",
                name="writingsubmissionstatus",
                native_enum=False,
            ),
            nullable=False,
            server_default="QUEUED",
        ),
        sa.Column("celery_task_id", sa.String(length=120), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "time_spent_seconds", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_writing_submissions")),
    )
    op.create_index(
        op.f("ix_writing_submissions_user_id"), "writing_submissions", ["user_id"]
    )
    op.create_index(
        op.f("ix_writing_submissions_task_id"), "writing_submissions", ["task_id"]
    )
    op.create_index(
        op.f("ix_writing_submissions_task_type"),
        "writing_submissions",
        ["task_type"],
    )
    op.create_index(
        op.f("ix_writing_submissions_status"), "writing_submissions", ["status"]
    )
    op.create_index(
        op.f("ix_writing_submissions_essay_hash"),
        "writing_submissions",
        ["essay_hash"],
    )
    op.create_index(
        op.f("ix_writing_submissions_submitted_at"),
        "writing_submissions",
        ["submitted_at"],
    )

    op.create_table(
        "writing_evaluations",
        sa.Column(
            "submission_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("writing_submissions.id"),
            nullable=False,
        ),
        sa.Column("task_achievement_band", sa.Float(), nullable=False),
        sa.Column("coherence_band", sa.Float(), nullable=False),
        sa.Column("lexical_band", sa.Float(), nullable=False),
        sa.Column("grammar_band", sa.Float(), nullable=False),
        sa.Column("overall_band", sa.Float(), nullable=False),
        sa.Column("potential_band", sa.Float(), nullable=True),
        sa.Column(
            "word_count_penalty", sa.Float(), nullable=False, server_default="0"
        ),
        sa.Column(
            "feedback",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "inline_annotations",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("improved_version", sa.Text(), nullable=True),
        sa.Column(
            "rubric_reasoning",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "model_version", sa.String(length=120), nullable=False, server_default=""
        ),
        sa.Column(
            "prompt_version", sa.String(length=32), nullable=False, server_default="v1"
        ),
        sa.Column(
            "anchors_version",
            sa.String(length=32),
            nullable=False,
            server_default="v1",
        ),
        sa.Column("latency_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "cache_hit", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("graded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_writing_evaluations")),
        sa.UniqueConstraint(
            "submission_id", name=op.f("uq_writing_evaluations_submission_id")
        ),
    )
    op.create_index(
        op.f("ix_writing_evaluations_overall_band"),
        "writing_evaluations",
        ["overall_band"],
    )
    op.create_index(
        op.f("ix_writing_evaluations_graded_at"),
        "writing_evaluations",
        ["graded_at"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_writing_evaluations_graded_at"), table_name="writing_evaluations"
    )
    op.drop_index(
        op.f("ix_writing_evaluations_overall_band"), table_name="writing_evaluations"
    )
    op.drop_table("writing_evaluations")

    for idx in (
        "ix_writing_submissions_submitted_at",
        "ix_writing_submissions_essay_hash",
        "ix_writing_submissions_status",
        "ix_writing_submissions_task_type",
        "ix_writing_submissions_task_id",
        "ix_writing_submissions_user_id",
    ):
        op.drop_index(op.f(idx), table_name="writing_submissions")
    op.drop_table("writing_submissions")

    for idx in (
        "ix_writing_tasks_created_by",
        "ix_writing_tasks_status",
        "ix_writing_tasks_task_type",
    ):
        op.drop_index(op.f(idx), table_name="writing_tasks")
    op.drop_table("writing_tasks")
