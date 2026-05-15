"""fix writing prompt plus one range wording

Revision ID: 20260515_000028
Revises: 20260515_000027
Create Date: 2026-05-15
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime

from alembic import op
import sqlalchemy as sa

from app.models.enums import WritingPromptKey


revision: str = "20260515_000028"
down_revision: str | None = "20260515_000027"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    now = datetime.now(UTC)
    bind.execute(
        sa.text(
            """
            UPDATE writing_prompt_entries
            SET body = replace(body, 'next +0.5', 'next realistic +0.5 to +1.0'),
                updated_at = :updated_at
            WHERE key IN (:grader_key, :annotation_key)
            """
        ),
        {
            "updated_at": now,
            "grader_key": WritingPromptKey.GRADER_USER_TEMPLATE.value,
            "annotation_key": WritingPromptKey.ANNOTATION_PROMPT.value,
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
                  AND writing_prompt_entries.key IN (:grader_key, :annotation_key)
            )
            """
        ),
        {
            "updated_at": now,
            "grader_key": WritingPromptKey.GRADER_USER_TEMPLATE.value,
            "annotation_key": WritingPromptKey.ANNOTATION_PROMPT.value,
        },
    )


def downgrade() -> None:
    pass
