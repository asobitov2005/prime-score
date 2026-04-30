from __future__ import annotations

from datetime import datetime
from ipaddress import IPv4Address, IPv6Address
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import AdminPrincipal, DebugPrincipal


class AuthRequestCodeRequest(BaseModel):
    telegram_id: int
    phone: str | None = None


class AuthRequestCodeResponse(BaseModel):
    request_id: UUID
    telegram_id: int
    expires_in_seconds: int = 180
    status: str = "queued"


class AuthVerifyCodeRequest(BaseModel):
    telegram_id: int
    code: str = Field(min_length=6, max_length=6)


class AuthRefreshRequest(BaseModel):
    refresh_token: str


class AuthLogoutRequest(BaseModel):
    session_id: UUID | None = None
    refresh_token: str | None = None


class AuthSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    device_info: dict[str, str] = {}
    ip_address: str | IPv4Address | IPv6Address | None = None
    is_active: bool = True
    expires_at: datetime
    last_used_at: datetime | None = None


class AuthSessionListResponse(BaseModel):
    items: list[AuthSessionRead]


class TokenPairResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    access_expires_in_seconds: int = 900
    refresh_expires_in_seconds: int = 30 * 24 * 60 * 60


class AuthLoginResponse(TokenPairResponse):
    session_id: UUID
    user: DebugPrincipal


class AuthSessionStatusResponse(BaseModel):
    session_id: UUID
    user: DebugPrincipal


class AdminAuthLoginRequest(BaseModel):
    login: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=255)


class AdminAuthRefreshRequest(BaseModel):
    refresh_token: str


class AdminAuthResponse(TokenPairResponse):
    admin: AdminPrincipal
