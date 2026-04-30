"""archive legacy public plans

Revision ID: 20260426_000006
Revises: 20260426_000005
Create Date: 2026-04-26 23:05:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260426_000006"
down_revision: str | None = "20260426_000005"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


LEGACY_PUBLIC_PLAN_IDS = (
    "00000000-0000-0000-0000-000000000180",
    "00000000-0000-0000-0000-000000000365",
)


def upgrade() -> None:
    bind = op.get_bind()
    for plan_id in LEGACY_PUBLIC_PLAN_IDS:
        bind.execute(
            sa.text(
                """
                UPDATE plans
                SET
                    catalog = 'legacy',
                    is_active = FALSE,
                    display_order = 0,
                    badge_label = NULL,
                    perks = '[]'::jsonb,
                    is_featured = FALSE
                WHERE id = CAST(:plan_id AS uuid)
                """
            ),
            {"plan_id": plan_id},
        )


def downgrade() -> None:
    bind = op.get_bind()
    for plan_id in LEGACY_PUBLIC_PLAN_IDS:
        bind.execute(
            sa.text(
                """
                UPDATE plans
                SET
                    catalog = 'public',
                    is_active = TRUE
                WHERE id = CAST(:plan_id AS uuid)
                """
            ),
            {"plan_id": plan_id},
        )
