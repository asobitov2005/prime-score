"""add user profile override flags

Revision ID: 20260517_000040
Revises: 20260517_000039
Create Date: 2026-05-17
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260517_000040"
down_revision: str | None = "20260517_000039"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("name_is_custom", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "users",
        sa.Column("username_is_custom", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "users",
        sa.Column("avatar_is_custom", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    op.execute(
        sa.text(
            """
            UPDATE users
            SET
                name_is_custom = true,
                username_is_custom = true,
                avatar_is_custom = CASE
                    WHEN avatar_url IS NOT NULL THEN true
                    ELSE avatar_is_custom
                END
            WHERE
                telegram_contact_updated_at IS NOT NULL
                AND updated_at > telegram_contact_updated_at + INTERVAL '60 seconds'
            """
        )
    )


def downgrade() -> None:
    op.drop_column("users", "avatar_is_custom")
    op.drop_column("users", "username_is_custom")
    op.drop_column("users", "name_is_custom")
