from __future__ import annotations

import hashlib
import logging
import re
import secrets
from functools import lru_cache
from datetime import datetime, timezone
from uuid import UUID

import redis.asyncio as aioredis
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import UserRole
from app.core.security import hash_password, verify_password
from app.models.admin import Admin
from app.models.enums import AdminRole
from app.models.user import User
from app.schemas.common import AdminPrincipal

logger = logging.getLogger(__name__)

ADMIN_LOGIN_OTP_PURPOSE = "admin_login"
ADMIN_LOGIN_OTP_TTL_SECONDS = 60
ADMIN_LOGIN_OTP_MAX_ATTEMPTS = 5
ADMIN_CREDENTIAL_MAX_FAILURES = 5
ADMIN_CREDENTIAL_FAILURE_WINDOW_SECONDS = 5 * 60
ADMIN_OTP_ISSUE_MAX_PER_MINUTE = 3
_ADMIN_AUTH_THROTTLE_PFX = "primescore:admin_auth:"


def _normalize_login(value: str) -> str:
    return value.strip().lower()


def normalize_phone_number(value: str) -> str:
    normalized = re.sub(r"[\s().-]+", "", value.strip())
    if normalized.isdigit() and len(normalized) == 9:
        normalized = f"+998{normalized}"
    if normalized.startswith("00"):
        normalized = "+" + normalized[2:]
    if normalized and not normalized.startswith("+"):
        normalized = "+" + normalized
    return normalized


def generate_admin_otp_code() -> str:
    return f"{secrets.randbelow(100_000):05d}"


def build_admin_otp_message(code: str) -> str:
    return (
        "🔐 <b>PrimeScore admin login code</b>\n\n"
        f"<code>{code}</code>\n\n"
        "This code expires in <b>60 seconds</b>. "
        "If you did not request admin access, ignore this message."
    )


class AdminOtpFailure(ValueError):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def consume_admin_login_otp(admin_otp, submitted_code: str, *, now: datetime | None = None) -> None:
    current_time = now or datetime.now(timezone.utc)
    attempts = admin_otp.attempts or 0
    if admin_otp.used_at is not None:
        raise AdminOtpFailure("used")
    if admin_otp.purpose != ADMIN_LOGIN_OTP_PURPOSE:
        raise AdminOtpFailure("invalid_purpose")
    if admin_otp.expires_at <= current_time:
        raise AdminOtpFailure("expired")
    if attempts >= ADMIN_LOGIN_OTP_MAX_ATTEMPTS:
        raise AdminOtpFailure("locked")
    if admin_otp.otp_code != submitted_code:
        admin_otp.attempts = attempts + 1
        raise AdminOtpFailure("invalid")
    admin_otp.used_at = current_time


class AdminAuthThrottle:
    def __init__(self, client: aioredis.Redis) -> None:
        self._r = client

    def _key(self, scope: str, identifier: str) -> str:
        digest = hashlib.sha256(identifier.encode("utf-8")).hexdigest()
        return f"{_ADMIN_AUTH_THROTTLE_PFX}{scope}:{digest}"

    async def is_credentials_limited(self, identifier: str) -> bool:
        try:
            raw = await self._r.get(self._key("credential_fail", identifier))
        except Exception as exc:
            logger.warning("Admin auth throttle read failed: %s", exc)
            return False
        return int(raw or 0) >= ADMIN_CREDENTIAL_MAX_FAILURES

    async def record_failed_credentials(self, identifier: str) -> int:
        key = self._key("credential_fail", identifier)
        try:
            count = await self._r.incr(key)
            if count == 1:
                await self._r.expire(key, ADMIN_CREDENTIAL_FAILURE_WINDOW_SECONDS)
            return int(count)
        except Exception as exc:
            logger.warning("Admin auth throttle write failed: %s", exc)
            return 0

    async def clear_failed_credentials(self, identifier: str) -> None:
        try:
            await self._r.delete(self._key("credential_fail", identifier))
        except Exception as exc:
            logger.warning("Admin auth throttle clear failed: %s", exc)

    async def enforce_otp_issue_limit(self, identifier: str) -> None:
        key = self._key("otp_issue", identifier)
        try:
            count = await self._r.incr(key)
            if count == 1:
                await self._r.expire(key, ADMIN_LOGIN_OTP_TTL_SECONDS)
        except Exception as exc:
            logger.warning("Admin OTP issue throttle failed: %s", exc)
            return
        if int(count) > ADMIN_OTP_ISSUE_MAX_PER_MINUTE:
            raise AdminOtpFailure("rate_limited")


@lru_cache(maxsize=1)
def _admin_auth_redis_client() -> aioredis.Redis:
    from app.core.config import get_settings

    return aioredis.from_url(get_settings().redis_url, decode_responses=True)


def get_admin_auth_throttle() -> AdminAuthThrottle:
    return AdminAuthThrottle(_admin_auth_redis_client())


def build_admin_principal(admin: Admin) -> AdminPrincipal:
    return AdminPrincipal(
        id=admin.id,
        username=admin.username,
        email=admin.email,
        phone_number=admin.phone_number,
        telegram_id=admin.telegram_id,
        role=UserRole(admin.role.value),
        is_active=admin.is_active,
    )


async def get_admin_by_login(session: AsyncSession, login: str) -> Admin | None:
    normalized_login = _normalize_login(login)
    query = select(Admin).where(
        or_(
            func.lower(Admin.username) == normalized_login,
            func.lower(Admin.email) == normalized_login,
        )
    )
    return (await session.scalars(query)).first()


async def get_admin_by_phone_number(session: AsyncSession, phone_number: str) -> Admin | None:
    normalized_phone = normalize_phone_number(phone_number)
    return await session.scalar(select(Admin).where(Admin.phone_number == normalized_phone))


async def authenticate_admin(session: AsyncSession, login: str, password: str) -> Admin | None:
    admin = await get_admin_by_login(session, login)
    if admin is None or not admin.is_active:
        return None
    if not verify_password(password, admin.password_hash):
        return None
    admin.last_login_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(admin)
    return admin


async def authenticate_admin_by_phone_number(session: AsyncSession, phone_number: str, password: str) -> Admin | None:
    admin = await get_admin_by_phone_number(session, phone_number)
    if admin is None or not admin.is_active:
        return None
    if not verify_password(password, admin.password_hash):
        return None
    return admin


async def get_admin_by_id(session: AsyncSession, admin_id: UUID) -> Admin | None:
    return await session.get(Admin, admin_id)


async def update_admin_security_settings(
    session: AsyncSession,
    *,
    admin_id: UUID,
    current_password: str,
    phone_number: str | None = None,
    new_password: str | None = None,
) -> Admin:
    admin = await session.get(Admin, admin_id)
    if admin is None or not admin.is_active:
        raise AdminOtpFailure("admin_unavailable")
    if not verify_password(current_password, admin.password_hash):
        raise AdminOtpFailure("invalid_current_password")

    changed = False
    if phone_number is not None:
        normalized_phone = normalize_phone_number(phone_number)
        if admin.phone_number != normalized_phone:
            linked_user = await session.scalar(select(User).where(User.phone == normalized_phone))
            if linked_user is None or linked_user.telegram_id is None:
                raise AdminOtpFailure("phone_not_linked")
            duplicate_admin = await session.scalar(
                select(Admin).where(
                    Admin.id != admin.id,
                    or_(
                        Admin.phone_number == normalized_phone,
                        Admin.telegram_id == linked_user.telegram_id,
                    ),
                )
            )
            if duplicate_admin is not None:
                raise AdminOtpFailure("phone_already_used")
            admin.phone_number = normalized_phone
            admin.telegram_id = linked_user.telegram_id
            changed = True

    if new_password:
        if len(new_password) < 8:
            raise AdminOtpFailure("weak_password")
        admin.password_hash = hash_password(new_password)
        changed = True

    if changed:
        await session.commit()
        await session.refresh(admin)
    return admin


async def create_admin_account(
    session: AsyncSession,
    *,
    username: str,
    email: str,
    phone_number: str,
    telegram_id: int,
    password: str,
    role: AdminRole,
) -> Admin:
    normalized_username = username.strip()
    normalized_email = email.strip().lower()
    normalized_phone = normalize_phone_number(phone_number)

    existing = await session.scalar(
        select(Admin).where(
            or_(
                func.lower(Admin.username) == normalized_username.lower(),
                func.lower(Admin.email) == normalized_email,
                Admin.phone_number == normalized_phone,
                Admin.telegram_id == telegram_id,
            )
        )
    )
    if existing is not None:
        raise ValueError("Admin with the same username, email, phone number, or Telegram account already exists.")

    admin = Admin(
        username=normalized_username,
        email=normalized_email,
        phone_number=normalized_phone,
        telegram_id=telegram_id,
        password_hash=hash_password(password),
        role=role,
        is_active=True,
    )
    session.add(admin)
    await session.commit()
    await session.refresh(admin)
    return admin
