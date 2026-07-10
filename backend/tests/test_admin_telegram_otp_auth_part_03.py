from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_admin_telegram_otp_auth_dependencies import *
from tests.test_admin_telegram_otp_auth_part_01 import _FakeThrottle
from tests.test_admin_telegram_otp_auth_part_02 import _FakeSession

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
