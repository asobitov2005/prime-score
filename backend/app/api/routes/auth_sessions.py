from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.auth_support import enforce_active_session_limit
from app.core.config import get_settings
from app.core.deps import get_async_session, get_current_user
from app.core.security import create_access_token, hash_token
from app.models.user import Session as UserSession
from app.models.user import User
from app.schemas.auth import (
    AuthLogoutRequest,
    AuthRefreshRequest,
    AuthSessionListResponse,
    AuthSessionStatusResponse,
    TokenPairResponse,
)
from app.schemas.common import DebugPrincipal, MessageResponse
from app.services.premium_access import reconcile_user_premium_status
from app.services.telegram_profile_sync import sync_user_telegram_profile

router = APIRouter()


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
    await enforce_active_session_limit(db, user_id=session.user_id)
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
    await enforce_active_session_limit(db, user_id=current_user.id)
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
    await reconcile_user_premium_status(db, user=user)
    await sync_user_telegram_profile(user)
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
        language=user.language or "en",
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
