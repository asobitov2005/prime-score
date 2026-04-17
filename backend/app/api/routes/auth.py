from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter

from app.core.config import get_settings
from app.core.security import create_stub_token, generate_login_code, hash_token
from app.schemas.auth import (
    AuthLoginResponse,
    AuthLogoutRequest,
    AuthRefreshRequest,
    AuthRequestCodeRequest,
    AuthRequestCodeResponse,
    AuthSessionListResponse,
    AuthVerifyCodeRequest,
    TokenPairResponse,
)
from app.schemas.common import DebugPrincipal, MessageResponse

router = APIRouter()


@router.post("/request-code", response_model=AuthRequestCodeResponse, status_code=202)
async def request_code(payload: AuthRequestCodeRequest) -> AuthRequestCodeResponse:
    _ = generate_login_code()
    return AuthRequestCodeResponse(request_id=uuid4(), telegram_id=payload.telegram_id)


@router.post("/verify-code", response_model=AuthLoginResponse)
async def verify_code(payload: AuthVerifyCodeRequest) -> AuthLoginResponse:
    settings = get_settings()
    user = DebugPrincipal(
        id=uuid4(),
        first_name="Prime",
        last_name="Score",
        username=f"telegram_{payload.telegram_id}",
        telegram_id=payload.telegram_id,
    )
    session_id = uuid4()
    return AuthLoginResponse(
        session_id=session_id,
        user=user,
        access_token=create_stub_token("access"),
        refresh_token=hash_token(create_stub_token("refresh")),
        access_expires_in_seconds=settings.access_token_expire_minutes * 60,
        refresh_expires_in_seconds=settings.refresh_token_expire_days * 24 * 60 * 60,
    )


@router.post("/refresh", response_model=TokenPairResponse)
async def refresh(payload: AuthRefreshRequest) -> TokenPairResponse:
    settings = get_settings()
    _ = payload.refresh_token
    return TokenPairResponse(
        access_token=create_stub_token("access"),
        refresh_token=hash_token(create_stub_token("refresh")),
        access_expires_in_seconds=settings.access_token_expire_minutes * 60,
        refresh_expires_in_seconds=settings.refresh_token_expire_days * 24 * 60 * 60,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(payload: AuthLogoutRequest) -> MessageResponse:
    _ = payload
    return MessageResponse(message="Session invalidated.")


@router.get("/sessions", response_model=AuthSessionListResponse)
async def list_sessions() -> AuthSessionListResponse:
    return AuthSessionListResponse(items=[])


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
async def force_logout_session(session_id: str) -> MessageResponse:
    _ = session_id
    return MessageResponse(message="Session revoked.")

