from __future__ import annotations

from datetime import datetime
from ipaddress import IPv4Address, IPv6Address
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import AdminPrincipal, DebugPrincipal
from app.services.admin_auth import ADMIN_LOGIN_OTP_TTL_SECONDS, normalize_phone_number


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


class AuthTelegramWebAppRequest(BaseModel):
    init_data: str = Field(min_length=1)
    request_contact: bool = False


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
    is_new_user: bool = False
    welcome_bonus_days: int = 0


class AuthSessionStatusResponse(BaseModel):
    session_id: UUID
    user: DebugPrincipal


class AdminAuthLoginRequest(BaseModel):
    phone_number: str = Field(min_length=6, max_length=32)
    password: str = Field(min_length=1, max_length=255)

    @field_validator("phone_number")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        return normalize_phone_number(value)


class AdminPasswordResetRequest(BaseModel):
    phone_number: str = Field(min_length=6, max_length=32)

    @field_validator("phone_number")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        return normalize_phone_number(value)


class AdminPasswordResetTokenStatusResponse(BaseModel):
    valid: bool = True
    expires_in_seconds: int


class AdminPasswordResetCompleteRequest(BaseModel):
    token: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=255)


class AdminAuthChallengeResponse(BaseModel):
    challenge_id: UUID
    expires_in_seconds: int = ADMIN_LOGIN_OTP_TTL_SECONDS
    delivery: str = "telegram"


class AdminAuthVerifyOtpRequest(BaseModel):
    challenge_id: UUID
    otp_code: str = Field(min_length=5, max_length=5, pattern=r"^\d{5}$")


class AdminAuthRefreshRequest(BaseModel):
    refresh_token: str


class AdminAuthResponse(TokenPairResponse):
    admin: AdminPrincipal
