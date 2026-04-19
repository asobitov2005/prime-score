from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import get_async_session, get_current_user
from app.core.security import create_stub_token, generate_login_code, hash_token
from app.models.user import Session as UserSession
from app.models.user import User
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

# Shared file for active codes - pointing to backend root
CODES_FILE = os.path.join(os.getcwd(), "active_codes.json")

def load_codes():
    if os.path.exists(CODES_FILE):
        try:
            with open(CODES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data
        except Exception as e:
            print(f"DEBUG: Error loading codes: {e}")
            return {}
    return {}

def save_codes(codes):
    try:
        with open(CODES_FILE, "w", encoding="utf-8") as f:
            json.dump(codes, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"DEBUG: Error saving codes: {e}")

@router.post("/request-code", response_model=AuthRequestCodeResponse, status_code=202)
async def request_code(payload: AuthRequestCodeRequest) -> AuthRequestCodeResponse:
    _ = generate_login_code()
    return AuthRequestCodeResponse(request_id=uuid4(), telegram_id=payload.telegram_id)


@router.post("/verify-code", response_model=AuthLoginResponse)
async def verify_code(
    payload: AuthVerifyCodeRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> AuthLoginResponse:
    settings = get_settings()
    
    code_str = str(payload.code)
    codes = load_codes()
    user_data = codes.get(code_str)
    
    if not user_data:
        raise HTTPException(
            status_code=400,
            detail="Noto'g'ri yoki eskirgan kod / Invalid or expired code"
        )
        
    telegram_id = user_data.get("telegram_id")
    phone = user_data.get("phone")
    first_name = user_data.get("name", "User")

    # 1. Search for existing user in database
    result = await db.execute(
        select(User).where((User.telegram_id == telegram_id) | (User.phone == phone))
    )
    db_user = result.scalars().first()

    if not db_user:
        # 2. Create new user if not found
        db_user = User(
            telegram_id=telegram_id,
            phone=phone,
            first_name=first_name,
            is_premium=False
        )
        db.add(db_user)
    else:
        # 3. Update existing user info if needed
        db_user.first_name = first_name
        db_user.telegram_id = telegram_id

    try:
        await db.commit()
        await db.refresh(db_user)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Ma'lumotlarni saqlashda xatolik yuz berdi.")

    principal = DebugPrincipal(
        id=db_user.id,
        first_name=db_user.first_name,
        last_name=db_user.last_name or "",
        username=db_user.phone,
        telegram_id=db_user.telegram_id,
    )
    
    # Mark code as used
    user_data["used"] = True
    codes[code_str] = user_data
    save_codes(codes)

    # Create session
    refresh_token = create_stub_token("refresh")
    session_id = uuid4()
    
    user_agent = request.headers.get("user-agent", "Unknown")
    # Simple device info from user agent
    device_info = {"browser": user_agent}
    if "Mobile" in user_agent:
        device_info["type"] = "Mobile"
    else:
        device_info["type"] = "Desktop"

    new_session = UserSession(
        id=session_id,
        user_id=db_user.id,
        refresh_token_hash=hash_token(refresh_token),
        device_info=device_info,
        ip_address=request.client.host if request.client else None,
        last_used_at=datetime.now(UTC),
        expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    )
    db.add(new_session)
    await db.commit()

    return AuthLoginResponse(
        session_id=session_id,
        user=principal,
        access_token=create_stub_token("access"),
        refresh_token=refresh_token,
        access_expires_in_seconds=settings.access_token_expire_minutes * 60,
        refresh_expires_in_seconds=settings.refresh_token_expire_days * 24 * 60 * 60,
    )


@router.post("/refresh", response_model=TokenPairResponse)
async def refresh(
    payload: AuthRefreshRequest,
    db: AsyncSession = Depends(get_async_session)
) -> TokenPairResponse:
    settings = get_settings()
    token_hash = hash_token(payload.refresh_token)
    
    result = await db.execute(
        select(UserSession).where(UserSession.refresh_token_hash == token_hash, UserSession.is_active == True)
    )
    session = result.scalars().first()
    
    if not session or session.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    # Rotate refresh token
    new_refresh_token = create_stub_token("refresh")
    session.refresh_token_hash = hash_token(new_refresh_token)
    session.last_used_at = datetime.now(UTC)
    
    await db.commit()

    return TokenPairResponse(
        access_token=create_stub_token("access"),
        refresh_token=new_refresh_token,
        access_expires_in_seconds=settings.access_token_expire_minutes * 60,
        refresh_expires_in_seconds=settings.refresh_token_expire_days * 24 * 60 * 60,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    payload: AuthLogoutRequest,
    db: AsyncSession = Depends(get_async_session)
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
    db: AsyncSession = Depends(get_async_session)
) -> AuthSessionListResponse:
    result = await db.execute(
        select(UserSession)
        .where(UserSession.user_id == current_user.id, UserSession.is_active == True)
        .order_by(UserSession.last_used_at.desc())
    )
    sessions = result.scalars().all()
    return AuthSessionListResponse(items=sessions)


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
async def force_logout_session(
    session_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
) -> MessageResponse:
    await db.execute(
        update(UserSession)
        .where(UserSession.id == session_id, UserSession.user_id == current_user.id)
        .values(is_active=False)
    )
    await db.commit()
    return MessageResponse(message="Session revoked.")
