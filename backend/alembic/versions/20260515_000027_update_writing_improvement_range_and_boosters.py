"""update writing target range and score boosters prompt

Revision ID: 20260515_000027
Revises: 20260514_000026
Create Date: 2026-05-15
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime

from alembic import op
import sqlalchemy as sa

from app.models.enums import WritingPromptKey


revision: str = "20260515_000027"
down_revision: str | None = "20260514_000026"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


BOOSTER_LINE = (
    "\n- `score_boosters`: 3-6 exact original phrases or sentences that helped the score. "
    "Show criterion, original, why_it_scores, keep_doing, and band_value."
)


def upgrade() -> None:
    bind = op.get_bind()
    now = datetime.now(UTC)
    bind.execute(
        sa.text(
            """
            UPDATE writing_prompt_entries
            SET body = replace(
                    replace(body, 'next realistic +0.5 band', 'next realistic +0.5 to +1.0 band'),
                    'next +0.5 band',
                    'next realistic +0.5 to +1.0 band'
                ),
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
            UPDATE writing_prompt_entries
            SET body = body || :booster_line,
                updated_at = :updated_at
            WHERE key = :grader_key
              AND body NOT LIKE '%`score_boosters`:%'
            """
        ),
        {
            "booster_line": BOOSTER_LINE,
            "updated_at": now,
            "grader_key": WritingPromptKey.GRADER_USER_TEMPLATE.value,
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
