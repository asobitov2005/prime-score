"""create writing drafts table

Revision ID: 20260506_000016
Revises: 20260504_000015
Create Date: 2026-05-06 00:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260506_000016"
down_revision: str | None = "20260504_000015"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "writing_drafts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("draft_key", sa.String(length=160), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("writing_tasks.id"), nullable=True),
        sa.Column(
            "task_type",
            sa.Enum("TASK_1", "TASK_2", name="writingtasktype", native_enum=False),
            nullable=False,
        ),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("time_spent_seconds", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.UniqueConstraint("user_id", "draft_key", name="uq_writing_drafts_user_id_draft_key"),
    )
    op.create_index(op.f("ix_writing_drafts_user_id"), "writing_drafts", ["user_id"])
    op.create_index(op.f("ix_writing_drafts_draft_key"), "writing_drafts", ["draft_key"])
    op.create_index(op.f("ix_writing_drafts_task_id"), "writing_drafts", ["task_id"])
    op.create_index(op.f("ix_writing_drafts_task_type"), "writing_drafts", ["task_type"])


def downgrade() -> None:
    op.drop_index(op.f("ix_writing_drafts_task_type"), table_name="writing_drafts")
    op.drop_index(op.f("ix_writing_drafts_task_id"), table_name="writing_drafts")
    op.drop_index(op.f("ix_writing_drafts_draft_key"), table_name="writing_drafts")
    op.drop_index(op.f("ix_writing_drafts_user_id"), table_name="writing_drafts")
    op.drop_table("writing_drafts")
