from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status

from app.core.security import create_access_token, create_refresh_token
from app.schemas.auth import (
    AuthTokens,
    CodeRequest,
    CodeVerificationRequest,
    SessionInfo,
)


router = APIRouter()


@router.post("/request-code", response_model=SessionInfo)
async def request_code(payload: CodeRequest) -> SessionInfo:
    now = datetime.now(UTC)
    return SessionInfo(
        session_id=uuid4(),
        code_delivery="telegram",
        expires_at=now + timedelta(minutes=3),
        detail=f"Login code sent to Telegram user {payload.telegram_id}.",
    )


@router.post("/verify-code", response_model=AuthTokens)
async def verify_code(payload: CodeVerificationRequest) -> AuthTokens:
    if payload.code == "000000":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reserved code is not allowed.",
        )

    user_id = uuid4()
    session_id = uuid4()
    access_token = create_access_token(str(user_id))
    refresh_token = create_refresh_token(str(session_id))
    return AuthTokens(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in_seconds=900,
        session=SessionInfo(
            session_id=session_id,
            code_delivery="telegram",
            expires_at=datetime.now(UTC) + timedelta(days=30),
            detail="Authenticated via Telegram code.",
        ),
    )


@router.post("/refresh", response_model=AuthTokens)
async def refresh_tokens() -> AuthTokens:
    user_id = uuid4()
    session_id = uuid4()
    return AuthTokens(
        access_token=create_access_token(str(user_id)),
        refresh_token=create_refresh_token(str(session_id)),
        token_type="bearer",
        expires_in_seconds=900,
        session=SessionInfo(
            session_id=session_id,
            code_delivery="telegram",
            expires_at=datetime.now(UTC) + timedelta(days=30),
            detail="Tokens rotated.",
        ),
    )


@router.post("/logout")
async def logout() -> dict[str, str]:
    return {"detail": "Session invalidated."}


@router.get("/sessions", response_model=list[SessionInfo])
async def list_sessions() -> list[SessionInfo]:
    now = datetime.now(UTC)
    return [
        SessionInfo(
            session_id=uuid4(),
            code_delivery="telegram",
            expires_at=now + timedelta(days=20),
            detail="Browser session",
        ),
        SessionInfo(
            session_id=uuid4(),
            code_delivery="telegram",
            expires_at=now + timedelta(days=15),
            detail="Tablet session",
        ),
    ]

