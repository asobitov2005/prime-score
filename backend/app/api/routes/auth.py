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
from sqlalchemy import select

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
    settings = get_settings()
    store = get_code_store()

    code_data = await store.get_code(str(payload.code))
    if not code_data or code_data.get("used"):
        raise HTTPException(status_code=400, detail="Noto'g'ri yoki eskirgan kod.")

    telegram_id: int = code_data["telegram_id"]
    phone: str = code_data["phone"]
    first_name: str = code_data.get("name", "User")

    result = await db.execute(
        select(User).where((User.telegram_id == telegram_id) | (User.phone == phone))
    )
    db_user = result.scalars().first()

    if db_user is None:
        db_user = User(telegram_id=telegram_id, phone=phone, first_name=first_name, is_premium=False)
        db.add(db_user)
    else:
        db_user.first_name = first_name
        db_user.telegram_id = telegram_id

    try:
        await db.commit()
        await db.refresh(db_user)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Ma'lumotlarni saqlashda xatolik.") from exc

    await store.mark_used(str(payload.code))

    refresh_token = create_refresh_token(subject=str(db_user.id))
    access_token = create_access_token(subject=str(db_user.id))
    session_id = uuid4()

    user_agent = request.headers.get("user-agent", "")
    device_info = {"browser": user_agent, "type": "Mobile" if "Mobile" in user_agent else "Desktop"}

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

    principal = DebugPrincipal(
        id=db_user.id,
        first_name=db_user.first_name,
        last_name=db_user.last_name or "",
        username=db_user.phone,
        telegram_id=db_user.telegram_id,
        is_premium=db_user.is_premium,
        premium_until=db_user.premium_until,
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

    new_refresh_token = create_refresh_token(subject=str(session.user_id))
    new_access_token = create_access_token(subject=str(session.user_id))

    session.refresh_token_hash = hash_token(new_refresh_token)
    session.last_used_at = datetime.now(UTC)
    await db.commit()

    return TokenPairResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
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
    result = await db.execute(
        select(UserSession)
        .where(UserSession.user_id == current_user.id, UserSession.is_active == True)
        .order_by(UserSession.last_used_at.desc())
    )
    return AuthSessionListResponse(items=result.scalars().all())


@router.get("/sessions/{session_id}/status", response_model=AuthSessionStatusResponse)
async def get_session_status(
    session_id: UUID,
    db: AsyncSession = Depends(get_async_session),
) -> AuthSessionStatusResponse:
    result = await db.execute(
        select(UserSession, User)
        .join(User, User.id == UserSession.user_id)
        .where(UserSession.id == session_id, UserSession.is_active == True)
    )
    row = result.first()

    if row is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    session, user = row
    principal = DebugPrincipal(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name or "",
        username=user.phone,
        telegram_id=user.telegram_id,
        is_premium=user.is_premium,
        premium_until=user.premium_until,
    )
    return AuthSessionStatusResponse(session_id=session.id, user=principal)


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
async def force_logout_session(
    session_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> MessageResponse:
    await db.execute(
        update(UserSession)
        .where(UserSession.id == session_id, UserSession.user_id == current_user.id)
        .values(is_active=False)
    )
    await db.commit()
    return MessageResponse(message="Session revoked.")
