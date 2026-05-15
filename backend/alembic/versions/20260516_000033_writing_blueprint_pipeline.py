"""Add writing blueprint descriptors, benchmarks, and evaluation runs.

Revision ID: 20260516_000033
Revises: 20260515_000032
Create Date: 2026-05-16 00:33:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence
from uuid import uuid4

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from app.services.writing_blueprint import BLUEPRINT_BENCHMARK_CARDS, descriptor_seed_rows


revision: str = "20260516_000033"
down_revision: str | None = "20260515_000032"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "writing_descriptors",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("task_type_scope", sa.String(length=32), nullable=False),
        sa.Column("criterion_key", sa.String(length=64), nullable=False),
        sa.Column("band", sa.Integer(), nullable=False),
        sa.Column("descriptor_text", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="published"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("admins.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_writing_descriptors")),
        sa.UniqueConstraint(
            "task_type_scope",
            "criterion_key",
            "band",
            "version",
            name="uq_writing_descriptors_scope_criterion_band_version",
        ),
    )
    op.create_index(op.f("ix_writing_descriptors_task_type_scope"), "writing_descriptors", ["task_type_scope"], unique=False)
    op.create_index(op.f("ix_writing_descriptors_criterion_key"), "writing_descriptors", ["criterion_key"], unique=False)
    op.create_index(op.f("ix_writing_descriptors_band"), "writing_descriptors", ["band"], unique=False)
    op.create_index(op.f("ix_writing_descriptors_status"), "writing_descriptors", ["status"], unique=False)
    op.create_index(op.f("ix_writing_descriptors_is_active"), "writing_descriptors", ["is_active"], unique=False)
    op.create_index(op.f("ix_writing_descriptors_created_by"), "writing_descriptors", ["created_by"], unique=False)

    op.create_table(
        "writing_benchmark_cards",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("card_id", sa.String(length=120), nullable=False),
        sa.Column("task_type_scope", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("band", sa.Float(), nullable=False),
        sa.Column("use_when", sa.Text(), nullable=False),
        sa.Column("benchmark_profile", sa.Text(), nullable=False),
        sa.Column("tolerance_lesson", sa.Text(), nullable=False),
        sa.Column("band_limiting_signs", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("do_not_use_when", sa.Text(), nullable=False),
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("source", sa.String(length=120), nullable=False, server_default="blueprint_v1"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="published"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("admins.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_writing_benchmark_cards")),
        sa.UniqueConstraint("card_id", name=op.f("uq_writing_benchmark_cards_card_id")),
    )
    op.create_index(op.f("ix_writing_benchmark_cards_card_id"), "writing_benchmark_cards", ["card_id"], unique=True)
    op.create_index(op.f("ix_writing_benchmark_cards_task_type_scope"), "writing_benchmark_cards", ["task_type_scope"], unique=False)
    op.create_index(op.f("ix_writing_benchmark_cards_band"), "writing_benchmark_cards", ["band"], unique=False)
    op.create_index(op.f("ix_writing_benchmark_cards_status"), "writing_benchmark_cards", ["status"], unique=False)
    op.create_index(op.f("ix_writing_benchmark_cards_is_active"), "writing_benchmark_cards", ["is_active"], unique=False)
    op.create_index(op.f("ix_writing_benchmark_cards_created_by"), "writing_benchmark_cards", ["created_by"], unique=False)

    op.create_table(
        "writing_evaluation_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("writing_submissions.id"), nullable=False),
        sa.Column("evaluation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("writing_evaluations.id"), nullable=True),
        sa.Column("pipeline_version", sa.String(length=32), nullable=False, server_default="blueprint_v1"),
        sa.Column("mode", sa.String(length=32), nullable=False, server_default="full_diagnostic"),
        sa.Column("initial_scores", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("selected_benchmarks", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("calibration_result", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("audit_result", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("confidence", sa.String(length=32), nullable=False, server_default="Medium"),
        sa.Column("possible_score_range", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("meta_learning_note", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_writing_evaluation_runs")),
        sa.UniqueConstraint("submission_id", name=op.f("uq_writing_evaluation_runs_submission_id")),
    )
    op.create_index(op.f("ix_writing_evaluation_runs_submission_id"), "writing_evaluation_runs", ["submission_id"], unique=True)
    op.create_index(op.f("ix_writing_evaluation_runs_evaluation_id"), "writing_evaluation_runs", ["evaluation_id"], unique=False)

    descriptors_table = sa.table(
        "writing_descriptors",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("task_type_scope", sa.String()),
        sa.column("criterion_key", sa.String()),
        sa.column("band", sa.Integer()),
        sa.column("descriptor_text", sa.Text()),
        sa.column("version", sa.Integer()),
        sa.column("status", sa.String()),
        sa.column("is_active", sa.Boolean()),
    )
    op.bulk_insert(
        descriptors_table,
        [
            {
                "id": uuid4(),
                "status": "published",
                "is_active": True,
                **row,
            }
            for row in descriptor_seed_rows()
        ],
    )

    cards_table = sa.table(
        "writing_benchmark_cards",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("card_id", sa.String()),
        sa.column("task_type_scope", sa.String()),
        sa.column("title", sa.String()),
        sa.column("band", sa.Float()),
        sa.column("use_when", sa.Text()),
        sa.column("benchmark_profile", sa.Text()),
        sa.column("tolerance_lesson", sa.Text()),
        sa.column("band_limiting_signs", postgresql.JSONB(astext_type=sa.Text())),
        sa.column("do_not_use_when", sa.Text()),
        sa.column("tags", postgresql.JSONB(astext_type=sa.Text())),
        sa.column("source", sa.String()),
        sa.column("version", sa.Integer()),
        sa.column("status", sa.String()),
        sa.column("is_active", sa.Boolean()),
    )
    op.bulk_insert(
        cards_table,
        [
            {
                "id": uuid4(),
                "status": "published",
                "is_active": True,
                **card,
            }
            for card in BLUEPRINT_BENCHMARK_CARDS
        ],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_writing_evaluation_runs_evaluation_id"), table_name="writing_evaluation_runs")
    op.drop_index(op.f("ix_writing_evaluation_runs_submission_id"), table_name="writing_evaluation_runs")
    op.drop_table("writing_evaluation_runs")

    op.drop_index(op.f("ix_writing_benchmark_cards_created_by"), table_name="writing_benchmark_cards")
    op.drop_index(op.f("ix_writing_benchmark_cards_is_active"), table_name="writing_benchmark_cards")
    op.drop_index(op.f("ix_writing_benchmark_cards_status"), table_name="writing_benchmark_cards")
    op.drop_index(op.f("ix_writing_benchmark_cards_band"), table_name="writing_benchmark_cards")
    op.drop_index(op.f("ix_writing_benchmark_cards_task_type_scope"), table_name="writing_benchmark_cards")
    op.drop_index(op.f("ix_writing_benchmark_cards_card_id"), table_name="writing_benchmark_cards")
    op.drop_table("writing_benchmark_cards")

    op.drop_index(op.f("ix_writing_descriptors_created_by"), table_name="writing_descriptors")
    op.drop_index(op.f("ix_writing_descriptors_is_active"), table_name="writing_descriptors")
    op.drop_index(op.f("ix_writing_descriptors_status"), table_name="writing_descriptors")
    op.drop_index(op.f("ix_writing_descriptors_band"), table_name="writing_descriptors")
    op.drop_index(op.f("ix_writing_descriptors_criterion_key"), table_name="writing_descriptors")
    op.drop_index(op.f("ix_writing_descriptors_task_type_scope"), table_name="writing_descriptors")
    op.drop_table("writing_descriptors")
