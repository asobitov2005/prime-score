"""Keep each Click transaction attached to only one invoice.

Revision ID: 20260924_000057
Revises: 20260923_000056
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260924_000057"
down_revision: str | None = "20260923_000056"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "uq_payments_click_provider_reference",
        "payments",
        ["provider_reference"],
        unique=True,
        postgresql_where=sa.text("provider = 'click' AND provider_reference IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_payments_click_provider_reference", table_name="payments")
