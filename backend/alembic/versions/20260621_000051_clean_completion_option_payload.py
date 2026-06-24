"""Clean option payload fields from non-option question groups.

Revision ID: 20260621_000051
Revises: 20260620_000050
Create Date: 2026-06-21
"""

from __future__ import annotations

from alembic import op

revision = "20260621_000051"
down_revision = "20260620_000050"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE question_groups
        SET
            shared_content = COALESCE(shared_content, '{}'::jsonb)
                || jsonb_build_object('secondary_block', '', 'options_title', ''),
            shared_options = '[]'::jsonb
        WHERE question_type NOT ILIKE '%wordbank%'
          AND question_type NOT ILIKE '%matching%'
          AND question_type NOT ILIKE '%listening_matching%'
          AND question_type NOT ILIKE '%plan_map_labeling%'
          AND (
            COALESCE(shared_content->>'secondary_block', '') <> ''
            OR COALESCE(shared_content->>'options_title', '') <> ''
            OR jsonb_array_length(COALESCE(shared_options, '[]'::jsonb)) > 0
          )
        """
    )


def downgrade() -> None:
    # Data cleanup migration; no safe automatic rollback.
    pass
