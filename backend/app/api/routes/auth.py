"""User authentication router facade.

The implementation is split by responsibility while this module keeps the
original ``auth.router`` entrypoint and legacy helper contracts stable.
"""

from io import BytesIO

from aiogram import Bot
from fastapi import APIRouter

from app.api.routes.auth_code import request_code, router as code_router, verify_code
from app.api.routes.auth_sessions import (
    force_logout_session,
    get_session_status,
    list_sessions,
    logout,
    refresh,
    router as sessions_router,
)
from app.api.routes.auth_support import (
    create_login_session_response,
    detect_device_info,
    enforce_active_session_limit,
    upsert_user_from_login,
)
from app.api.routes.auth_webapp import router as webapp_router, telegram_webapp_login
from app.core.config import get_settings
from app.services.object_storage import upload_user_avatar_image

router = APIRouter()
for child_router in (code_router, webapp_router, sessions_router):
    router.routes.extend(child_router.routes)


async def fetch_telegram_avatar_url(telegram_id: int) -> str | None:
    settings = get_settings()
    if not settings.telegram_bot_token or settings.telegram_bot_token == "change-me":
        return None

    bot = Bot(token=settings.telegram_bot_token)
    try:
        photos = await bot.get_user_profile_photos(telegram_id, limit=1)
        if not photos.photos:
            return None
        photo = photos.photos[0][-1]
        file = await bot.get_file(photo.file_id)
        if not file.file_path:
            return None
        buffer = BytesIO()
        await bot.download_file(file.file_path, destination=buffer)
        payload = buffer.getvalue()
        if not payload:
            return None
        return upload_user_avatar_image(
            content=payload,
            filename=f"telegram-{telegram_id}.jpg",
            content_type="image/jpeg",
        )
    except Exception:
        return None
    finally:
        try:
            await bot.session.close()
        except Exception:
            pass


async def resolve_telegram_avatar_url(
    telegram_id: int,
    *,
    fallback: str | None = None,
) -> str | None:
    settings = get_settings()
    if not settings.telegram_bot_token or settings.telegram_bot_token == "change-me":
        return fallback

    bot = Bot(token=settings.telegram_bot_token)
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
    finally:
        try:
            await bot.session.close()
        except Exception:
            pass


_upsert_user_from_login = upsert_user_from_login
_fetch_telegram_avatar_url = fetch_telegram_avatar_url
_resolve_telegram_avatar_url = resolve_telegram_avatar_url
_enforce_active_session_limit = enforce_active_session_limit
_detect_device_info = detect_device_info
_create_login_session_response = create_login_session_response

__all__ = [
    "router",
    "request_code",
    "verify_code",
    "telegram_webapp_login",
    "refresh",
    "logout",
    "list_sessions",
    "get_session_status",
    "force_logout_session",
]
