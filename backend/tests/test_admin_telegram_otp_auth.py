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
from app.schemas.auth import AdminAuthLoginRequest, AdminAuthVerifyOtpRequest
from app.services.admin_auth import (
    ADMIN_LOGIN_OTP_MAX_ATTEMPTS,
    ADMIN_LOGIN_OTP_PURPOSE,
    ADMIN_LOGIN_OTP_TTL_SECONDS,
    AdminOtpFailure,
    build_admin_otp_message,
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
    def __init__(self, *, credentials_limited: bool = False) -> None:
        self.credentials_limited = credentials_limited
        self.failed_credentials_recorded: list[str] = []
        self.cleared_credentials: list[str] = []
        self.otp_issue_identifiers: list[str] = []

    async def is_credentials_limited(self, identifier: str) -> bool:
        return self.credentials_limited

    async def record_failed_credentials(self, identifier: str) -> int:
        self.failed_credentials_recorded.append(identifier)
        return len(self.failed_credentials_recorded)

    async def clear_failed_credentials(self, identifier: str) -> None:
        self.cleared_credentials.append(identifier)

    async def enforce_otp_issue_limit(self, identifier: str) -> None:
        self.otp_issue_identifiers.append(identifier)


class _FakeSession:
    def __init__(
        self,
        challenge: AdminLoginOtp | None = None,
        execute_rows: list[tuple[int, int | None]] | None = None,
    ) -> None:
        self.added: list[object] = []
        self.challenge = challenge
        self.execute_rows = execute_rows or []
        self.commits = 0
        self.rollbacks = 0

    async def execute(self, _statement):
        return _FakeExecuteResult(self.execute_rows)

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
        if getattr(item, "id", None) is None:
            item.id = uuid4()

    async def get(self, model, item_id: UUID):
        if model is AdminLoginOtp and self.challenge and self.challenge.id == item_id:
            return self.challenge
        return None


class _FakeExecuteResult:
    def __init__(self, rows: list[tuple[int, int | None]]) -> None:
        self._rows = rows

    def all(self) -> list[tuple[int, int | None]]:
        return self._rows


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
