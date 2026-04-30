"""add test review status

Revision ID: 20260426_000007
Revises: 20260426_000006
Create Date: 2026-04-26 23:30:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260426_000007"
down_revision: str | None = "20260426_000006"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "tests",
        sa.Column("review_status", sa.String(length=32), nullable=False, server_default="needs_review"),
    )
    op.execute(
        """
        UPDATE tests
        SET review_status = CASE
            WHEN status = 'PUBLISHED' THEN 'approved'
            WHEN status = 'ARCHIVED' THEN 'approved'
            ELSE 'needs_review'
        END
        """
    )
    op.alter_column("tests", "review_status", server_default=None)
    op.create_index(op.f("ix_tests_review_status"), "tests", ["review_status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_tests_review_status"), table_name="tests")
    op.drop_column("tests", "review_status")
