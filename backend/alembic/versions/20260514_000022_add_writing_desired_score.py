"""add desired score to writing submissions

Revision ID: 20260514_000022
Revises: 20260514_000021
Create Date: 2026-05-14
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260514_000022"
down_revision: str | None = "20260514_000021"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "writing_submissions",
        sa.Column("desired_score", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("writing_submissions", "desired_score")
