"""archive accidental regression test rows

Revision ID: 20260516_000036
Revises: 20260516_000035
Create Date: 2026-05-16
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260516_000036"
down_revision: str | None = "20260516_000035"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE tests
            SET status = 'archived'
            WHERE title ILIKE ANY(ARRAY[
                '%New Version Guard%',
                '%Publish Guard%',
                '%Guard Test%',
                '%Test Guard%',
                '%New Version Regression%',
                '%Publish Regression%',
                '%Regression Test%',
                '%Test Regression%'
            ])
            """
        )
    )


def downgrade() -> None:
    pass
