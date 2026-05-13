from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import NotificationType
from app.models.user import User
from app.services.notification_sender import create_and_send_notification


async def grant_premium_bonus(
    session: AsyncSession,
    *,
    user: User,
    days: int,
    title: str,
    body: str,
    telegram_text: str | None = None,
    now: datetime | None = None,
) -> datetime:
    now = now or datetime.now(UTC)
    premium_start = user.premium_until if user.is_premium and user.premium_until and user.premium_until > now else now
    premium_until = premium_start + timedelta(days=days)

    user.is_premium = True
    user.premium_until = premium_until

    await create_and_send_notification(
        session,
        user_id=user.id,
        type=NotificationType.gift_received,
        title=title,
        body=body,
        telegram_text=telegram_text,
    )

    return premium_until
