from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import get_async_session, get_current_user
from app.core.security import create_access_token, create_refresh_token, hash_token
from app.models.user import Session as UserSession
from app.models.user import User
from app.schemas.auth import (
    AuthLoginResponse,
    AuthLogoutRequest,
    AuthRefreshRequest,
    AuthRequestCodeRequest,
    AuthRequestCodeResponse,
    AuthSessionListResponse,
    AuthSessionStatusResponse,
    AuthVerifyCodeRequest,
    TokenPairResponse,
)
from app.schemas.common import DebugPrincipal, MessageResponse
from app.services.code_store import get_code_store
from app.services.user_names import resolve_login_name_parts
from sqlalchemy import select

router = APIRouter()


def _upsert_user_from_login(
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
            is_premium=False,
        )

    user.telegram_id = telegram_id
    user.phone = phone
    if username is not None or user.username is None:
        user.username = username
    user.telegram_contact_updated_at = now
    return user


async def _enforce_active_session_limit(
    db: AsyncSession,
    *,
    user_id: UUID,
    keep_limit: int = 2,
) -> None:
    now = datetime.now(UTC)

    # Expired sessions should never count toward the active-device limit.
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


def _detect_device_info(user_agent: str) -> dict[str, str]:
    normalized = user_agent or ""
    lowered = normalized.lower()

    if "edg/" in lowered:
        browser = "Edge"
    elif "opr/" in lowered or "opera" in lowered:
        browser = "Opera"
    elif "firefox/" in lowered or "fxios/" in lowered:
        browser = "Firefox"
    elif ("chrome/" in lowered or "crios/" in lowered) and "edg/" not in lowered and "opr/" not in lowered:
        browser = "Chrome"
    elif "safari/" in lowered and "chrome/" not in lowered and "crios/" not in lowered:
        browser = "Safari"
    elif "telegram" in lowered:
        browser = "Telegram"
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


@router.post("/request-code", response_model=AuthRequestCodeResponse, status_code=202)
async def request_code(payload: AuthRequestCodeRequest) -> AuthRequestCodeResponse:
    return AuthRequestCodeResponse(request_id=uuid4(), telegram_id=payload.telegram_id)


@router.post("/verify-code", response_model=AuthLoginResponse)
async def verify_code(
    payload: AuthVerifyCodeRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> AuthLoginResponse:
    settings = get_settings()
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

    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    db_user = result.scalars().first()
    if db_user is None:
        result = await db.execute(select(User).where(User.phone == phone))
        db_user = result.scalars().first()

    db_user = _upsert_user_from_login(
        db_user,
        telegram_id=telegram_id,
        phone=phone,
        username=username,
        first_name=first_name,
        last_name=last_name,
        avatar_url=avatar_url,
        now=now,
    )
    db.add(db_user)

    try:
        await db.commit()
        await db.refresh(db_user)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Ma'lumotlarni saqlashda xatolik.") from exc

    await store.mark_used(str(payload.code))

    session_id = uuid4()
    refresh_token = create_refresh_token(subject=str(db_user.id))
    access_token = create_access_token(
        subject=str(db_user.id),
        extra_claims={"sid": str(session_id)},
    )

    user_agent = request.headers.get("user-agent", "")
    device_info = _detect_device_info(user_agent)

    db.add(UserSession(
        id=session_id,
        user_id=db_user.id,
        refresh_token_hash=hash_token(refresh_token),
        device_info=device_info,
        ip_address=request.client.host if request.client else None,
        last_used_at=datetime.now(UTC),
        expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
    ))
    await db.commit()
    await _enforce_active_session_limit(db, user_id=db_user.id)

    principal = DebugPrincipal(
        id=db_user.id,
        first_name=db_user.first_name,
        last_name=db_user.last_name or "",
        username=db_user.username,
        phone=db_user.phone,
        telegram_id=db_user.telegram_id,
        avatar_url=db_user.avatar_url,
        is_premium=db_user.is_premium,
        premium_until=db_user.premium_until,
        created_at=db_user.created_at,
    )

    return AuthLoginResponse(
        session_id=session_id,
        user=principal,
        access_token=access_token,
        refresh_token=refresh_token,
        access_expires_in_seconds=settings.access_token_expire_minutes * 60,
        refresh_expires_in_seconds=settings.refresh_token_expire_days * 24 * 60 * 60,
    )


@router.post("/refresh", response_model=TokenPairResponse)
async def refresh(
    payload: AuthRefreshRequest,
    db: AsyncSession = Depends(get_async_session),
) -> TokenPairResponse:
    settings = get_settings()
    token_hash = hash_token(payload.refresh_token)

    result = await db.execute(
        select(UserSession).where(
            UserSession.refresh_token_hash == token_hash,
            UserSession.is_active == True,
        )
    )
    session = result.scalars().first()

    if session is None or session.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=401, detail="Invalid or expired session.")

    new_access_token = create_access_token(
        subject=str(session.user_id),
        extra_claims={"sid": str(session.id)},
    )

    session.last_used_at = datetime.now(UTC)
    await db.commit()
    await _enforce_active_session_limit(db, user_id=session.user_id)

    return TokenPairResponse(
        access_token=new_access_token,
        refresh_token=payload.refresh_token,
        access_expires_in_seconds=settings.access_token_expire_minutes * 60,
        refresh_expires_in_seconds=settings.refresh_token_expire_days * 24 * 60 * 60,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    payload: AuthLogoutRequest,
    db: AsyncSession = Depends(get_async_session),
) -> MessageResponse:
    if payload.refresh_token:
        token_hash = hash_token(payload.refresh_token)
        await db.execute(
            update(UserSession)
            .where(UserSession.refresh_token_hash == token_hash)
            .values(is_active=False)
        )
    elif payload.session_id:
        await db.execute(
            update(UserSession)
            .where(UserSession.id == payload.session_id)
            .values(is_active=False)
        )
    await db.commit()
    return MessageResponse(message="Session invalidated.")


@router.get("/sessions", response_model=AuthSessionListResponse)
async def list_sessions(
    current_user: DebugPrincipal = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> AuthSessionListResponse:
    await _enforce_active_session_limit(db, user_id=current_user.id)
    result = await db.execute(
        select(UserSession)
        .where(
            UserSession.user_id == current_user.id,
            UserSession.is_active == True,
            UserSession.expires_at > datetime.now(UTC),
        )
        .order_by(UserSession.last_used_at.desc())
        .limit(2)
    )
    return AuthSessionListResponse(items=result.scalars().all())


@router.get("/sessions/{session_id}/status", response_model=AuthSessionStatusResponse)
async def get_session_status(
    session_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> AuthSessionStatusResponse:
    result = await db.execute(
        select(UserSession, User)
        .join(User, User.id == UserSession.user_id)
        .where(
            UserSession.id == session_id,
            UserSession.user_id == current_user.id,
            UserSession.is_active == True,
            UserSession.expires_at > datetime.now(UTC),
        )
    )
    row = result.first()

    if row is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    session, user = row
    session.last_used_at = datetime.now(UTC)
    await db.commit()
    principal = DebugPrincipal(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name or "",
        username=user.username,
        phone=user.phone,
        telegram_id=user.telegram_id,
        avatar_url=user.avatar_url,
        is_premium=user.is_premium,
        premium_until=user.premium_until,
        created_at=user.created_at,
    )
    return AuthSessionStatusResponse(session_id=session.id, user=principal)


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
async def force_logout_session(
    session_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> MessageResponse:
    result = await db.execute(
        update(UserSession)
        .where(UserSession.id == session_id, UserSession.user_id == current_user.id)
        .values(is_active=False)
    )
    await db.commit()
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Session not found.")
    return MessageResponse(message="Session revoked.")
