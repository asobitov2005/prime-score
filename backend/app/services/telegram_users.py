from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import TelegramUser, User
from app.services.user_names import normalize_user_name_parts


def _apply_start_event(
    record: TelegramUser,
    *,
    first_name: str,
    last_name: str | None,
    username: str | None,
    language_code: str | None,
    is_bot: bool,
    now: datetime,
) -> TelegramUser:
    normalized_first_name, normalized_last_name = normalize_user_name_parts(
        first_name or username or "User",
        last_name,
    )
    record.first_name = normalized_first_name
    record.last_name = normalized_last_name
    record.username = username
    record.language_code = language_code
    record.is_bot = is_bot
    if record.first_started_at is None:
        record.first_started_at = now
    record.last_started_at = now
    record.start_count = int(record.start_count or 0) + 1
    return record


def _apply_contact_event(
    record: TelegramUser,
    *,
    phone: str,
    first_name: str,
    last_name: str | None,
    username: str | None,
    avatar_url: str | None,
    language_code: str | None,
    is_bot: bool,
    now: datetime,
) -> TelegramUser:
    normalized_first_name, normalized_last_name = normalize_user_name_parts(
        first_name or username or "User",
        last_name,
    )
    record.first_name = normalized_first_name
    record.last_name = normalized_last_name
    record.username = username
    record.language_code = language_code
    record.is_bot = is_bot
    if record.first_started_at is None:
        record.first_started_at = now
    if record.last_started_at is None:
        record.last_started_at = now
    if record.start_count <= 0:
        record.start_count = 1
    record.phone = phone
    if avatar_url is not None:
        record.avatar_url = avatar_url
    record.bot_contact_at = now
    return record


def _apply_login_event(record: TelegramUser, *, user: User, now: datetime) -> TelegramUser:
    normalized_first_name, normalized_last_name = normalize_user_name_parts(user.first_name, user.last_name)
    record.linked_user_id = user.id
    record.telegram_id = user.telegram_id
    record.phone = user.phone
    record.first_name = normalized_first_name
    record.last_name = normalized_last_name
    record.username = user.username
    record.avatar_url = user.avatar_url
    if record.first_started_at is None:
        record.first_started_at = user.bot_contact_at or user.first_login_at or now
    record.last_started_at = now
    if record.start_count <= 0:
        record.start_count = 1
    if record.bot_contact_at is None:
        record.bot_contact_at = user.bot_contact_at
    if record.first_login_at is None:
        record.first_login_at = user.first_login_at or now
    return record


async def _get_or_create_record(
    session: AsyncSession,
    *,
    telegram_id: int,
    first_name: str,
    last_name: str | None,
) -> TelegramUser:
    record = await session.scalar(select(TelegramUser).where(TelegramUser.telegram_id == telegram_id))
    if record is not None:
        return record

    normalized_first_name, normalized_last_name = normalize_user_name_parts(first_name or "User", last_name)
    record = TelegramUser(
        telegram_id=telegram_id,
        first_name=normalized_first_name,
        last_name=normalized_last_name,
    )
    session.add(record)
    await session.flush()
    return record


async def record_start_event(
    session: AsyncSession,
    *,
    telegram_id: int,
    first_name: str,
    last_name: str | None,
    username: str | None,
    language_code: str | None,
    is_bot: bool,
    now: datetime | None = None,
) -> TelegramUser:
    current_time = now or datetime.now(UTC)
    record = await _get_or_create_record(
        session,
        telegram_id=telegram_id,
        first_name=first_name or username or "User",
        last_name=last_name,
    )
    return _apply_start_event(
        record,
        first_name=first_name,
        last_name=last_name,
        username=username,
        language_code=language_code,
        is_bot=is_bot,
        now=current_time,
    )


async def record_contact_event(
    session: AsyncSession,
    *,
    telegram_id: int,
    phone: str,
    first_name: str,
    last_name: str | None,
    username: str | None,
    avatar_url: str | None,
    language_code: str | None,
    is_bot: bool,
    now: datetime | None = None,
) -> TelegramUser:
    current_time = now or datetime.now(UTC)
    record = await _get_or_create_record(
        session,
        telegram_id=telegram_id,
        first_name=first_name or username or "User",
        last_name=last_name,
    )
    return _apply_contact_event(
        record,
        phone=phone,
        first_name=first_name,
        last_name=last_name,
        username=username,
        avatar_url=avatar_url,
        language_code=language_code,
        is_bot=is_bot,
        now=current_time,
    )


async def link_telegram_user_after_login(
    session: AsyncSession,
    *,
    user: User,
    now: datetime | None = None,
) -> TelegramUser:
    current_time = now or datetime.now(UTC)
    record = await session.scalar(select(TelegramUser).where(TelegramUser.telegram_id == user.telegram_id))
    if record is None and user.phone:
        record = await session.scalar(select(TelegramUser).where(TelegramUser.phone == user.phone))
    if record is None:
        record = TelegramUser(
            telegram_id=user.telegram_id,
            first_name=user.first_name,
            last_name=user.last_name,
        )
        session.add(record)
        await session.flush()
    return _apply_login_event(record, user=user, now=current_time)
