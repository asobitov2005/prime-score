from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_admin_telegram_otp_auth_dependencies import *

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
