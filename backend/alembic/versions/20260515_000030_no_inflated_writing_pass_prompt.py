"""prevent inflated writing target pass scoring

Revision ID: 20260515_000030
Revises: 20260515_000029
Create Date: 2026-05-15
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime

from alembic import op
import sqlalchemy as sa

from app.models.enums import WritingPromptKey


revision: str = "20260515_000030"
down_revision: str | None = "20260515_000029"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


NO_INFLATION_SYSTEM_APPEND = (
    "\n\nTarget integrity: The learner's desired score is only a coaching goal, "
    "not a reason to raise the score. Never inflate a band so the learner "
    "passes the target. Award the current band only when official descriptor "
    "evidence supports it."
)


NO_INFLATION_USER_BLOCK = """

TARGET INTEGRITY RULES:
- Desired Score is a coaching target only. It must not increase the awarded band.
- Do not mark the essay as effectively target-ready unless the actual descriptor evidence meets or exceeds that band.
- If evidence sits between two bands, choose the lower band unless the higher-band descriptor is consistently proven across the whole essay.
- Penalize missing or weak required task features directly: Task 1 overview/key features/data/comparisons; Task 2 conclusion/position/full coverage/developed support.
- Do not reward fluent but generic writing with Band 8. Safe, correct, predictable writing is usually Band 7.0-7.5.
- If the learner already exceeds the desired score, actions should protect the current score and target only the next realistic +0.5, not over-praise.
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
              AND body NOT LIKE '%Target integrity:%'
            """
        ),
        {
            "append_text": NO_INFLATION_SYSTEM_APPEND,
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
              AND body NOT LIKE '%TARGET INTEGRITY RULES:%'
            """
        ),
        {
            "needle": "\n{{ANNOTATION_PROMPT}}",
            "replacement": NO_INFLATION_USER_BLOCK + "\n{{ANNOTATION_PROMPT}}",
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
