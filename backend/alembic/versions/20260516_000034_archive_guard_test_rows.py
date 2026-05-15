"""Archive accidental guard test rows.

Revision ID: 20260516_000034
Revises: 20260516_000033
Create Date: 2026-05-16 00:34:00.000000
"""

from collections.abc import Sequence

from alembic import op


revision: str = "20260516_000034"
down_revision: str | None = "20260516_000033"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE tests
        SET status = 'archived'
        WHERE title ILIKE '%New Version Guard%'
           OR title ILIKE '%Publish Guard%'
           OR title ILIKE '%Guard Test%'
           OR title ILIKE '%Test Guard%'
        """
    )


def downgrade() -> None:
    # Intentionally no-op: restoring accidental guard rows to the catalog would
    # reintroduce the production pollution this migration removes.
    pass
