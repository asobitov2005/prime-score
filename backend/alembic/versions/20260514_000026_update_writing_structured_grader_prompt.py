"""add structured target grading prompt fields

Revision ID: 20260514_000026
Revises: 20260514_000025
Create Date: 2026-05-14
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime

from alembic import op
import sqlalchemy as sa

from app.models.enums import WritingPromptKey


revision: str = "20260514_000026"
down_revision: str | None = "20260514_000025"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


STRUCTURED_BLOCK = """

STRUCTURED TARGET REVIEW:
- `target_action_plan`: exactly 3 target-gap actions. Fields: title, why, how, example, band_impact, priority. Keep each field short, concrete, and tied to the desired score.
- `band_boundaries`: exactly 4 rows, one per IELTS criterion. Explain why the current band is locked and what exact change earns the next +0.5.
- `ielts_checklist`: exactly 5 task-specific rows with label, status, detail, how_to_fix.
- `error_taxonomy`: group repeated weak patterns by real subcategory, not just broad category. Include category, subcategory, label, count, examples, fix.
- `sentence_fixes`: highest-impact sentence corrections only. Use exact original text from the essay and give the corrected sentence.
"""


def upgrade() -> None:
    bind = op.get_bind()
    now = datetime.now(UTC)
    bind.execute(
        sa.text(
            """
            UPDATE writing_prompt_entries
            SET body = replace(body, :needle, :replacement),
                updated_at = :updated_at
            WHERE key = :key
              AND body NOT LIKE '%STRUCTURED TARGET REVIEW:%'
            """
        ),
        {
            "needle": "\n{{ANNOTATION_PROMPT}}",
            "replacement": STRUCTURED_BLOCK + "\n{{ANNOTATION_PROMPT}}",
            "updated_at": now,
            "key": WritingPromptKey.GRADER_USER_TEMPLATE.value,
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
                  AND writing_prompt_entries.body LIKE '%STRUCTURED TARGET REVIEW:%'
            )
            """
        ),
        {
            "updated_at": now,
            "key": WritingPromptKey.GRADER_USER_TEMPLATE.value,
        },
    )


def downgrade() -> None:
    pass
