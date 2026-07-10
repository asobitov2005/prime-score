from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from app.api.routes import admin as admin_routes
from app.core.security import decode_token
from app.models.admin import Admin, AdminLoginOtp
from app.models.enums import AdminRole
from app.models.user import User
from app.schemas.auth import (
    AdminAuthLoginRequest,
    AdminAuthRefreshRequest,
    AdminAuthVerifyOtpRequest,
    AdminPasswordResetCompleteRequest,
    AdminPasswordResetRequest,
)
from app.services.admin_auth import (
    ADMIN_LOGIN_OTP_MAX_ATTEMPTS,
    ADMIN_LOGIN_OTP_PURPOSE,
    ADMIN_LOGIN_OTP_TTL_SECONDS,
    ADMIN_PASSWORD_RESET_IP_DAILY_MAX,
    ADMIN_PASSWORD_RESET_IP_DAILY_WINDOW_SECONDS,
    ADMIN_PASSWORD_RESET_IP_SHORT_MAX,
    ADMIN_PASSWORD_RESET_IP_SHORT_WINDOW_SECONDS,
    ADMIN_PASSWORD_RESET_PHONE_DAILY_MAX,
    ADMIN_PASSWORD_RESET_PHONE_DAILY_WINDOW_SECONDS,
    ADMIN_PASSWORD_RESET_PHONE_SHORT_MAX,
    ADMIN_PASSWORD_RESET_PHONE_SHORT_WINDOW_SECONDS,
    ADMIN_PASSWORD_RESET_PURPOSE,
    ADMIN_PASSWORD_RESET_TTL_SECONDS,
    AdminAuthThrottle,
    AdminOtpFailure,
    build_admin_password_reset_message,
    build_admin_password_reset_reply_markup,
    build_admin_password_reset_url,
    build_admin_otp_message,
    consume_admin_password_reset_token,
    consume_admin_login_otp,
    generate_admin_otp_code,
    normalize_phone_number,
    update_admin_security_settings,
)

__all__ = [name for name in globals() if not name.startswith('__')]
