"""reconcile rank/position achievements granted under lax criteria

Rank-based achievements (``Rank #1``, ``Top 1%``, ``Weekly Top 10``) used to
unlock whenever a user held the position, even on a near-empty leaderboard — so
being "#1 of 1" wrongly granted them (and their one-time XP reward). The unlock
criteria now require a minimum amount of real competition.

This migration reconciles the historical grants for *those three* position
achievements only:

  * the persisted ``user_achievements`` rows are removed,
  * the one-time XP they awarded is reversed off ``users.total_xp``,
  * ``users.current_level`` is recomputed from the corrected XP.

The corrected live logic re-grants each badge (and re-awards the XP) the next
time a genuinely-qualifying user opens their profile, so legitimate holders are
made whole automatically. Milestone achievements (level / streak / XP / skill /
mock counts) are intentionally sticky and are left untouched.

Revision ID: 20260705_000054
Revises: 20260705_000053
Create Date: 2026-07-05
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "20260705_000054"
down_revision: str | None = "20260705_000053"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

# Position achievements whose unlock criteria changed. Kept in sync with the
# ids emitted by app/api/routes/leaderboard.py::_build_achievement_catalog.
RANK_ACHIEVEMENT_IDS = ("special-rank-1", "special-top-1", "special-weekly-top-10")


def upgrade() -> None:
    ids = ", ".join(f"'{a}'" for a in RANK_ACHIEVEMENT_IDS)

    # 1) Reverse the one-time XP these badges awarded, off the stored counter.
    op.execute(
        f"""
        UPDATE users u
        SET total_xp = GREATEST(0, u.total_xp - agg.reverse_xp)
        FROM (
            SELECT user_id, SUM(xp_awarded) AS reverse_xp
            FROM user_achievements
            WHERE achievement_id IN ({ids})
            GROUP BY user_id
        ) agg
        WHERE u.id = agg.user_id AND agg.reverse_xp > 0
        """
    )

    # 2) Recompute level from the corrected XP, using the same curve as
    #    app.services.xp.calculate_level: floor(sqrt(xp / 100)) + 1.
    op.execute(
        f"""
        UPDATE users u
        SET current_level = floor(sqrt(GREATEST(0, u.total_xp) / 100.0)) + 1
        WHERE u.id IN (
            SELECT DISTINCT user_id FROM user_achievements
            WHERE achievement_id IN ({ids})
        )
        """
    )

    # 3) Drop the XP reward transactions so the corrected live logic can
    #    re-award them (the (user, type, source_type, source_id) uniqueness
    #    constraint would otherwise block a legitimate re-grant).
    op.execute(
        f"""
        DELETE FROM xp_transactions
        WHERE type = 'achievement_unlock'
          AND source_type = 'achievement'
          AND source_id IN ({ids})
        """
    )

    # 4) Remove the persisted unlock rows; live sync re-creates them for users
    #    who genuinely qualify under the new criteria.
    op.execute(f"DELETE FROM user_achievements WHERE achievement_id IN ({ids})")


def downgrade() -> None:
    # One-way data reconciliation: the corrected live logic re-materializes the
    # rows/XP for qualifying users, so there is nothing meaningful to restore.
    pass
