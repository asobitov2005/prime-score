"""Add performance indexes for hot query paths.

Adds indexes used by leaderboard recompute, per-user attempt/stats lookups,
admin listings, and notification queries. Tables are small so a plain
CREATE INDEX is fine (no CONCURRENTLY needed).

Revision ID: 20260626_000052
Revises: 20260621_000051
Create Date: 2026-06-26
"""

from __future__ import annotations

from alembic import op

revision = "20260626_000052"
down_revision = "20260621_000051"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_attempts_user_id_status", "attempts", ["user_id", "status"], if_not_exists=True
    )
    op.create_index(
        "ix_attempts_created_at", "attempts", ["created_at"], if_not_exists=True
    )
    op.create_index(
        "ix_xp_transactions_created_at", "xp_transactions", ["created_at"], if_not_exists=True
    )
    op.create_index(
        "ix_notifications_user_id", "notifications", ["user_id"], if_not_exists=True
    )
    op.create_index(
        "ix_audit_log_admin_id", "audit_log", ["admin_id"], if_not_exists=True
    )


def downgrade() -> None:
    op.drop_index("ix_audit_log_admin_id", table_name="audit_log", if_exists=True)
    op.drop_index("ix_notifications_user_id", table_name="notifications", if_exists=True)
    op.drop_index("ix_xp_transactions_created_at", table_name="xp_transactions", if_exists=True)
    op.drop_index("ix_attempts_created_at", table_name="attempts", if_exists=True)
    op.drop_index("ix_attempts_user_id_status", table_name="attempts", if_exists=True)
