"""update writing annotation prompt target wording

Revision ID: 20260514_000024
Revises: 20260514_000023
Create Date: 2026-05-14
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime

from alembic import op
import sqlalchemy as sa

from app.models.enums import WritingPromptKey


revision: str = "20260514_000024"
down_revision: str | None = "20260514_000023"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    now = datetime.now(UTC)
    bind.execute(
        sa.text(
            """
            UPDATE writing_prompt_entries
            SET body = body || :target_sentence,
                updated_at = :updated_at
            WHERE key = :key
              AND body NOT LIKE '%target score context%'
            """
        ),
        {
            "target_sentence": " Prioritize issues that block the target score context or the next realistic +0.5 band.",
            "updated_at": now,
            "key": WritingPromptKey.ANNOTATION_PROMPT.value,
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
                  AND writing_prompt_entries.key = :key
            )
            """
        ),
        {
            "updated_at": now,
            "key": WritingPromptKey.ANNOTATION_PROMPT.value,
        },
    )


def downgrade() -> None:
    pass
