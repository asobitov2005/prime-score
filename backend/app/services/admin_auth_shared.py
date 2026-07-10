from __future__ import annotations

import html
import re
import secrets
from datetime import datetime, timezone
from urllib.parse import urlencode, urlparse
from uuid import UUID


ADMIN_LOGIN_OTP_PURPOSE = "admin_login"
ADMIN_PASSWORD_RESET_PURPOSE = "admin_password_reset"
ADMIN_LOGIN_OTP_TTL_SECONDS = 60
ADMIN_PASSWORD_RESET_TTL_SECONDS = 10 * 60
ADMIN_LOGIN_OTP_MAX_ATTEMPTS = 5
ADMIN_PASSWORD_RESET_MAX_ATTEMPTS = 5
ADMIN_PASSWORD_MIN_LENGTH = 8
ADMIN_CREDENTIAL_MAX_FAILURES = 5
ADMIN_CREDENTIAL_FAILURE_WINDOW_SECONDS = 5 * 60
ADMIN_OTP_ISSUE_MAX_PER_MINUTE = 3
ADMIN_PASSWORD_RESET_PHONE_SHORT_MAX = 3
ADMIN_PASSWORD_RESET_PHONE_SHORT_WINDOW_SECONDS = 15 * 60
ADMIN_PASSWORD_RESET_PHONE_DAILY_MAX = 10
ADMIN_PASSWORD_RESET_PHONE_DAILY_WINDOW_SECONDS = 24 * 60 * 60
ADMIN_PASSWORD_RESET_IP_SHORT_MAX = 10
ADMIN_PASSWORD_RESET_IP_SHORT_WINDOW_SECONDS = 15 * 60
ADMIN_PASSWORD_RESET_IP_DAILY_MAX = 30
ADMIN_PASSWORD_RESET_IP_DAILY_WINDOW_SECONDS = 24 * 60 * 60


def normalize_login(value: str) -> str:
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


def build_admin_password_reset_message(reset_url: str | None = None) -> str:
    minutes = ADMIN_PASSWORD_RESET_TTL_SECONDS // 60
    message = (
        "🔐 <b>PrimeScore admin password reset</b>\n\n"
        "A password reset request was received. If this was you, tap the button below.\n\n"
        f"This link expires in <b>{minutes} minutes</b>. "
        "If you did not request this, ignore this message."
    )
    if reset_url and is_local_admin_reset_url(reset_url):
        message += f"\n\nReset link:\n<code>{html.escape(reset_url)}</code>"
    return message


def build_admin_password_reset_success_message() -> str:
    return "✅ <b>Your admin password was changed successfully.</b>"


def build_admin_password_reset_url(token: UUID | str) -> str:
    from app.core.config import get_settings

    base_url = get_settings().admin_public_url.strip().rstrip("/") or "http://localhost:3001"
    return f"{base_url}/reset-password?{urlencode({'token': str(token)})}"


def is_local_admin_reset_url(reset_url: str) -> bool:
    try:
        parsed = urlparse(reset_url)
    except ValueError:
        return False
    return parsed.hostname in {"localhost", "127.0.0.1", "0.0.0.0"}


def build_admin_password_reset_reply_markup(reset_url: str) -> dict:
    if is_local_admin_reset_url(reset_url):
        return {
            "inline_keyboard": [[{"text": "Copy reset link", "copy_text": {"text": reset_url}}]]
        }
    return {
        "inline_keyboard": [[{"text": "Reset password", "url": reset_url}]]
    }


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
