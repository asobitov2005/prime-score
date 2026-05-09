"""add telegram contact updated timestamp

Revision ID: 20260508_000018
Revises: 20260508_000017
Create Date: 2026-05-08 12:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260508_000018"
down_revision: str | None = "20260508_000017"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("telegram_contact_updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "telegram_contact_updated_at")
