"""add roast_feedback to writing_evaluations

Revision ID: 20260504_000015
Revises: 20260503_000014
Create Date: 2026-05-04 00:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260504_000015"
down_revision: str | None = "20260503_000014"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "writing_evaluations",
        sa.Column(
            "roast_feedback",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.alter_column("writing_evaluations", "roast_feedback", server_default=None)


def downgrade() -> None:
    op.drop_column("writing_evaluations", "roast_feedback")
