from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import NotificationType
from app.models.gamification import UserAchievement
from app.models.user import User
from app.schemas.leaderboard import LeaderboardUserAchievementStateRead
from app.services.notification_sender import create_and_send_notification
from app.services.xp import create_xp_transaction

TX_ACHIEVEMENT_UNLOCK = "achievement_unlock"
SOURCE_ACHIEVEMENT = "achievement"


async def sync_user_achievements(
    session: AsyncSession,
    *,
    user: User,
    catalog: list[LeaderboardUserAchievementStateRead],
) -> list[LeaderboardUserAchievementStateRead]:
    """Reconcile a freshly computed achievement catalog with durable state.

    The catalog itself (titles, thresholds, artwork, live unlock status) is
    recomputed from the user's stats on every request. This function persists
    the *fact* of an unlock so that:

      - unlock time is stable across requests,
      - the one-time XP reward is granted exactly once,
      - an unlock notification is sent exactly once,
      - achievements stay unlocked ("sticky") even if a stat later regresses.

    Catalog items are mutated in place (``status`` / ``unlocked_at``) and the
    same list is returned for convenience. Only ever call this for the owning
    user — never when rendering someone else's public profile.
    """
    existing_rows = (
        await session.scalars(
            select(UserAchievement).where(UserAchievement.user_id == user.id)
        )
    ).all()
    existing = {row.achievement_id: row for row in existing_rows}

    newly_unlocked: list[LeaderboardUserAchievementStateRead] = []

    for item in catalog:
        row = existing.get(item.id)
        if row is not None:
            # Already earned — keep it unlocked and pin the original timestamp.
            item.status = "unlocked"
            item.unlocked_at = row.unlocked_at
            continue
        if item.status != "unlocked":
            continue
        row = UserAchievement(
            user_id=user.id,
            achievement_id=item.id,
            unlocked_at=datetime.now(UTC),
            xp_awarded=max(0, int(item.xp_reward or 0)),
            metadata_json={
                "title": item.title,
                "category": item.category,
                "rarity": item.rarity,
            },
        )
        session.add(row)
        await session.flush()
        existing[item.id] = row
        item.unlocked_at = row.unlocked_at
        newly_unlocked.append(item)

    if not newly_unlocked:
        return catalog

    for item in newly_unlocked:
        reward = max(0, int(item.xp_reward or 0))
        if reward > 0:
            # cap_exempt: achievement rewards should never be clipped by the
            # daily XP cap. Idempotent via the xp_transactions uniqueness
            # constraint on (user, type, source_type, source_id).
            await create_xp_transaction(
                session,
                user.id,
                TX_ACHIEVEMENT_UNLOCK,
                reward,
                SOURCE_ACHIEVEMENT,
                item.id,
                metadata={"cap_exempt": True, "achievement_title": item.title},
            )
        body = f"You unlocked “{item.title}”"
        body += f" and earned {reward} XP!" if reward > 0 else "!"
        await create_and_send_notification(
            session,
            user_id=user.id,
            type=NotificationType.achievement_unlocked,
            title="Achievement unlocked",
            body=body,
        )
        existing[item.id].notified = True

    await session.commit()
    return catalog
