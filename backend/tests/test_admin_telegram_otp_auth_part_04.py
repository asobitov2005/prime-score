from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_admin_telegram_otp_auth_dependencies import *
from tests.test_admin_telegram_otp_auth_part_01 import _FakeThrottle
from tests.test_admin_telegram_otp_auth_part_02 import _FakeSession

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
