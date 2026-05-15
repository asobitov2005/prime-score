"""update default writing prompts for desired score feedback

Revision ID: 20260514_000023
Revises: 20260514_000022
Create Date: 2026-05-14
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime

from alembic import op
import sqlalchemy as sa

from app.models.enums import WritingPromptKey


revision: str = "20260514_000023"
down_revision: str | None = "20260514_000022"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    now = datetime.now(UTC)
    target_block = (
        "TARGET SCORE CONTEXT:\n"
        "{{TARGET_CONTEXT}}\n\n"
        "COACHING OUTPUT RULES:"
    )

    bind.execute(
        sa.text(
            """
            UPDATE writing_prompt_entries
            SET body = replace(body, 'COACHING OUTPUT RULES:', :target_block),
                updated_at = :updated_at
            WHERE key = :key
              AND body NOT LIKE '%{{TARGET_CONTEXT}}%'
            """
        ),
        {
            "target_block": target_block,
            "updated_at": now,
            "key": WritingPromptKey.GRADER_USER_TEMPLATE.value,
        },
    )

    bind.execute(
        sa.text(
            """
            UPDATE writing_prompt_entries
            SET body = replace(
                    body,
                    'holding this essay below Band 9',
                    'holding this essay below the learner''s target band or the next realistic +0.5 band'
                ),
                updated_at = :updated_at
            WHERE key = :key
            """
        ),
        {
            "updated_at": now,
            "key": WritingPromptKey.ANNOTATION_PROMPT.value,
        },
    )

    improved_anchor = "- Current band: {{CURRENT_BAND}}. Aim for no more than Band {{TARGET_BAND}}."
    improved_replacement = (
        "- Current band: {{CURRENT_BAND}}. Aim for no more than Band {{TARGET_BAND}}.\n"
        "- Desired score context: {{DESIRED_SCORE_CONTEXT}}"
    )
    bind.execute(
        sa.text(
            """
            UPDATE writing_prompt_entries
            SET body = replace(body, :anchor, :replacement),
                updated_at = :updated_at
            WHERE key = :key
              AND body NOT LIKE '%{{DESIRED_SCORE_CONTEXT}}%'
            """
        ),
        {
            "anchor": improved_anchor,
            "replacement": improved_replacement,
            "updated_at": now,
            "key": WritingPromptKey.IMPROVED_VERSION_PROMPT.value,
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
                  AND writing_prompt_entries.key IN (:grader_key, :annotation_key, :improved_key)
            )
            """
        ),
        {
            "updated_at": now,
            "grader_key": WritingPromptKey.GRADER_USER_TEMPLATE.value,
            "annotation_key": WritingPromptKey.ANNOTATION_PROMPT.value,
            "improved_key": WritingPromptKey.IMPROVED_VERSION_PROMPT.value,
        },
    )


def downgrade() -> None:
    # Prompt edits are managed in admin after migration, so downgrade leaves
    # current DB prompt text intact.
    pass
