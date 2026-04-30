from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.enums import NotificationType
from app.models.ops import Notification
from app.models.user import User

logger = logging.getLogger(__name__)


def _get_httpx():
    try:
        import httpx  # type: ignore
        return httpx
    except ModuleNotFoundError:
        logger.warning("httpx is not installed; Telegram notifications are disabled.")
        return None


async def send_telegram_message(
    chat_id: int,
    text: str,
    reply_markup: dict | None = None,
) -> bool:
    settings = get_settings()
    token = settings.telegram_bot_token
    if not token or token == "change-me":
        return False
    httpx = _get_httpx()
    if httpx is None:
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload: dict = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
    }
    if reply_markup:
        import json
        payload["reply_markup"] = json.dumps(reply_markup)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                return True
            logger.warning("Telegram send failed: %s %s", resp.status_code, resp.text[:200])
    except Exception as exc:
        logger.warning("Telegram send error: %s", exc)
    return False


async def create_and_send_notification(
    session: AsyncSession,
    *,
    user_id: UUID,
    type: NotificationType,
    title: str,
    body: str,
    telegram_text: str | None = None,
    inline_keyboard: list[list[dict]] | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        is_read=False,
        sent_telegram=False,
    )
    session.add(notification)

    user = await session.get(User, user_id)
    if user and user.telegram_id:
        markup = {"inline_keyboard": inline_keyboard} if inline_keyboard else None
        sent = await send_telegram_message(
            chat_id=user.telegram_id,
            text=telegram_text or f"<b>{title}</b>\n\n{body}",
            reply_markup=markup,
        )
        notification.sent_telegram = sent

    return notification


async def notify_all_users(
    session: AsyncSession,
    *,
    type: NotificationType,
    title: str,
    body: str,
    telegram_text: str | None = None,
    inline_keyboard: list[list[dict]] | None = None,
) -> int:
    users = list((await session.scalars(select(User))).all())
    count = 0
    for user in users:
        await create_and_send_notification(
            session,
            user_id=user.id,
            type=type,
            title=title,
            body=body,
            telegram_text=telegram_text,
            inline_keyboard=inline_keyboard,
        )
        count += 1
    return count


async def check_expired_premiums(session: AsyncSession) -> int:
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    result = await session.scalars(
        select(User).where(
            User.is_premium == True,
            User.premium_until != None,
            User.premium_until < now,
        )
    )
    count = 0
    for user in result.all():
        user.is_premium = False
        await create_and_send_notification(
            session,
            user_id=user.id,
            type=NotificationType.premium_expired,
            title="Premium expired",
            body="Your Premium subscription has expired. Renew to continue enjoying premium features.",
            telegram_text="⏰ <b>Premium expired</b>\n\nYour Premium subscription has expired. Renew to continue enjoying premium features.",
        )
        count += 1
    await session.commit()
    return count


async def check_expiring_premiums(session: AsyncSession) -> int:
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    three_days = now + timedelta(days=3)
    already_notified_ids = set()
    existing = await session.scalars(
        select(Notification.user_id).where(
            Notification.type == NotificationType.premium_expiring,
            Notification.created_at > now - timedelta(days=3),
        )
    )
    already_notified_ids = set(existing.all())

    result = await session.scalars(
        select(User).where(
            User.is_premium == True,
            User.premium_until != None,
            User.premium_until > now,
            User.premium_until <= three_days,
        )
    )
    count = 0
    for user in result.all():
        if user.id in already_notified_ids:
            continue
        days_left = max(1, int((user.premium_until - now).total_seconds() / 86400))
        await create_and_send_notification(
            session,
            user_id=user.id,
            type=NotificationType.premium_expiring,
            title="Premium expiring soon!",
            body=f"Your Premium subscription expires in {days_left} day{'s' if days_left != 1 else ''}. Renew now to keep your benefits.",
            telegram_text=f"⚠️ <b>Premium expiring in {days_left} day{'s' if days_left != 1 else ''}!</b>\n\nRenew now to keep your benefits.",
        )
        count += 1
    await session.commit()
    return count
