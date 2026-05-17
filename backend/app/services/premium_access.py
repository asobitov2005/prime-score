from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


def has_active_premium(user: User, now: datetime | None = None) -> bool:
    now = now or datetime.now(UTC)
    return bool(user.premium_until and user.premium_until > now)


async def reconcile_user_premium_status(
    session: AsyncSession,
    *,
    user: User,
    now: datetime | None = None,
) -> bool:
    now = now or datetime.now(UTC)
    premium_is_active = has_active_premium(user, now)

    if premium_is_active:
        if user.is_premium:
            return False
        user.is_premium = True
        await session.commit()
        await session.refresh(user)
        return True

    changed = user.is_premium or user.premium_until is not None
    if not changed:
        return False

    user.is_premium = False
    user.premium_until = None
    await session.commit()
    await session.refresh(user)
    return True
