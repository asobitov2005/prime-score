"""sync writing prompt defaults

Revision ID: 20260516_000035
Revises: 20260516_000034
Create Date: 2026-05-16
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime

from alembic import op
import sqlalchemy as sa

from app.services.writing_config import DEFAULT_PROMPT_ENTRIES


revision: str = "20260516_000035"
down_revision: str | None = "20260516_000034"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    now = datetime.now(UTC)

    for key, body in DEFAULT_PROMPT_ENTRIES.items():
        bind.execute(
            sa.text(
                """
                UPDATE writing_prompt_entries
                SET body = :body,
                    updated_at = :updated_at
                WHERE key = :key
                """
            ),
            {
                "body": body,
                "updated_at": now,
                "key": key.value,
            },
        )

    bind.execute(
        sa.text(
            """
            UPDATE writing_prompt_profiles
            SET version = version + 1,
                updated_at = :updated_at
            WHERE EXISTS (
                SELECT 1
                FROM writing_prompt_entries
                WHERE writing_prompt_entries.profile_id = writing_prompt_profiles.id
                  AND writing_prompt_entries.key = ANY(:keys)
            )
            """
        ),
        {
            "updated_at": now,
            "keys": [key.value for key in DEFAULT_PROMPT_ENTRIES],
        },
    )


def downgrade() -> None:
    pass
