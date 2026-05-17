from __future__ import annotations

from datetime import UTC, datetime, timedelta
from io import BytesIO

from aiogram import Bot

from app.core.config import get_settings
from app.models.user import User
from app.services.object_storage import upload_user_avatar_image
from app.services.user_names import normalize_user_name_parts

TELEGRAM_PROFILE_SYNC_INTERVAL = timedelta(minutes=5)


def is_telegram_profile_sync_due(
    updated_at: datetime | None,
    *,
    now: datetime | None = None,
) -> bool:
    current_time = now or datetime.now(UTC)
    if updated_at is None:
        return True
    return updated_at <= current_time - TELEGRAM_PROFILE_SYNC_INTERVAL


async def _fetch_avatar_url(
    bot: Bot,
    telegram_id: int,
    *,
    fallback: str | None,
) -> str | None:
    try:
        photos = await bot.get_user_profile_photos(telegram_id, limit=1)
        if not photos.photos:
            return None

        photo = photos.photos[0][-1]
        file = await bot.get_file(photo.file_id)
        if not file.file_path:
            return fallback

        buffer = BytesIO()
        await bot.download_file(file.file_path, destination=buffer)
        payload = buffer.getvalue()
        if not payload:
            return fallback

        return upload_user_avatar_image(
            content=payload,
            filename=f"telegram-{telegram_id}.jpg",
            content_type="image/jpeg",
        )
    except Exception:
        return fallback


async def sync_user_telegram_profile(
    user: User,
    *,
    force: bool = False,
    now: datetime | None = None,
) -> bool:
    current_time = now or datetime.now(UTC)
    if not force and not is_telegram_profile_sync_due(user.telegram_contact_updated_at, now=current_time):
        return False

    settings = get_settings()
    if not settings.telegram_bot_token or settings.telegram_bot_token == "change-me":
        return False

    bot = Bot(token=settings.telegram_bot_token)
    try:
        chat = await bot.get_chat(user.telegram_id)
        first_name, last_name = normalize_user_name_parts(
            getattr(chat, "first_name", None),
            getattr(chat, "last_name", None),
        )
        if not user.name_is_custom:
            user.first_name = first_name
            user.last_name = last_name
        if not user.username_is_custom:
            user.username = getattr(chat, "username", None) or None
        next_avatar_url = await _fetch_avatar_url(
            bot,
            user.telegram_id,
            fallback=user.avatar_url,
        )
        if not user.avatar_is_custom:
            user.avatar_url = next_avatar_url
        user.telegram_contact_updated_at = current_time
        return True
    except Exception:
        return False
    finally:
        try:
            await bot.session.close()
        except Exception:
            pass
