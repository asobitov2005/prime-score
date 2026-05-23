"""add full test premium bonus guard

Revision ID: 20260523_000044
Revises: 20260522_000043
Create Date: 2026-05-23
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260523_000044"
down_revision: str | None = "20260522_000043"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("full_test_premium_bonus_granted_at", sa.DateTime(timezone=True), nullable=True))

    op.execute(
        sa.text(
            """
            UPDATE users AS u
            SET full_test_premium_bonus_granted_at = bonus.first_bonus_at
            FROM (
                SELECT a.user_id, MIN(e.created_at) AS first_bonus_at
                FROM attempt_events AS e
                JOIN attempts AS a ON a.id = e.attempt_id
                WHERE e.event_type = 'premium_bonus_granted'
                GROUP BY a.user_id
            ) AS bonus
            WHERE u.id = bonus.user_id
              AND u.full_test_premium_bonus_granted_at IS NULL
            """
        )
    )

    op.execute(
        sa.text(
            """
            UPDATE users AS u
            SET full_test_premium_bonus_granted_at = bonus.first_bonus_at
            FROM (
                SELECT user_id, MIN(COALESCE(submitted_at, updated_at, created_at)) AS first_bonus_at
                FROM attempts
                WHERE COALESCE((metadata ->> 'premium_bonus_granted')::boolean, false) = true
                GROUP BY user_id
            ) AS bonus
            WHERE u.id = bonus.user_id
              AND u.full_test_premium_bonus_granted_at IS NULL
            """
        )
    )


def downgrade() -> None:
    op.drop_column("users", "full_test_premium_bonus_granted_at")
