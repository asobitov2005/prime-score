"""add admin auth version

Revision ID: 20260607_000045
Revises: 20260523_000044
Create Date: 2026-06-07
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260607_000045"
down_revision: str | None = "20260523_000044"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("admins", sa.Column("auth_version", sa.Integer(), nullable=False, server_default="1"))


def downgrade() -> None:
    op.drop_column("admins", "auth_version")
