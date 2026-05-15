"""make writing scoring stricter

Revision ID: 20260515_000029
Revises: 20260515_000028
Create Date: 2026-05-15
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime

from alembic import op
import sqlalchemy as sa

from app.models.enums import WritingPromptKey


revision: str = "20260515_000029"
down_revision: str | None = "20260515_000028"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


STRICT_SYSTEM_APPEND = (
    "\n\nStrict calibration: Do not award Band 8+ for safe, formulaic, or merely "
    "error-light writing unless the criterion clearly shows precision, flexibility, "
    "and depth. Formulaic transitions, basic repeated vocabulary, generic examples, "
    "or shallow development should normally cap the relevant criterion around "
    "Band 7.0-7.5."
)

STRICT_USER_BLOCK = """

STRICT SCORING CALIBRATION:
- Band 8 requires clear descriptor evidence, not just good structure and few mistakes.
- If ideas are clear but predictable or not deeply developed, Task Achievement is usually 7.0-7.5.
- If cohesion relies on obvious signals such as Firstly/Secondly/Another important point, Coherence is usually capped at 7.5 unless referencing and progression are genuinely sophisticated.
- If vocabulary is accurate but safe, repeated, or mostly common words, Lexical Resource is usually 7.0-7.5.
- If grammar is accurate but mostly safe and conventional, Grammar is usually 7.0-7.5.
- Overall Band 8 should be rare and must be justified by all four criteria, not by one polished paragraph.
- In `score_boosters`, `band_value` must describe scoring effect, not overclaim a band. Good: "supports Task Achievement". Bad: "Band 8 support".
"""


def upgrade() -> None:
    bind = op.get_bind()
    now = datetime.now(UTC)
    bind.execute(
        sa.text(
            """
            UPDATE writing_prompt_entries
            SET body = body || :append_text,
                updated_at = :updated_at
            WHERE key = :system_key
              AND body NOT LIKE '%Strict calibration:%'
            """
        ),
        {
            "append_text": STRICT_SYSTEM_APPEND,
            "updated_at": now,
            "system_key": WritingPromptKey.GRADER_SYSTEM.value,
        },
    )
    bind.execute(
        sa.text(
            """
            UPDATE writing_prompt_entries
            SET body = replace(body, :needle, :replacement),
                updated_at = :updated_at
            WHERE key = :user_key
              AND body NOT LIKE '%STRICT SCORING CALIBRATION:%'
            """
        ),
        {
            "needle": "\n{{ANNOTATION_PROMPT}}",
            "replacement": STRICT_USER_BLOCK + "\n{{ANNOTATION_PROMPT}}",
            "updated_at": now,
            "user_key": WritingPromptKey.GRADER_USER_TEMPLATE.value,
        },
    )
    bind.execute(
        sa.text(
            """
            UPDATE writing_prompt_entries
            SET body = replace(body, 'Band 8 support', 'supports the criterion'),
                updated_at = :updated_at
            WHERE key = :user_key
            """
        ),
        {
            "updated_at": now,
            "user_key": WritingPromptKey.GRADER_USER_TEMPLATE.value,
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
            "system_key": WritingPromptKey.GRADER_SYSTEM.value,
            "user_key": WritingPromptKey.GRADER_USER_TEMPLATE.value,
        },
    )


def downgrade() -> None:
    pass
