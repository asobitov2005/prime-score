import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings


def _create_token(
    subject: str,
    secret: str,
    expires_delta: timedelta,
    token_type: str,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    payload = {
        "sub": subject,
        "type": token_type,
        "exp": datetime.now(UTC) + expires_delta,
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, secret, algorithm="HS256")


def create_access_token(
    subject: str,
    extra_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    settings = get_settings()
    return _create_token(
        subject=subject,
        secret=settings.jwt_secret,
        expires_delta=expires_delta or timedelta(minutes=settings.access_token_expire_minutes),
        token_type="access",
        extra_claims=extra_claims,
    )


def create_refresh_token(
    subject: str,
    extra_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    settings = get_settings()
    return _create_token(
        subject=subject,
        secret=settings.jwt_refresh_secret,
        expires_delta=expires_delta or timedelta(days=settings.refresh_token_expire_days),
        token_type="refresh",
        extra_claims=extra_claims,
    )


def decode_token(token: str, *, refresh: bool = False) -> dict[str, Any]:
    settings = get_settings()
    secret = settings.jwt_refresh_secret if refresh else settings.jwt_secret
    expected_type = "refresh" if refresh else "access"
    payload = jwt.decode(token, secret, algorithms=["HS256"])
    if payload.get("type") != expected_type:
        raise JWTError(f"Invalid token type: expected {expected_type}.")
    return payload


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    if not password_hash.startswith("$2"):
        return False
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def generate_login_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def create_stub_token(prefix: str) -> str:
    return f"{prefix}.{secrets.token_urlsafe(24)}"


def hash_token(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
