from __future__ import annotations

import hashlib
import logging
from functools import lru_cache

import redis.asyncio as aioredis

from app.services.admin_auth_shared import (
    ADMIN_CREDENTIAL_FAILURE_WINDOW_SECONDS,
    ADMIN_CREDENTIAL_MAX_FAILURES,
    ADMIN_LOGIN_OTP_TTL_SECONDS,
    ADMIN_OTP_ISSUE_MAX_PER_MINUTE,
    ADMIN_PASSWORD_RESET_IP_DAILY_MAX,
    ADMIN_PASSWORD_RESET_IP_DAILY_WINDOW_SECONDS,
    ADMIN_PASSWORD_RESET_IP_SHORT_MAX,
    ADMIN_PASSWORD_RESET_IP_SHORT_WINDOW_SECONDS,
    ADMIN_PASSWORD_RESET_PHONE_DAILY_MAX,
    ADMIN_PASSWORD_RESET_PHONE_DAILY_WINDOW_SECONDS,
    ADMIN_PASSWORD_RESET_PHONE_SHORT_MAX,
    ADMIN_PASSWORD_RESET_PHONE_SHORT_WINDOW_SECONDS,
    AdminOtpFailure,
    normalize_phone_number,
)

logger = logging.getLogger(__name__)
_ADMIN_AUTH_THROTTLE_PFX = "primescore:admin_auth:"


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

    async def _increment_window(self, scope: str, identifier: str, window_seconds: int) -> int:
        key = self._key(scope, identifier)
        count = await self._r.incr(key)
        if int(count) == 1:
            await self._r.expire(key, window_seconds)
        return int(count)

    async def enforce_password_reset_issue_limit(self, *, phone_number: str, ip_address: str) -> None:
        normalized_phone = normalize_phone_number(phone_number)
        normalized_ip = ip_address.strip() or "unknown"
        try:
            limits = [
                (
                    await self._increment_window(
                        "password_reset_phone_15m",
                        normalized_phone,
                        ADMIN_PASSWORD_RESET_PHONE_SHORT_WINDOW_SECONDS,
                    ),
                    ADMIN_PASSWORD_RESET_PHONE_SHORT_MAX,
                ),
                (
                    await self._increment_window(
                        "password_reset_phone_24h",
                        normalized_phone,
                        ADMIN_PASSWORD_RESET_PHONE_DAILY_WINDOW_SECONDS,
                    ),
                    ADMIN_PASSWORD_RESET_PHONE_DAILY_MAX,
                ),
                (
                    await self._increment_window(
                        "password_reset_ip_15m",
                        normalized_ip,
                        ADMIN_PASSWORD_RESET_IP_SHORT_WINDOW_SECONDS,
                    ),
                    ADMIN_PASSWORD_RESET_IP_SHORT_MAX,
                ),
                (
                    await self._increment_window(
                        "password_reset_ip_24h",
                        normalized_ip,
                        ADMIN_PASSWORD_RESET_IP_DAILY_WINDOW_SECONDS,
                    ),
                    ADMIN_PASSWORD_RESET_IP_DAILY_MAX,
                ),
            ]
        except Exception as exc:
            logger.warning("Admin password reset throttle failed: %s", exc)
            return
        if any(count > max_count for count, max_count in limits):
            raise AdminOtpFailure("rate_limited")


@lru_cache(maxsize=1)
def _admin_auth_redis_client() -> aioredis.Redis:
    from app.core.config import get_settings

    return aioredis.from_url(get_settings().redis_url, decode_responses=True)


def get_admin_auth_throttle() -> AdminAuthThrottle:
    return AdminAuthThrottle(_admin_auth_redis_client())
