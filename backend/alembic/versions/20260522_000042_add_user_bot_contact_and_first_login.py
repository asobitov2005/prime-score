"""add user bot contact and first login timestamps

Revision ID: 20260522_000042
Revises: 20260517_000041
Create Date: 2026-05-22
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260522_000042"
down_revision: str | None = "20260517_000041"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("bot_contact_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("first_login_at", sa.DateTime(timezone=True), nullable=True))
    op.execute(sa.text("UPDATE users SET first_login_at = created_at WHERE first_login_at IS NULL"))


def downgrade() -> None:
    op.drop_column("users", "first_login_at")
    op.drop_column("users", "bot_contact_at")
