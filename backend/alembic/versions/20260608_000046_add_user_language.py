"""add user language preference

Revision ID: 20260608_000046
Revises: 20260607_000045
Create Date: 2026-06-08
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260608_000046"
down_revision: str | None = "20260607_000045"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("language", sa.String(length=2), nullable=False, server_default="en"))


def downgrade() -> None:
    op.drop_column("users", "language")
