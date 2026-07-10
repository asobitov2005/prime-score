from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.admin import Admin, AdminLoginOtp
from app.services.admin_auth_shared import (
    ADMIN_PASSWORD_MIN_LENGTH,
    ADMIN_PASSWORD_RESET_MAX_ATTEMPTS,
    ADMIN_PASSWORD_RESET_PURPOSE,
    AdminOtpFailure,
)


def parse_admin_password_reset_token(token: str) -> UUID:
    try:
        return UUID(str(token))
    except (TypeError, ValueError) as exc:
        raise AdminOtpFailure("invalid_token") from exc


async def get_admin_password_reset_challenge(
    session: AsyncSession,
    *,
    token: str,
    now: datetime | None = None,
) -> AdminLoginOtp:
    current_time = now or datetime.now(timezone.utc)
    challenge = await session.get(AdminLoginOtp, parse_admin_password_reset_token(token))
    if challenge is None:
        raise AdminOtpFailure("invalid_token")
    if challenge.purpose != ADMIN_PASSWORD_RESET_PURPOSE:
        raise AdminOtpFailure("invalid_token")
    if challenge.used_at is not None:
        raise AdminOtpFailure("used")
    if challenge.expires_at <= current_time:
        challenge.used_at = current_time
        await session.commit()
        raise AdminOtpFailure("expired")
    return challenge


async def consume_admin_password_reset_token(
    session: AsyncSession,
    *,
    token: str,
    new_password: str,
    now: datetime | None = None,
) -> Admin:
    current_time = now or datetime.now(timezone.utc)
    challenge = await get_admin_password_reset_challenge(session, token=token, now=current_time)

    attempts = challenge.attempts or 0
    if attempts >= ADMIN_PASSWORD_RESET_MAX_ATTEMPTS:
        challenge.used_at = current_time
        await session.commit()
        raise AdminOtpFailure("locked")

    password = new_password.strip()
    if len(password) < ADMIN_PASSWORD_MIN_LENGTH:
        challenge.attempts = attempts + 1
        if challenge.attempts >= ADMIN_PASSWORD_RESET_MAX_ATTEMPTS:
            challenge.used_at = current_time
        await session.commit()
        raise AdminOtpFailure("weak_password")

    admin = await session.get(Admin, challenge.admin_id)
    if admin is None or not admin.is_active or admin.telegram_id != challenge.telegram_id:
        challenge.used_at = current_time
        await session.commit()
        raise AdminOtpFailure("admin_unavailable")

    admin.password_hash = hash_password(password)
    admin.auth_version = (admin.auth_version or 1) + 1
    challenge.used_at = current_time
    await session.commit()
    await session.refresh(admin)
    return admin
