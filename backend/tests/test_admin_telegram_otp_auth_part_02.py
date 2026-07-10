from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_admin_telegram_otp_auth_dependencies import *
from tests.test_admin_telegram_otp_auth_part_01 import _FakeRedis, _FakeRequest, _FakeThrottle

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
