"""Reserve unique amounts only for active card-transfer invoices.

Revision ID: 20260924_000058
Revises: 20260924_000057
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260924_000058"
down_revision: str | None = "20260924_000057"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index("uq_payments_active_amount", table_name="payments")
    op.create_index(
        "uq_payments_active_amount",
        "payments",
        ["amount"],
        unique=True,
        postgresql_where=sa.text(
            "provider = 'card_transfer' AND archived_at IS NULL AND status IN ('pending', 'matched')"
        ),
    )


def downgrade() -> None:
    op.drop_index("uq_payments_active_amount", table_name="payments")
    op.create_index(
        "uq_payments_active_amount",
        "payments",
        ["amount"],
        unique=True,
        postgresql_where=sa.text("archived_at IS NULL AND status IN ('pending', 'matched')"),
    )
