"""add_writing_question_subtype

Revision ID: 20260508_000017
Revises: 20260506_000016_create_writing_drafts_table
Create Date: 2026-05-08
"""

from alembic import op
import sqlalchemy as sa

revision = "20260508_000017"
down_revision = "20260506_000016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "writing_tasks",
        sa.Column("question_subtype", sa.String(60), nullable=True),
    )
    op.create_index(
        "ix_writing_tasks_question_subtype",
        "writing_tasks",
        ["question_subtype"],
    )


def downgrade() -> None:
    op.drop_index("ix_writing_tasks_question_subtype", table_name="writing_tasks")
    op.drop_column("writing_tasks", "question_subtype")
