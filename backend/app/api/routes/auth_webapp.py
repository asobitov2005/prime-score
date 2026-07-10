from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.auth_support import (
    create_login_session_response,
    resolve_telegram_avatar_url,
    upsert_user_from_login,
)
from app.core.config import get_settings
from app.core.deps import get_async_session
from app.core.enums import NotificationType
from app.models.user import TelegramUser, User
from app.schemas.auth import AuthLoginResponse, AuthTelegramWebAppRequest
from app.services.notification_sender import create_and_send_notification
from app.services.premium_access import reconcile_user_premium_status
from app.services.telegram_users import link_telegram_user_after_login, record_start_event
from app.services.telegram_webapp import (
    TelegramWebAppValidationError,
    build_telegram_webapp_fallback_phone,
    validate_telegram_webapp_init_data,
)
from app.services.user_cleanup import purge_user_data
from app.services.user_names import resolve_login_name_parts

router = APIRouter()


@router.post("/telegram-webapp", response_model=AuthLoginResponse)
async def telegram_webapp_login(
    payload: AuthTelegramWebAppRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> AuthLoginResponse:
    settings = get_settings()
    try:
        telegram_user = validate_telegram_webapp_init_data(
            payload.init_data,
            bot_token=settings.telegram_bot_token,
            max_age_seconds=settings.telegram_webapp_auth_max_age_seconds,
        )
    except TelegramWebAppValidationError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    now = datetime.now(UTC)
    is_new_user = False
    db_user = await db.scalar(select(User).where(User.telegram_id == telegram_user.telegram_id))
    telegram_record = await db.scalar(
        select(TelegramUser).where(TelegramUser.telegram_id == telegram_user.telegram_id)
    )
    if db_user is None and telegram_record is not None and telegram_record.phone:
        db_user = await db.scalar(select(User).where(User.phone == telegram_record.phone))

    if db_user is not None and db_user.deleted_at is not None:
        await purge_user_data(db, user=db_user)
        db_user = None
        is_new_user = True
    elif db_user is None or db_user.first_login_at is None:
        is_new_user = True

    first_name, last_name = resolve_login_name_parts(
        {
            "first_name": telegram_user.first_name,
            "last_name": telegram_user.last_name,
            "username": telegram_user.username,
        }
    )
    existing_phone = db_user.phone if db_user is not None else None
    phone = (
        existing_phone
        if existing_phone and not existing_phone.startswith("tg:")
        else telegram_record.phone
        if telegram_record is not None and telegram_record.phone
        else build_telegram_webapp_fallback_phone(telegram_user.telegram_id)
    )
    avatar_url = (
        telegram_user.photo_url
        if telegram_user.photo_url
        else await resolve_telegram_avatar_url(
            telegram_user.telegram_id,
            fallback=db_user.avatar_url if db_user is not None else None,
        )
    )

    db_user = upsert_user_from_login(
        db_user,
        telegram_id=telegram_user.telegram_id,
        phone=phone,
        username=telegram_user.username,
        first_name=first_name,
        last_name=last_name,
        avatar_url=avatar_url,
        now=now,
    )
    if is_new_user:
        welcome_until = now + timedelta(days=1)
        if db_user.premium_until is None or db_user.premium_until < welcome_until:
            db_user.is_premium = True
            db_user.premium_until = welcome_until
    db.add(db_user)

    try:
        await db.flush()
        await record_start_event(
            db,
            telegram_id=telegram_user.telegram_id,
            first_name=first_name,
            last_name=last_name,
            username=telegram_user.username,
            language_code=telegram_user.language_code,
            is_bot=telegram_user.is_bot,
            now=now,
        )
        await link_telegram_user_after_login(db, user=db_user, now=now)
        await db.commit()
        await db.refresh(db_user)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Telegram WebApp login could not be saved.") from exc

    await reconcile_user_premium_status(db, user=db_user)
    if is_new_user:
        try:
            await create_and_send_notification(
                db,
                user_id=db_user.id,
                type=NotificationType.gift_received,
                title="Welcome bonus activated",
                body="Your 1-day premium is active. Complete a full Reading or Listening test to earn 2 more premium days.",
                telegram_text=(
                    "🎉 <b>Welcome bonus activated</b>\n\nYour 1-day premium is active. "
                    "Complete a full Reading or Listening test to earn 2 more premium days."
                ),
            )
            await db.commit()
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass

    return await create_login_session_response(
        db,
        user=db_user,
        request=request,
        is_new_user=is_new_user,
        welcome_bonus_days=1 if is_new_user else 0,
    )
