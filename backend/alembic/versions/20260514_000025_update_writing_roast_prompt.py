"""update writing roast prompt tone

Revision ID: 20260514_000025
Revises: 20260514_000024
Create Date: 2026-05-14
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime

from alembic import op
import sqlalchemy as sa

from app.models.enums import WritingPromptKey
from app.services.writing_config import DEFAULT_PROMPT_ENTRIES


revision: str = "20260514_000025"
down_revision: str | None = "20260514_000024"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    now = datetime.now(UTC)
    for key in (WritingPromptKey.ROAST_SYSTEM, WritingPromptKey.ROAST_USER_TEMPLATE):
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
                "body": DEFAULT_PROMPT_ENTRIES[key],
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
                  AND writing_prompt_entries.key IN (:system_key, :user_key)
            )
            """
        ),
        {
            "updated_at": now,
            "system_key": WritingPromptKey.ROAST_SYSTEM.value,
            "user_key": WritingPromptKey.ROAST_USER_TEMPLATE.value,
        },
    )


def downgrade() -> None:
    pass
