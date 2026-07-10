from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.auth_support import (
    create_login_session_response,
    resolve_telegram_avatar_url,
    upsert_user_from_login,
)
from app.core.deps import get_async_session
from app.core.enums import NotificationType
from app.models.user import User
from app.schemas.auth import (
    AuthLoginResponse,
    AuthRequestCodeRequest,
    AuthRequestCodeResponse,
    AuthVerifyCodeRequest,
)
from app.services.code_store import get_code_store
from app.services.notification_sender import create_and_send_notification
from app.services.premium_access import reconcile_user_premium_status
from app.services.telegram_users import link_telegram_user_after_login
from app.services.user_cleanup import purge_user_data
from app.services.user_names import resolve_login_name_parts

router = APIRouter()


@router.post("/request-code", response_model=AuthRequestCodeResponse, status_code=202)
async def request_code(payload: AuthRequestCodeRequest) -> AuthRequestCodeResponse:
    return AuthRequestCodeResponse(request_id=uuid4(), telegram_id=payload.telegram_id)


@router.post("/verify-code", response_model=AuthLoginResponse)
async def verify_code(
    payload: AuthVerifyCodeRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> AuthLoginResponse:
    store = get_code_store()
    code_data = await store.get_code(str(payload.code))
    if not code_data or code_data.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or expired code.")

    telegram_id: int = code_data["telegram_id"]
    phone: str = code_data["phone"]
    username: str | None = code_data.get("username")
    avatar_url: str | None = code_data.get("avatar_url")
    first_name, last_name = resolve_login_name_parts(code_data)
    now = datetime.now(UTC)
    is_new_user = False

    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    db_user = result.scalars().first()
    if db_user is None:
        result = await db.execute(select(User).where(User.phone == phone))
        db_user = result.scalars().first()
    if db_user is not None and db_user.deleted_at is not None:
        await purge_user_data(db, user=db_user)
        db_user = None
        is_new_user = True
    elif db_user is None or db_user.first_login_at is None:
        is_new_user = True

    avatar_url = await resolve_telegram_avatar_url(
        telegram_id,
        fallback=avatar_url if avatar_url is not None else (db_user.avatar_url if db_user is not None else None),
    )
    db_user = upsert_user_from_login(
        db_user,
        telegram_id=telegram_id,
        phone=phone,
        username=username,
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
        await link_telegram_user_after_login(db, user=db_user, now=now)
        await db.commit()
        await db.refresh(db_user)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Ma'lumotlarni saqlashda xatolik.") from exc

    await reconcile_user_premium_status(db, user=db_user)
    await store.mark_used(str(payload.code))

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
