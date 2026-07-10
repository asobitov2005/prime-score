from __future__ import annotations

from datetime import UTC, datetime, timedelta
from io import BytesIO
from uuid import UUID, uuid4

from aiogram import Bot
from fastapi import Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token, create_refresh_token, hash_token
from app.models.user import Session as UserSession
from app.models.user import User
from app.schemas.auth import AuthLoginResponse
from app.schemas.common import DebugPrincipal
from app.services.object_storage import upload_user_avatar_image


def upsert_user_from_login(
    user: User | None,
    *,
    telegram_id: int,
    phone: str,
    username: str | None,
    first_name: str,
    last_name: str | None,
    avatar_url: str | None,
    now: datetime,
) -> User:
    if user is None:
        return User(
            telegram_id=telegram_id,
            phone=phone,
            first_name=first_name,
            last_name=last_name,
            username=username,
            avatar_url=avatar_url,
            telegram_contact_updated_at=now,
            first_login_at=now,
            is_premium=True,
            premium_until=now + timedelta(days=1),
        )

    user.telegram_id = telegram_id
    user.phone = phone
    if not user.name_is_custom:
        user.first_name = first_name
        user.last_name = last_name
    if not user.username_is_custom:
        user.username = username
    if not user.avatar_is_custom:
        user.avatar_url = avatar_url
    user.telegram_contact_updated_at = now
    if user.first_login_at is None:
        user.first_login_at = now
    return user


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


async def enforce_active_session_limit(
    db: AsyncSession,
    *,
    user_id: UUID,
    keep_limit: int = 2,
) -> None:
    now = datetime.now(UTC)
    await db.execute(
        update(UserSession)
        .where(
            UserSession.user_id == user_id,
            UserSession.is_active == True,
            UserSession.expires_at <= now,
        )
        .values(is_active=False)
    )

    keep_ids = (
        await db.execute(
            select(UserSession.id)
            .where(
                UserSession.user_id == user_id,
                UserSession.is_active == True,
                UserSession.expires_at > now,
            )
            .order_by(UserSession.last_used_at.desc().nullslast(), UserSession.created_at.desc())
            .limit(keep_limit)
        )
    ).scalars().all()

    if not keep_ids:
        await db.commit()
        return

    await db.execute(
        update(UserSession)
        .where(
            UserSession.user_id == user_id,
            UserSession.is_active == True,
            UserSession.expires_at > now,
            UserSession.id.not_in(keep_ids),
        )
        .values(is_active=False)
    )
    await db.commit()


def detect_device_info(user_agent: str) -> dict[str, str]:
    normalized = user_agent or ""
    lowered = normalized.lower()

    if "telegram" in lowered:
        browser = "Telegram"
    elif "edg/" in lowered:
        browser = "Edge"
    elif "opr/" in lowered or "opera" in lowered:
        browser = "Opera"
    elif "firefox/" in lowered or "fxios/" in lowered:
        browser = "Firefox"
    elif ("chrome/" in lowered or "crios/" in lowered) and "edg/" not in lowered and "opr/" not in lowered:
        browser = "Chrome"
    elif "safari/" in lowered and "chrome/" not in lowered and "crios/" not in lowered:
        browser = "Safari"
    else:
        browser = "Browser"

    if "ipad" in lowered or "tablet" in lowered:
        device_type = "Tablet"
    elif "android" in lowered or "iphone" in lowered or "mobile" in lowered:
        device_type = "Mobile"
    else:
        device_type = "Desktop"

    if "windows" in lowered:
        operating_system = "Windows"
    elif "mac os" in lowered or "macintosh" in lowered:
        operating_system = "macOS"
    elif "android" in lowered:
        operating_system = "Android"
    elif "iphone" in lowered or "ipad" in lowered or "ios" in lowered:
        operating_system = "iOS"
    elif "linux" in lowered:
        operating_system = "Linux"
    else:
        operating_system = "Unknown"

    return {
        "type": device_type,
        "browser": browser,
        "os": operating_system,
        "user_agent": normalized,
    }


async def create_login_session_response(
    db: AsyncSession,
    *,
    user: User,
    request: Request,
    is_new_user: bool,
    welcome_bonus_days: int,
) -> AuthLoginResponse:
    settings = get_settings()
    session_id = uuid4()
    refresh_token = create_refresh_token(subject=str(user.id))
    access_token = create_access_token(
        subject=str(user.id),
        extra_claims={"sid": str(session_id)},
    )
    device_info = detect_device_info(request.headers.get("user-agent", ""))

    db.add(
        UserSession(
            id=session_id,
            user_id=user.id,
            refresh_token_hash=hash_token(refresh_token),
            device_info=device_info,
            ip_address=request.client.host if request.client else None,
            last_used_at=datetime.now(UTC),
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    await db.commit()
    await enforce_active_session_limit(db, user_id=user.id)

    principal = DebugPrincipal(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name or "",
        username=user.username,
        phone=user.phone,
        telegram_id=user.telegram_id,
        avatar_url=user.avatar_url,
        language=user.language or "en",
        is_premium=user.is_premium,
        premium_until=user.premium_until,
        created_at=user.created_at,
    )
    return AuthLoginResponse(
        session_id=session_id,
        user=principal,
        access_token=access_token,
        refresh_token=refresh_token,
        access_expires_in_seconds=settings.access_token_expire_minutes * 60,
        refresh_expires_in_seconds=settings.refresh_token_expire_days * 24 * 60 * 60,
        is_new_user=is_new_user,
        welcome_bonus_days=welcome_bonus_days,
    )
