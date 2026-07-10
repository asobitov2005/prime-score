from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_telegram_login_dependencies import *

def test_upsert_user_from_login_marks_existing_bot_contact_as_new_login() -> None:
    now = datetime(2026, 5, 22, 12, 0, tzinfo=UTC)
    user = User(
        id=UUID("12121212-1212-1212-1212-121212121212"),
        telegram_id=121212121,
        phone="+998901212121",
        first_name="Bot",
        last_name="Contact",
        username="bot_contact",
        bot_contact_at=now - timedelta(minutes=5),
        first_login_at=None,
        is_premium=False,
    )

    updated = auth_routes._upsert_user_from_login(
        user,
        telegram_id=121212121,
        phone="+998901212121",
        username="bot_contact",
        first_name="Bot",
        last_name="Contact",
        avatar_url=None,
        now=now,
    )

    assert updated.bot_contact_at == now - timedelta(minutes=5)
    assert updated.first_login_at == now

def test_apply_bot_contact_to_user_creates_free_user_without_first_login() -> None:
    now = datetime(2026, 5, 22, 12, 0, tzinfo=UTC)

    user = _apply_bot_contact_to_user(
        None,
        telegram_id=232323232,
        phone="901234567",
        username="bot_user",
        first_name="Bot",
        last_name="User",
        avatar_url=None,
        now=now,
    )

    assert user.telegram_id == 232323232
    assert user.phone == "+998901234567"
    assert user.first_name == "Bot"
    assert user.last_name == "User"
    assert user.username == "bot_user"
    assert user.is_premium is False
    assert user.bot_contact_at == now
    assert user.first_login_at is None

def test_upsert_user_from_login_does_not_restore_deleted_user_directly() -> None:
    now = datetime(2026, 5, 13, 12, 0, tzinfo=UTC)
    deleted_at = now - timedelta(days=2)
    user = User(
        id=UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
        telegram_id=444444444,
        phone="+998906666666",
        first_name="Deleted",
        last_name="User",
        username="deleted_user",
        is_premium=False,
        show_on_leaderboard=False,
        deleted_at=deleted_at,
    )

    restored = auth_routes._upsert_user_from_login(
        user,
        telegram_id=444444444,
        phone="+998907777777",
        username="restored_user",
        first_name="Restored",
        last_name="User",
        avatar_url=None,
        now=now,
    )

    assert restored.deleted_at == deleted_at
    assert restored.show_on_leaderboard is False
    assert restored.last_active_at is None
    assert restored.phone == "+998907777777"
    assert restored.username == "restored_user"
    assert restored.telegram_contact_updated_at == now

def test_apply_start_event_tracks_plain_start_without_contact() -> None:
    now = datetime(2026, 5, 22, 13, 0, tzinfo=UTC)
    record = TelegramUser(
        telegram_id=987654321,
        first_name="Initial",
        last_name=None,
        start_count=0,
    )

    updated = telegram_user_service._apply_start_event(
        record,
        first_name="Azizbek",
        last_name=None,
        username="azizbekdev",
        language_code="uz",
        is_bot=False,
        now=now,
    )

    assert updated.first_name == "Azizbek"
    assert updated.username == "azizbekdev"
    assert updated.language_code == "uz"
    assert updated.start_count == 1
    assert updated.first_started_at == now
    assert updated.last_started_at == now
    assert updated.bot_contact_at is None
    assert updated.first_login_at is None

def test_apply_login_event_links_started_user_to_real_account() -> None:
    now = datetime(2026, 5, 22, 14, 0, tzinfo=UTC)
    record = TelegramUser(
        telegram_id=123123123,
        first_name="Started",
        last_name="Only",
        username="started_only",
        start_count=2,
        first_started_at=now - timedelta(minutes=20),
        last_started_at=now - timedelta(minutes=5),
    )
    user = User(
        id=UUID("34343434-3434-3434-3434-343434343434"),
        telegram_id=123123123,
        phone="+998901234567",
        first_name="Real",
        last_name="User",
        username="real_user",
        avatar_url="https://cdn.primescore.uz/avatar/real-user.jpg",
        bot_contact_at=now - timedelta(minutes=4),
        first_login_at=now,
        is_premium=True,
    )

    updated = telegram_user_service._apply_login_event(record, user=user, now=now)

    assert updated.linked_user_id == user.id
    assert updated.phone == "+998901234567"
    assert updated.first_name == "Real"
    assert updated.last_name == "User"
    assert updated.username == "real_user"
    assert updated.avatar_url == "https://cdn.primescore.uz/avatar/real-user.jpg"
    assert updated.start_count == 2
    assert updated.bot_contact_at == now - timedelta(minutes=4)
    assert updated.first_login_at == now

class _FakeTelegramBotSession:
    async def close(self) -> None:
        return None

class _FakeTelegramBot:
    def __init__(self, *args, **kwargs) -> None:
        self.session = _FakeTelegramBotSession()

    async def get_user_profile_photos(self, telegram_id: int, limit: int = 1):
        assert telegram_id == 123456789
        assert limit == 1
        return SimpleNamespace(photos=[[SimpleNamespace(file_id="file-1")]])

    async def get_file(self, file_id: str):
        assert file_id == "file-1"
        return SimpleNamespace(file_path="avatars/file-1.jpg")

    async def download_file(self, file_path: str, destination) -> None:
        assert file_path == "avatars/file-1.jpg"
        destination.write(b"avatar-bytes")

async def test_fetch_telegram_avatar_url_uses_telegram_profile_photo(monkeypatch) -> None:
    monkeypatch.setattr(auth_routes, "get_settings", lambda: SimpleNamespace(telegram_bot_token="token"))
    monkeypatch.setattr(auth_routes, "Bot", _FakeTelegramBot)
    monkeypatch.setattr(auth_routes, "upload_user_avatar_image", lambda **_kwargs: "/api/storage/test-assets/user-avatars/fake.jpg")

    avatar_url = await auth_routes._fetch_telegram_avatar_url(123456789)

    assert avatar_url == "/api/storage/test-assets/user-avatars/fake.jpg"

async def test_resolve_telegram_avatar_url_falls_back_when_fetch_fails(monkeypatch) -> None:
    class _FailingBot:
        def __init__(self, *args, **kwargs) -> None:
            self.session = _FakeTelegramBotSession()

        async def get_user_profile_photos(self, telegram_id: int, limit: int = 1):
            _ = (telegram_id, limit)
            raise RuntimeError("telegram unavailable")

    monkeypatch.setattr(auth_routes, "get_settings", lambda: SimpleNamespace(telegram_bot_token="token"))
    monkeypatch.setattr(auth_routes, "Bot", _FailingBot)

    avatar_url = await auth_routes._resolve_telegram_avatar_url(
        123456789,
        fallback="https://cdn.primescore.uz/avatar/existing.png",
    )

    assert avatar_url == "https://cdn.primescore.uz/avatar/existing.png"

async def test_resolve_telegram_avatar_url_returns_none_when_user_removed_avatar(monkeypatch) -> None:
    class _NoPhotoBot:
        def __init__(self, *args, **kwargs) -> None:
            self.session = _FakeTelegramBotSession()

        async def get_user_profile_photos(self, telegram_id: int, limit: int = 1):
            assert telegram_id == 123456789
            assert limit == 1
            return SimpleNamespace(photos=[])

    monkeypatch.setattr(auth_routes, "get_settings", lambda: SimpleNamespace(telegram_bot_token="token"))
    monkeypatch.setattr(auth_routes, "Bot", _NoPhotoBot)

    avatar_url = await auth_routes._resolve_telegram_avatar_url(
        123456789,
        fallback="https://cdn.primescore.uz/avatar/existing.png",
    )

    assert avatar_url is None

def test_contact_refresh_is_due_after_thirty_days() -> None:
    now = datetime(2026, 5, 8, 12, 0, tzinfo=UTC)
    recent_contact = now - timedelta(days=29)
    stale_contact = now - timedelta(days=31)

    assert _is_contact_refresh_due(recent_contact, now=now) is False
    assert _is_contact_refresh_due(stale_contact, now=now) is True
    assert _is_contact_refresh_due(None, now=now) is True

def test_telegram_profile_sync_due_after_five_minutes() -> None:
    now = datetime(2026, 5, 17, 10, 0, tzinfo=UTC)

    assert telegram_profile_sync.is_telegram_profile_sync_due(None, now=now) is True
    assert (
        telegram_profile_sync.is_telegram_profile_sync_due(
            now - timedelta(minutes=6),
            now=now,
        )
        is True
    )
    assert (
        telegram_profile_sync.is_telegram_profile_sync_due(
            now - timedelta(minutes=4, seconds=59),
            now=now,
        )
        is False
    )
