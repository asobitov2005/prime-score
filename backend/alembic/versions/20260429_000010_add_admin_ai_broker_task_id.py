"""add admin ai broker task id

Revision ID: 20260429_000010
Revises: 20260428_000009
Create Date: 2026-04-29 00:30:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260429_000010"
down_revision: str | None = "20260428_000009"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("admin_ai_jobs", sa.Column("broker_task_id", sa.String(length=255), nullable=True))
    op.create_index("ix_admin_ai_jobs_broker_task_id", "admin_ai_jobs", ["broker_task_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_admin_ai_jobs_broker_task_id", table_name="admin_ai_jobs")
    op.drop_column("admin_ai_jobs", "broker_task_id")
