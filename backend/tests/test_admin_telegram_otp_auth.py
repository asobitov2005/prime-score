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


def test_admin_login_request_uses_phone_number_instead_of_username() -> None:
    payload = AdminAuthLoginRequest(phone_number="+998 90 123-45-67", password="secret")

    assert payload.phone_number == "+998901234567"
    assert AdminAuthLoginRequest(phone_number="940034424", password="secret").phone_number == "+998940034424"

    with pytest.raises(ValidationError):
        AdminAuthLoginRequest(login="test_admin", password="secret")


def test_admin_password_reset_request_normalizes_phone_number() -> None:
    payload = AdminPasswordResetRequest(phone_number="+998 90 123-45-67")

    assert payload.phone_number == "+998901234567"
    assert AdminPasswordResetRequest(phone_number="940034424").phone_number == "+998940034424"


def test_admin_verify_otp_request_accepts_five_digit_code() -> None:
    payload = AdminAuthVerifyOtpRequest(challenge_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", otp_code="12345")

    assert payload.otp_code == "12345"

    with pytest.raises(ValidationError):
        AdminAuthVerifyOtpRequest(challenge_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", otp_code="123456")


def test_admin_models_store_telegram_otp_auth_fields() -> None:
    admin_columns = set(Admin.__mapper__.columns.keys())
    otp_columns = set(AdminLoginOtp.__mapper__.columns.keys())

    assert {"phone_number", "telegram_id"} <= admin_columns
    assert {
        "phone_number",
        "telegram_id",
        "telegram_message_id",
        "otp_code",
        "purpose",
        "expires_at",
        "attempts",
        "used_at",
    } <= otp_columns


def test_admin_otp_code_and_message_are_five_digit_admin_login() -> None:
    codes = {generate_admin_otp_code() for _ in range(20)}

    assert all(code.isdigit() and len(code) == 5 for code in codes)
    assert ADMIN_LOGIN_OTP_TTL_SECONDS == 60
    assert ADMIN_LOGIN_OTP_PURPOSE == "admin_login"
    assert "12345" in build_admin_otp_message("12345")
    assert "60 seconds" in build_admin_otp_message("12345")


def test_admin_password_reset_message_asks_for_new_password() -> None:
    reset_url = "http://localhost:3001/reset-password?token=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    message = build_admin_password_reset_message(reset_url)

    assert ADMIN_PASSWORD_RESET_PURPOSE == "admin_password_reset"
    assert ADMIN_PASSWORD_RESET_TTL_SECONDS == 600
    assert "password reset request was received" in message
    assert "10 minutes" in message
    assert reset_url in message
    assert build_admin_password_reset_reply_markup(reset_url) == {
        "inline_keyboard": [
            [
                {
                    "text": "Copy reset link",
                    "copy_text": {"text": reset_url},
                }
            ]
        ]
    }


def test_admin_otp_is_single_use() -> None:
    now = datetime(2026, 5, 9, 12, 0, tzinfo=UTC)
    otp = AdminLoginOtp(
        phone_number="+998901234567",
        telegram_id=123456789,
        otp_code="54321",
        purpose=ADMIN_LOGIN_OTP_PURPOSE,
        expires_at=now + timedelta(seconds=60),
    )

    consume_admin_login_otp(otp, "54321", now=now)

    assert otp.used_at == now

    with pytest.raises(AdminOtpFailure, match="used"):
        consume_admin_login_otp(otp, "54321", now=now)


def test_admin_otp_expires_and_tracks_failed_attempts() -> None:
    now = datetime(2026, 5, 9, 12, 0, tzinfo=UTC)
    otp = AdminLoginOtp(
        phone_number=normalize_phone_number("+998 (90) 123-45-67"),
        telegram_id=123456789,
        otp_code="54321",
        purpose=ADMIN_LOGIN_OTP_PURPOSE,
        expires_at=now + timedelta(seconds=60),
    )

    with pytest.raises(AdminOtpFailure, match="invalid"):
        consume_admin_login_otp(otp, "00000", now=now)
    assert otp.attempts == 1
    assert otp.used_at is None

    otp.attempts = ADMIN_LOGIN_OTP_MAX_ATTEMPTS
    with pytest.raises(AdminOtpFailure, match="locked"):
        consume_admin_login_otp(otp, "54321", now=now)

    otp.attempts = 0
    with pytest.raises(AdminOtpFailure, match="expired"):
        consume_admin_login_otp(otp, "54321", now=now + timedelta(seconds=61))


class _FakeSecuritySession:
    def __init__(self, admin: Admin, scalars: list[object | None] | None = None) -> None:
        self.admin = admin
        self.scalars = list(scalars or [])
        self.commits = 0
        self.refreshes = 0

    async def get(self, model, item_id: UUID):
        if model is Admin and self.admin.id == item_id:
            return self.admin
        return None

    async def scalar(self, _statement):
        if self.scalars:
            return self.scalars.pop(0)
        return None

    async def commit(self) -> None:
        self.commits += 1

    async def refresh(self, _item: object) -> None:
        self.refreshes += 1


@pytest.mark.asyncio
async def test_update_admin_security_settings_requires_current_password() -> None:
    from app.core.security import hash_password

    admin = Admin(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        username="secure_admin",
        email="secure-admin@primescore.local",
        phone_number="+998901234567",
        telegram_id=123456789,
        password_hash=hash_password("old-password"),
        role=AdminRole.ADMIN,
        is_active=True,
    )
    session = _FakeSecuritySession(admin)

    with pytest.raises(AdminOtpFailure, match="invalid_current_password"):
        await update_admin_security_settings(
            session,
            admin_id=admin.id,
            current_password="wrong-password",
            phone_number="940034424",
            new_password="new-password",
        )

    assert admin.phone_number == "+998901234567"
    assert session.commits == 0


@pytest.mark.asyncio
async def test_update_admin_security_settings_relinks_phone_and_updates_password() -> None:
    from app.core.security import hash_password, verify_password

    admin = Admin(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        username="secure_admin",
        email="secure-admin@primescore.local",
        phone_number="+998901234567",
        telegram_id=123456789,
        password_hash=hash_password("old-password"),
        role=AdminRole.ADMIN,
        is_active=True,
    )
    linked_user = User(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        phone="+998940034424",
        telegram_id=713237173,
        first_name="Linked",
        is_premium=False,
    )
    session = _FakeSecuritySession(admin, scalars=[linked_user, None])

    updated = await update_admin_security_settings(
        session,
        admin_id=admin.id,
        current_password="old-password",
        phone_number="940034424",
        new_password="new-password",
    )

    assert updated.phone_number == "+998940034424"
    assert updated.telegram_id == 713237173
    assert verify_password("new-password", updated.password_hash)
    assert session.commits == 1
    assert session.refreshes == 1


class _FakeThrottle:
    def __init__(self, *, credentials_limited: bool = False, password_reset_limited: bool = False) -> None:
        self.credentials_limited = credentials_limited
        self.password_reset_limited = password_reset_limited
        self.failed_credentials_recorded: list[str] = []
        self.cleared_credentials: list[str] = []
        self.otp_issue_identifiers: list[str] = []
        self.password_reset_issue_identifiers: list[tuple[str, str]] = []

    async def is_credentials_limited(self, identifier: str) -> bool:
        return self.credentials_limited

    async def record_failed_credentials(self, identifier: str) -> int:
        self.failed_credentials_recorded.append(identifier)
        return len(self.failed_credentials_recorded)

    async def clear_failed_credentials(self, identifier: str) -> None:
        self.cleared_credentials.append(identifier)

    async def enforce_otp_issue_limit(self, identifier: str) -> None:
        self.otp_issue_identifiers.append(identifier)

    async def enforce_password_reset_issue_limit(self, *, phone_number: str, ip_address: str) -> None:
        self.password_reset_issue_identifiers.append((phone_number, ip_address))
        if self.password_reset_limited:
            raise AdminOtpFailure("rate_limited")


class _FakeRequestClient:
    def __init__(self, host: str) -> None:
        self.host = host


class _FakeRequest:
    def __init__(self, *, host: str = "203.0.113.9", headers: dict[str, str] | None = None) -> None:
        self.client = _FakeRequestClient(host)
        self.headers = headers or {}


class _FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, int] = {}
        self.expires: dict[str, int] = {}

    async def get(self, key: str) -> int | None:
        return self.values.get(key)

    async def incr(self, key: str) -> int:
        self.values[key] = self.values.get(key, 0) + 1
        return self.values[key]

    async def expire(self, key: str, seconds: int) -> bool:
        self.expires[key] = seconds
        return True

    async def delete(self, key: str) -> None:
        self.values.pop(key, None)
        self.expires.pop(key, None)


@pytest.mark.asyncio
async def test_admin_password_reset_throttle_creates_phone_and_ip_windows() -> None:
    redis = _FakeRedis()
    throttle = AdminAuthThrottle(redis)  # type: ignore[arg-type]

    await throttle.enforce_password_reset_issue_limit(
        phone_number="+998 90 123-45-67",
        ip_address="203.0.113.9",
    )

    assert len(redis.values) == 4
    assert sorted(redis.expires.values()) == [
        ADMIN_PASSWORD_RESET_IP_SHORT_WINDOW_SECONDS,
        ADMIN_PASSWORD_RESET_PHONE_SHORT_WINDOW_SECONDS,
        ADMIN_PASSWORD_RESET_IP_DAILY_WINDOW_SECONDS,
        ADMIN_PASSWORD_RESET_PHONE_DAILY_WINDOW_SECONDS,
    ]


@pytest.mark.asyncio
async def test_admin_password_reset_throttle_limits_per_phone_short_window() -> None:
    redis = _FakeRedis()
    throttle = AdminAuthThrottle(redis)  # type: ignore[arg-type]

    for _ in range(ADMIN_PASSWORD_RESET_PHONE_SHORT_MAX):
        await throttle.enforce_password_reset_issue_limit(
            phone_number="+998901234567",
            ip_address="203.0.113.9",
        )

    with pytest.raises(AdminOtpFailure, match="rate_limited"):
        await throttle.enforce_password_reset_issue_limit(
            phone_number="+998901234567",
            ip_address="203.0.113.9",
        )


@pytest.mark.asyncio
async def test_admin_password_reset_throttle_limits_per_phone_daily_window() -> None:
    redis = _FakeRedis()
    throttle = AdminAuthThrottle(redis)  # type: ignore[arg-type]
    redis.values[throttle._key("password_reset_phone_24h", "+998901234567")] = (
        ADMIN_PASSWORD_RESET_PHONE_DAILY_MAX
    )

    with pytest.raises(AdminOtpFailure, match="rate_limited"):
        await throttle.enforce_password_reset_issue_limit(
            phone_number="+998901234567",
            ip_address="203.0.113.9",
        )


@pytest.mark.asyncio
async def test_admin_password_reset_throttle_limits_per_ip_short_window() -> None:
    redis = _FakeRedis()
    throttle = AdminAuthThrottle(redis)  # type: ignore[arg-type]

    for index in range(ADMIN_PASSWORD_RESET_IP_SHORT_MAX):
        await throttle.enforce_password_reset_issue_limit(
            phone_number=f"+99890000{index:04d}",
            ip_address="203.0.113.9",
        )

    with pytest.raises(AdminOtpFailure, match="rate_limited"):
        await throttle.enforce_password_reset_issue_limit(
            phone_number="+998900009999",
            ip_address="203.0.113.9",
        )


@pytest.mark.asyncio
async def test_admin_password_reset_throttle_limits_per_ip_daily_window() -> None:
    redis = _FakeRedis()
    throttle = AdminAuthThrottle(redis)  # type: ignore[arg-type]
    redis.values[throttle._key("password_reset_ip_24h", "203.0.113.9")] = ADMIN_PASSWORD_RESET_IP_DAILY_MAX

    with pytest.raises(AdminOtpFailure, match="rate_limited"):
        await throttle.enforce_password_reset_issue_limit(
            phone_number="+998901234567",
            ip_address="203.0.113.9",
        )


class _FakeSession:
    def __init__(
        self,
        challenge: AdminLoginOtp | None = None,
        admin: Admin | None = None,
        execute_rows: list[tuple[int, int | None]] | None = None,
        scalars: list[object | None] | None = None,
    ) -> None:
        self.added: list[object] = []
        self.challenge = challenge
        self.admin = admin
        self.execute_rows = execute_rows or []
        self.scalars = list(scalars or [])
        self.commits = 0
        self.rollbacks = 0
        self.refreshes = 0

    async def execute(self, _statement):
        return _FakeExecuteResult(self.execute_rows)

    async def scalar(self, _statement):
        if self.scalars:
            return self.scalars.pop(0)
        return None

    def add(self, item: object) -> None:
        self.added.append(item)

    async def flush(self) -> None:
        for item in self.added:
            if getattr(item, "id", None) is None:
                item.id = uuid4()

    async def commit(self) -> None:
        self.commits += 1

    async def rollback(self) -> None:
        self.rollbacks += 1

    async def refresh(self, item: object) -> None:
        self.refreshes += 1
        if getattr(item, "id", None) is None:
            item.id = uuid4()

    async def get(self, model, item_id: UUID):
        if model is AdminLoginOtp and self.challenge and self.challenge.id == item_id:
            return self.challenge
        if model is Admin and self.admin and self.admin.id == item_id:
            return self.admin
        return None


class _FakeExecuteResult:
    def __init__(self, rows: list[tuple[int, int | None]]) -> None:
        self._rows = rows

    def all(self) -> list[tuple[int, int | None]]:
        return self._rows


@pytest.mark.asyncio
async def test_admin_password_reset_request_is_generic_for_unknown_phone(monkeypatch) -> None:
    throttle = _FakeThrottle()
    session = _FakeSession(scalars=[None])
    sent_messages: list[dict[str, object]] = []

    async def fake_send_telegram_message_with_id(**kwargs):
        sent_messages.append(kwargs)
        return 111

    monkeypatch.setattr(admin_routes, "get_admin_auth_throttle", lambda: throttle)
    monkeypatch.setattr(admin_routes, "send_telegram_message_with_id", fake_send_telegram_message_with_id)

    response = await admin_routes.request_admin_password_reset(
        AdminPasswordResetRequest(phone_number="+998901234567"),
        request=_FakeRequest(headers={"x-forwarded-for": "198.51.100.10, 10.0.0.1"}),
        session=session,
    )

    assert response.message == admin_routes.ADMIN_PASSWORD_RESET_GENERIC_MESSAGE
    assert throttle.password_reset_issue_identifiers == [("+998901234567", "198.51.100.10")]
    assert session.added == []
    assert sent_messages == []


@pytest.mark.asyncio
async def test_admin_password_reset_request_sends_telegram_prompt(monkeypatch) -> None:
    admin = Admin(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        username="secure_admin",
        email="secure-admin@primescore.local",
        phone_number="+998901234567",
        telegram_id=123456789,
        password_hash="not-used",
        role=AdminRole.ADMIN,
        is_active=True,
    )
    throttle = _FakeThrottle()
    session = _FakeSession(admin=admin, scalars=[admin], execute_rows=[(123456789, 999)])
    sent_messages: list[dict[str, object]] = []
    edited_messages: list[dict[str, object]] = []
    scheduled_challenges: list[UUID] = []

    async def fake_send_telegram_message_with_id(**kwargs):
        sent_messages.append(kwargs)
        return 111

    async def fake_edit_telegram_message(**kwargs):
        edited_messages.append(kwargs)
        return True

    monkeypatch.setattr(admin_routes, "get_admin_auth_throttle", lambda: throttle)
    monkeypatch.setattr(admin_routes, "generate_admin_otp_code", lambda: "12345")
    monkeypatch.setattr(admin_routes, "send_telegram_message_with_id", fake_send_telegram_message_with_id)
    monkeypatch.setattr(admin_routes, "edit_telegram_message", fake_edit_telegram_message)
    monkeypatch.setattr(
        admin_routes,
        "_schedule_admin_otp_expiry_notice",
        lambda challenge_id: scheduled_challenges.append(challenge_id),
    )

    response = await admin_routes.request_admin_password_reset(
        AdminPasswordResetRequest(phone_number="+998 90 123-45-67"),
        request=_FakeRequest(),
        session=session,
    )

    challenge = session.added[0]
    assert isinstance(challenge, AdminLoginOtp)
    assert response.message == admin_routes.ADMIN_PASSWORD_RESET_GENERIC_MESSAGE
    assert throttle.password_reset_issue_identifiers == [("+998901234567", "203.0.113.9")]
    assert challenge.admin_id == admin.id
    assert challenge.phone_number == "+998901234567"
    assert challenge.telegram_id == 123456789
    assert challenge.telegram_message_id == 111
    assert challenge.otp_code == "12345"
    assert challenge.purpose == ADMIN_PASSWORD_RESET_PURPOSE
    assert scheduled_challenges == [challenge.id]
    reset_url = build_admin_password_reset_url(challenge.id)
    assert sent_messages == [
        {
            "chat_id": 123456789,
            "text": build_admin_password_reset_message(reset_url),
            "reply_markup": build_admin_password_reset_reply_markup(reset_url),
        }
    ]
    assert edited_messages == [
        {
            "chat_id": 123456789,
            "message_id": 999,
            "text": admin_routes.ADMIN_PASSWORD_RESET_REPLACED_MESSAGE,
        }
    ]


@pytest.mark.asyncio
async def test_consume_admin_password_reset_token_updates_password_and_rotates_sessions() -> None:
    from app.core.security import hash_password, verify_password

    now = datetime(2026, 5, 9, 12, 0, tzinfo=UTC)
    admin = Admin(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        username="secure_admin",
        email="secure-admin@primescore.local",
        phone_number="+998901234567",
        telegram_id=123456789,
        password_hash=hash_password("old-password"),
        role=AdminRole.ADMIN,
        is_active=True,
    )
    challenge = AdminLoginOtp(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        admin_id=admin.id,
        phone_number="+998901234567",
        telegram_id=123456789,
        otp_code="12345",
        purpose=ADMIN_PASSWORD_RESET_PURPOSE,
        expires_at=now + timedelta(seconds=ADMIN_PASSWORD_RESET_TTL_SECONDS),
        attempts=0,
    )
    session = _FakeSession(admin=admin, challenge=challenge, scalars=[challenge])

    updated = await consume_admin_password_reset_token(
        session,
        token=str(challenge.id),
        new_password="new-password",
        now=now,
    )

    assert updated is admin
    assert verify_password("new-password", admin.password_hash)
    assert admin.auth_version == 2
    assert challenge.used_at == now
    assert session.commits == 1
    assert session.refreshes == 1


@pytest.mark.asyncio
async def test_consume_admin_password_reset_token_rejects_short_password() -> None:
    now = datetime(2026, 5, 9, 12, 0, tzinfo=UTC)
    challenge = AdminLoginOtp(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        admin_id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        phone_number="+998901234567",
        telegram_id=123456789,
        otp_code="12345",
        purpose=ADMIN_PASSWORD_RESET_PURPOSE,
        expires_at=now + timedelta(seconds=ADMIN_PASSWORD_RESET_TTL_SECONDS),
        attempts=0,
    )
    session = _FakeSession(challenge=challenge, scalars=[challenge])

    with pytest.raises(AdminOtpFailure, match="weak_password"):
        await consume_admin_password_reset_token(
            session,
            token=str(challenge.id),
            new_password="short",
            now=now,
        )

    assert challenge.attempts == 1
    assert challenge.used_at is None
    assert session.commits == 1


@pytest.mark.asyncio
async def test_consume_admin_password_reset_token_closes_expired_request() -> None:
    now = datetime(2026, 5, 9, 12, 0, tzinfo=UTC)
    challenge = AdminLoginOtp(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        admin_id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        phone_number="+998901234567",
        telegram_id=123456789,
        otp_code="12345",
        purpose=ADMIN_PASSWORD_RESET_PURPOSE,
        expires_at=now - timedelta(seconds=1),
        attempts=0,
    )
    session = _FakeSession(challenge=challenge, scalars=[challenge])

    with pytest.raises(AdminOtpFailure, match="expired"):
        await consume_admin_password_reset_token(
            session,
            token=str(challenge.id),
            new_password="new-password",
            now=now,
        )

    assert challenge.used_at == now
    assert session.commits == 1


@pytest.mark.asyncio
async def test_complete_admin_password_reset_sends_success_message(monkeypatch) -> None:
    from app.core.security import hash_password, verify_password

    now = datetime.now(UTC)
    admin = Admin(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        username="secure_admin",
        email="secure-admin@primescore.local",
        phone_number="+998901234567",
        telegram_id=123456789,
        password_hash=hash_password("old-password"),
        role=AdminRole.ADMIN,
        is_active=True,
    )
    challenge = AdminLoginOtp(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        admin_id=admin.id,
        phone_number="+998901234567",
        telegram_id=123456789,
        otp_code="12345",
        purpose=ADMIN_PASSWORD_RESET_PURPOSE,
        expires_at=now + timedelta(seconds=ADMIN_PASSWORD_RESET_TTL_SECONDS),
        attempts=0,
    )
    session = _FakeSession(admin=admin, challenge=challenge)
    sent_messages: list[dict[str, object]] = []

    async def fake_send_telegram_message_with_id(**kwargs):
        sent_messages.append(kwargs)
        return 111

    monkeypatch.setattr(admin_routes, "send_telegram_message_with_id", fake_send_telegram_message_with_id)

    response = await admin_routes.complete_admin_password_reset(
        AdminPasswordResetCompleteRequest(token=str(challenge.id), new_password="new-password"),
        session=session,
    )

    assert response.message == "Admin password updated successfully."
    assert verify_password("new-password", admin.password_hash)
    assert admin.auth_version == 2
    assert challenge.used_at is not None
    assert sent_messages == [
        {
            "chat_id": 123456789,
            "text": "✅ <b>Your admin password was changed successfully.</b>",
        }
    ]


@pytest.mark.asyncio
async def test_admin_refresh_rejects_old_auth_version_token() -> None:
    from app.core.security import create_refresh_token

    admin = Admin(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        username="secure_admin",
        email="secure-admin@primescore.local",
        phone_number="+998901234567",
        telegram_id=123456789,
        password_hash="not-used",
        auth_version=2,
        role=AdminRole.ADMIN,
        is_active=True,
    )
    token = create_refresh_token(
        str(admin.id),
        extra_claims={
            "scope": "admin",
            "role": "admin",
            "username": admin.username,
            "email": admin.email,
            "auth_version": 1,
        },
    )

    with pytest.raises(HTTPException) as exc:
        await admin_routes.refresh_admin_session(
            AdminAuthRefreshRequest(refresh_token=token),
            session=_FakeSession(admin=admin),
        )

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_admin_login_does_not_generate_or_send_otp_when_password_fails(monkeypatch) -> None:
    throttle = _FakeThrottle()
    session = _FakeSession()
    sent_messages: list[dict[str, object]] = []

    async def reject_credentials(_session, _phone_number: str, _password: str):
        return None

    async def fake_send_telegram_message_with_id(**kwargs):
        sent_messages.append(kwargs)
        return 111

    monkeypatch.setattr(admin_routes, "get_admin_auth_throttle", lambda: throttle)
    monkeypatch.setattr(admin_routes, "authenticate_admin_by_phone_number", reject_credentials)
    monkeypatch.setattr(admin_routes, "send_telegram_message_with_id", fake_send_telegram_message_with_id)

    with pytest.raises(HTTPException) as exc:
        await admin_routes.login_admin(
            AdminAuthLoginRequest(phone_number="+998 90 123-45-67", password="wrong"),
            session=session,
        )

    assert exc.value.status_code == 401
    assert throttle.failed_credentials_recorded == ["+998901234567"]
    assert session.added == []
    assert sent_messages == []


@pytest.mark.asyncio
async def test_admin_login_rate_limit_blocks_before_password_check_or_otp_send(monkeypatch) -> None:
    throttle = _FakeThrottle(credentials_limited=True)
    session = _FakeSession()
    auth_calls = 0
    sent_messages: list[dict[str, object]] = []

    async def authenticate(_session, _phone_number: str, _password: str):
        nonlocal auth_calls
        auth_calls += 1
        return None

    async def fake_send_telegram_message_with_id(**kwargs):
        sent_messages.append(kwargs)
        return 111

    monkeypatch.setattr(admin_routes, "get_admin_auth_throttle", lambda: throttle)
    monkeypatch.setattr(admin_routes, "authenticate_admin_by_phone_number", authenticate)
    monkeypatch.setattr(admin_routes, "send_telegram_message_with_id", fake_send_telegram_message_with_id)

    with pytest.raises(HTTPException) as exc:
        await admin_routes.login_admin(
            AdminAuthLoginRequest(phone_number="+998901234567", password="anything"),
            session=session,
        )

    assert exc.value.status_code == 429
    assert auth_calls == 0
    assert session.added == []
    assert sent_messages == []


@pytest.mark.asyncio
async def test_admin_login_marks_replaced_otp_message_expired(monkeypatch) -> None:
    admin = Admin(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        username="secure_admin",
        email="secure-admin@primescore.local",
        phone_number="+998901234567",
        telegram_id=123456789,
        password_hash="not-used",
        role=AdminRole.ADMIN,
        is_active=True,
    )
    throttle = _FakeThrottle()
    session = _FakeSession(execute_rows=[(123456789, 999)])
    edited_messages: list[dict[str, object]] = []

    async def accept_credentials(_session, _phone_number: str, _password: str):
        return admin

    async def fake_send_telegram_message_with_id(**_kwargs):
        return 111

    async def fake_edit_telegram_message(**kwargs):
        edited_messages.append(kwargs)
        return True

    monkeypatch.setattr(admin_routes, "get_admin_auth_throttle", lambda: throttle)
    monkeypatch.setattr(admin_routes, "authenticate_admin_by_phone_number", accept_credentials)
    monkeypatch.setattr(admin_routes, "generate_admin_otp_code", lambda: "12345")
    monkeypatch.setattr(admin_routes, "send_telegram_message_with_id", fake_send_telegram_message_with_id)
    monkeypatch.setattr(admin_routes, "edit_telegram_message", fake_edit_telegram_message)
    monkeypatch.setattr(admin_routes, "_schedule_admin_otp_expiry_notice", lambda _challenge_id: None)

    await admin_routes.login_admin(
        AdminAuthLoginRequest(phone_number="+998901234567", password="correct"),
        session=session,
    )

    assert edited_messages == [
        {
            "chat_id": 123456789,
            "message_id": 999,
            "text": admin_routes.ADMIN_OTP_EXPIRED_MESSAGE,
        }
    ]


@pytest.mark.asyncio
async def test_admin_expiry_sweeper_marks_missed_expired_otp_messages(monkeypatch) -> None:
    session = _FakeSession(
        execute_rows=[
            (UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"), 123456789, 222),
            (UUID("dddddddd-dddd-dddd-dddd-dddddddddddd"), 123456789, None),
        ]
    )
    edited_messages: list[dict[str, object]] = []

    async def fake_edit_telegram_message(**kwargs):
        edited_messages.append(kwargs)
        return True

    monkeypatch.setattr(admin_routes, "edit_telegram_message", fake_edit_telegram_message)

    expired_count = await admin_routes._expire_stale_admin_otp_messages(
        session,
        now=datetime(2026, 5, 9, 12, 1, tzinfo=UTC),
    )

    assert expired_count == 2
    assert session.commits == 1
    assert edited_messages == [
        {
            "chat_id": 123456789,
            "message_id": 222,
            "text": admin_routes.ADMIN_OTP_EXPIRED_MESSAGE,
        }
    ]


@pytest.mark.asyncio
async def test_admin_expiry_sweeper_deletes_expired_password_reset_messages(monkeypatch) -> None:
    session = _FakeSession(
        execute_rows=[
            (UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"), 123456789, 222),
        ]
    )
    deleted_messages: list[dict[str, object]] = []

    async def fake_delete_telegram_message(**kwargs):
        deleted_messages.append(kwargs)
        return True

    monkeypatch.setattr(admin_routes, "delete_telegram_message", fake_delete_telegram_message)

    deleted_count = await admin_routes._delete_expired_admin_password_reset_messages(
        session,
        now=datetime(2026, 5, 9, 12, 10, tzinfo=UTC),
    )

    assert deleted_count == 1
    assert session.commits == 1
    assert deleted_messages == [
        {
            "chat_id": 123456789,
            "message_id": 222,
        }
    ]


@pytest.mark.asyncio
async def test_admin_login_sends_otp_and_verify_creates_admin_scoped_session(monkeypatch) -> None:
    admin_id = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    admin = Admin(
        id=admin_id,
        username="secure_admin",
        email="secure-admin@primescore.local",
        phone_number="+998901234567",
        telegram_id=123456789,
        password_hash="not-used",
        role=AdminRole.ADMIN,
        is_active=True,
    )
    throttle = _FakeThrottle()
    session = _FakeSession()
    sent_messages: list[dict[str, object]] = []
    scheduled_challenges: list[UUID] = []
    edited_messages: list[dict[str, object]] = []

    async def accept_credentials(_session, _phone_number: str, _password: str):
        return admin

    async def fake_send_telegram_message_with_id(**kwargs):
        sent_messages.append(kwargs)
        return 111

    monkeypatch.setattr(admin_routes, "get_admin_auth_throttle", lambda: throttle)
    monkeypatch.setattr(admin_routes, "authenticate_admin_by_phone_number", accept_credentials)
    monkeypatch.setattr(admin_routes, "generate_admin_otp_code", lambda: "12345")
    monkeypatch.setattr(admin_routes, "send_telegram_message_with_id", fake_send_telegram_message_with_id)
    monkeypatch.setattr(
        admin_routes,
        "_schedule_admin_otp_expiry_notice",
        lambda challenge_id: scheduled_challenges.append(challenge_id),
    )

    async def fake_edit_telegram_message(**kwargs):
        edited_messages.append(kwargs)
        return True

    monkeypatch.setattr(admin_routes, "edit_telegram_message", fake_edit_telegram_message)

    challenge_response = await admin_routes.login_admin(
        AdminAuthLoginRequest(phone_number="+998 90 123-45-67", password="correct"),
        session=session,
    )

    challenge = session.added[0]
    assert isinstance(challenge, AdminLoginOtp)
    assert challenge_response.challenge_id == challenge.id
    assert challenge.phone_number == "+998901234567"
    assert challenge.telegram_id == 123456789
    assert challenge.telegram_message_id == 111
    assert challenge.otp_code == "12345"
    assert challenge.purpose == "admin_login"
    assert sent_messages == [{"chat_id": 123456789, "text": build_admin_otp_message("12345")}]
    assert scheduled_challenges == [challenge.id]

    verify_session = _FakeSession(challenge=challenge)

    async def get_admin(_session, _admin_id: UUID):
        return admin

    monkeypatch.setattr(admin_routes, "get_admin_by_id", get_admin)

    auth_response = await admin_routes.verify_admin_otp(
        AdminAuthVerifyOtpRequest(challenge_id=challenge.id, otp_code="12345"),
        session=verify_session,
    )

    claims = decode_token(auth_response.access_token)
    assert claims["scope"] == "admin"
    assert claims["sub"] == str(admin_id)
    assert claims["auth_version"] == 1
    assert challenge.used_at is not None
    assert auth_response.admin.phone_number == "+998901234567"
    assert edited_messages == [
        {
            "chat_id": 123456789,
            "message_id": 111,
            "text": admin_routes.ADMIN_OTP_SUCCESS_MESSAGE,
        }
    ]


@pytest.mark.asyncio
async def test_admin_verify_marks_expired_telegram_message(monkeypatch) -> None:
    challenge = AdminLoginOtp(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        admin_id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        phone_number="+998901234567",
        telegram_id=123456789,
        telegram_message_id=222,
        otp_code="12345",
        purpose=ADMIN_LOGIN_OTP_PURPOSE,
        expires_at=datetime.now(UTC) - timedelta(seconds=1),
        attempts=0,
    )
    session = _FakeSession(challenge=challenge)
    edited_messages: list[dict[str, object]] = []

    async def fake_edit_telegram_message(**kwargs):
        edited_messages.append(kwargs)
        return True

    monkeypatch.setattr(admin_routes, "edit_telegram_message", fake_edit_telegram_message)

    with pytest.raises(HTTPException) as exc:
        await admin_routes.verify_admin_otp(
            AdminAuthVerifyOtpRequest(challenge_id=challenge.id, otp_code="12345"),
            session=session,
        )

    assert exc.value.status_code == 400
    assert edited_messages == [
        {
            "chat_id": 123456789,
            "message_id": 222,
            "text": admin_routes.ADMIN_OTP_EXPIRED_MESSAGE,
        }
    ]
