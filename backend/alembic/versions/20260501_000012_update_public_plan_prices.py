"""update public plan prices

Revision ID: 20260501_000012
Revises: 20260429_000011
Create Date: 2026-05-01 20:40:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260501_000012"
down_revision: str | None = "20260429_000011"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


UPDATED_PUBLIC_PLAN_PRICES = (
    ("00000000-0000-0000-0000-000000000230", "59000"),
    ("00000000-0000-0000-0000-000000000260", "79000"),
    ("00000000-0000-0000-0000-000000000090", "109000"),
)

PREVIOUS_PUBLIC_PLAN_PRICES = (
    ("00000000-0000-0000-0000-000000000230", "49000"),
    ("00000000-0000-0000-0000-000000000260", "69000"),
    ("00000000-0000-0000-0000-000000000090", "99000"),
)


def _apply_prices(prices: tuple[tuple[str, str], ...]) -> None:
    bind = op.get_bind()
    for plan_id, price_amount in prices:
        bind.execute(
            sa.text(
                """
                UPDATE plans
                SET price_amount = :price_amount
                WHERE id = CAST(:plan_id AS uuid)
                """
            ),
            {
                "plan_id": plan_id,
                "price_amount": price_amount,
            },
        )


def upgrade() -> None:
    _apply_prices(UPDATED_PUBLIC_PLAN_PRICES)


def downgrade() -> None:
    _apply_prices(PREVIOUS_PUBLIC_PLAN_PRICES)
