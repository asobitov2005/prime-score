from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from time import time
from urllib.parse import parse_qsl, urlencode


class TelegramWebAppValidationError(ValueError):
    """Raised when Telegram Mini App initData is missing, expired, or forged."""


@dataclass(frozen=True)
class TelegramWebAppUser:
    telegram_id: int
    first_name: str
    last_name: str | None
    username: str | None
    language_code: str | None
    is_bot: bool
    photo_url: str | None


def build_telegram_webapp_fallback_phone(telegram_id: int) -> str:
    return f"tg:{telegram_id}"


def _parse_auth_date(value: str | None) -> int:
    if value is None:
        raise TelegramWebAppValidationError("Telegram auth_date is missing.")
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise TelegramWebAppValidationError("Telegram auth_date is invalid.") from exc


def validate_telegram_webapp_init_data(
    init_data: str,
    *,
    bot_token: str,
    max_age_seconds: int = 86_400,
    now_timestamp: int | None = None,
) -> TelegramWebAppUser:
    if not bot_token or bot_token == "change-me":
        raise TelegramWebAppValidationError("Telegram bot token is not configured.")
    if not init_data:
        raise TelegramWebAppValidationError("Telegram initData is missing.")

    pairs = parse_qsl(init_data, keep_blank_values=True, strict_parsing=False)
    payload = dict(pairs)
    received_hash = payload.pop("hash", None)
    if not received_hash:
        raise TelegramWebAppValidationError("Telegram hash is missing.")

    auth_date = _parse_auth_date(payload.get("auth_date"))
    current_timestamp = now_timestamp if now_timestamp is not None else int(time())
    if max_age_seconds > 0 and current_timestamp - auth_date > max_age_seconds:
        raise TelegramWebAppValidationError("Telegram session is expired.")
    if auth_date - current_timestamp > 300:
        raise TelegramWebAppValidationError("Telegram auth_date is from the future.")

    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(payload.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calculated_hash, received_hash):
        raise TelegramWebAppValidationError("Telegram signature is invalid.")

    try:
        raw_user = json.loads(payload.get("user") or "{}")
    except json.JSONDecodeError as exc:
        raise TelegramWebAppValidationError("Telegram user payload is invalid.") from exc

    telegram_id = raw_user.get("id")
    if not isinstance(telegram_id, int):
        raise TelegramWebAppValidationError("Telegram user id is missing.")

    first_name = str(raw_user.get("first_name") or raw_user.get("username") or "User").strip() or "User"
    last_name = raw_user.get("last_name")
    username = raw_user.get("username")
    language_code = raw_user.get("language_code")
    photo_url = raw_user.get("photo_url")

    return TelegramWebAppUser(
        telegram_id=telegram_id,
        first_name=first_name,
        last_name=str(last_name).strip() if last_name else None,
        username=str(username).strip() if username else None,
        language_code=str(language_code).strip() if language_code else None,
        is_bot=bool(raw_user.get("is_bot", False)),
        photo_url=str(photo_url).strip() if photo_url else None,
    )


def build_signed_telegram_webapp_init_data(
    *,
    bot_token: str,
    user: dict,
    auth_date: datetime | None = None,
    query_id: str = "test-query",
) -> str:
    """Test helper that builds Telegram-compatible initData."""
    timestamp = int((auth_date or datetime.now(UTC)).timestamp())
    payload = {
        "auth_date": str(timestamp),
        "query_id": query_id,
        "user": json.dumps(user, separators=(",", ":")),
    }
    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(payload.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    payload["hash"] = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    return urlencode(payload)
