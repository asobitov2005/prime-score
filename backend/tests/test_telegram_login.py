from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID
from types import SimpleNamespace

import pytest

from app.api.routes import auth as auth_routes
from app.bot.main import _is_contact_refresh_due
from app.models.user import User
from app.services import telegram_profile_sync


def test_upsert_user_from_login_refreshes_telegram_profile_fields() -> None:
    now = datetime(2026, 5, 8, 12, 0, tzinfo=UTC)
    user = User(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        telegram_id=111111111,
        phone="+998901111111",
        first_name="Old",
        last_name="Name",
        username="old_handle",
        is_premium=False,
    )

    updated = auth_routes._upsert_user_from_login(
        user,
        telegram_id=111111111,
        phone="+998902222222",
        username="new_handle",
        first_name="New",
        last_name="Name",
        avatar_url=None,
        now=now,
    )

    assert updated.phone == "+998902222222"
    assert updated.first_name == "New"
    assert updated.last_name == "Name"
    assert updated.username == "new_handle"
    assert updated.telegram_contact_updated_at == now


def test_upsert_user_from_login_overwrites_existing_name_and_avatar_with_telegram_profile() -> None:
    now = datetime(2026, 5, 8, 12, 0, tzinfo=UTC)
    user = User(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        telegram_id=222222222,
        phone="+998903333333",
        first_name="Platform",
        last_name="Name",
        username="platform_handle",
        avatar_url="https://cdn.primescore.uz/avatar/custom.png",
        is_premium=False,
    )

    updated = auth_routes._upsert_user_from_login(
        user,
        telegram_id=222222222,
        phone="+998904444444",
        username="telegram_handle",
        first_name="Telegram",
        last_name="Profile",
        avatar_url="https://t.me/i/userpic/320/telegram.jpg",
        now=now,
    )

    assert updated.phone == "+998904444444"
    assert updated.username == "telegram_handle"
    assert updated.first_name == "Telegram"
    assert updated.last_name == "Profile"
    assert updated.avatar_url == "https://t.me/i/userpic/320/telegram.jpg"
    assert updated.telegram_contact_updated_at == now


def test_upsert_user_from_login_fills_missing_avatar_from_telegram() -> None:
    now = datetime(2026, 5, 8, 12, 0, tzinfo=UTC)
    user = User(
        id=UUID("dddddddd-dddd-dddd-dddd-dddddddddddd"),
        telegram_id=555555555,
        phone="+998908888888",
        first_name="Existing",
        last_name="User",
        username="existing_user",
        avatar_url=None,
        is_premium=False,
    )

    updated = auth_routes._upsert_user_from_login(
        user,
        telegram_id=555555555,
        phone="+998909999999",
        username="existing_user",
        first_name="Existing",
        last_name="User",
        avatar_url="https://t.me/i/userpic/320/fresh-avatar.jpg",
        now=now,
    )

    assert updated.avatar_url == "https://t.me/i/userpic/320/fresh-avatar.jpg"
    assert updated.phone == "+998909999999"
    assert updated.telegram_contact_updated_at == now


def test_upsert_user_from_login_clears_removed_telegram_username_and_avatar() -> None:
    now = datetime(2026, 5, 8, 12, 0, tzinfo=UTC)
    user = User(
        id=UUID("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
        telegram_id=666666666,
        phone="+998901010101",
        first_name="Existing",
        last_name="Profile",
        username="old_username",
        avatar_url="https://t.me/i/userpic/320/old-avatar.jpg",
        is_premium=False,
    )

    updated = auth_routes._upsert_user_from_login(
        user,
        telegram_id=666666666,
        phone="+998901010102",
        username=None,
        first_name="Existing",
        last_name="Profile",
        avatar_url=None,
        now=now,
    )

    assert updated.username is None
    assert updated.avatar_url is None
    assert updated.phone == "+998901010102"


def test_upsert_user_from_login_preserves_custom_profile_fields() -> None:
    now = datetime(2026, 5, 17, 12, 0, tzinfo=UTC)
    user = User(
        id=UUID("abababab-abab-abab-abab-abababababab"),
        telegram_id=777111222,
        phone="+998901010103",
        first_name="Local",
        last_name="Override",
        username="local_handle",
        avatar_url="https://cdn.primescore.uz/avatar/local.png",
        name_is_custom=True,
        username_is_custom=True,
        avatar_is_custom=True,
        is_premium=False,
    )

    updated = auth_routes._upsert_user_from_login(
        user,
        telegram_id=777111222,
        phone="+998901010104",
        username="telegram_handle",
        first_name="Telegram",
        last_name="Profile",
        avatar_url="https://t.me/i/userpic/320/fresh.jpg",
        now=now,
    )

    assert updated.phone == "+998901010104"
    assert updated.first_name == "Local"
    assert updated.last_name == "Override"
    assert updated.username == "local_handle"
    assert updated.avatar_url == "https://cdn.primescore.uz/avatar/local.png"
    assert updated.telegram_contact_updated_at == now


def test_upsert_user_from_login_grants_welcome_premium_bonus() -> None:
    now = datetime(2026, 5, 8, 12, 0, tzinfo=UTC)

    created = auth_routes._upsert_user_from_login(
        None,
        telegram_id=333333333,
        phone="+998905555555",
        username="new_user",
        first_name="New",
        last_name="User",
        avatar_url=None,
        now=now,
    )

    assert created.is_premium is True
    assert created.premium_until == now + timedelta(days=1)
    assert created.telegram_contact_updated_at == now


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


@pytest.mark.asyncio
async def test_fetch_telegram_avatar_url_uses_telegram_profile_photo(monkeypatch) -> None:
    monkeypatch.setattr(auth_routes, "get_settings", lambda: SimpleNamespace(telegram_bot_token="token"))
    monkeypatch.setattr(auth_routes, "Bot", _FakeTelegramBot)
    monkeypatch.setattr(auth_routes, "upload_user_avatar_image", lambda **_kwargs: "/api/storage/test-assets/user-avatars/fake.jpg")

    avatar_url = await auth_routes._fetch_telegram_avatar_url(123456789)

    assert avatar_url == "/api/storage/test-assets/user-avatars/fake.jpg"


@pytest.mark.asyncio
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


@pytest.mark.asyncio
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


class _FakeTelegramProfileBot:
    def __init__(self, *args, **kwargs) -> None:
        self.session = _FakeTelegramBotSession()

    async def get_chat(self, telegram_id: int):
        assert telegram_id == 777777777
        return SimpleNamespace(
            first_name="Updated",
            last_name="Profile",
            username="updated_handle",
        )

    async def get_user_profile_photos(self, telegram_id: int, limit: int = 1):
        assert telegram_id == 777777777
        assert limit == 1
        return SimpleNamespace(photos=[[SimpleNamespace(file_id="telegram-file")]])

    async def get_file(self, file_id: str):
        assert file_id == "telegram-file"
        return SimpleNamespace(file_path="avatars/telegram-file.jpg")

    async def download_file(self, file_path: str, destination) -> None:
        assert file_path == "avatars/telegram-file.jpg"
        destination.write(b"fresh-avatar")


@pytest.mark.asyncio
async def test_sync_user_telegram_profile_refreshes_names_username_and_avatar(monkeypatch) -> None:
    now = datetime(2026, 5, 17, 10, 0, tzinfo=UTC)
    user = User(
        id=UUID("f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1"),
        telegram_id=777777777,
        phone="+998901234567",
        first_name="Old",
        last_name="User",
        username="old_handle",
        avatar_url="https://cdn.primescore.uz/avatar/old.png",
        telegram_contact_updated_at=now - timedelta(minutes=10),
        is_premium=False,
    )

    monkeypatch.setattr(telegram_profile_sync, "get_settings", lambda: SimpleNamespace(telegram_bot_token="token"))
    monkeypatch.setattr(telegram_profile_sync, "Bot", _FakeTelegramProfileBot)
    monkeypatch.setattr(
        telegram_profile_sync,
        "upload_user_avatar_image",
        lambda **_kwargs: "/api/storage/test-assets/user-avatars/fresh.jpg",
    )

    updated = await telegram_profile_sync.sync_user_telegram_profile(user, now=now)

    assert updated is True
    assert user.first_name == "Updated"
    assert user.last_name == "Profile"
    assert user.username == "updated_handle"
    assert user.avatar_url == "/api/storage/test-assets/user-avatars/fresh.jpg"
    assert user.telegram_contact_updated_at == now


@pytest.mark.asyncio
async def test_sync_user_telegram_profile_skips_fresh_profiles(monkeypatch) -> None:
    now = datetime(2026, 5, 17, 10, 0, tzinfo=UTC)
    user = User(
        id=UUID("f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2"),
        telegram_id=888888888,
        phone="+998901234568",
        first_name="Current",
        last_name="User",
        username="current_handle",
        avatar_url="https://cdn.primescore.uz/avatar/current.png",
        telegram_contact_updated_at=now - timedelta(minutes=2),
        is_premium=False,
    )

    class _UnexpectedBot:
        def __init__(self, *args, **kwargs) -> None:
            raise AssertionError("Bot should not be constructed for a fresh profile sync")

    monkeypatch.setattr(telegram_profile_sync, "Bot", _UnexpectedBot)

    updated = await telegram_profile_sync.sync_user_telegram_profile(user, now=now)

    assert updated is False
    assert user.first_name == "Current"
    assert user.username == "current_handle"


@pytest.mark.asyncio
async def test_sync_user_telegram_profile_clears_removed_username_and_avatar(monkeypatch) -> None:
    now = datetime(2026, 5, 17, 10, 0, tzinfo=UTC)
    user = User(
        id=UUID("f3f3f3f3-f3f3-f3f3-f3f3-f3f3f3f3f3f3"),
        telegram_id=999999999,
        phone="+998901234569",
        first_name="Current",
        last_name="User",
        username="old_handle",
        avatar_url="https://cdn.primescore.uz/avatar/current.png",
        telegram_contact_updated_at=now - timedelta(minutes=10),
        is_premium=False,
    )

    class _NoUsernameOrAvatarBot:
        def __init__(self, *args, **kwargs) -> None:
            self.session = _FakeTelegramBotSession()

        async def get_chat(self, telegram_id: int):
            assert telegram_id == 999999999
            return SimpleNamespace(
                first_name="Current",
                last_name="User",
                username=None,
            )

        async def get_user_profile_photos(self, telegram_id: int, limit: int = 1):
            assert telegram_id == 999999999
            assert limit == 1
            return SimpleNamespace(photos=[])

    monkeypatch.setattr(telegram_profile_sync, "get_settings", lambda: SimpleNamespace(telegram_bot_token="token"))
    monkeypatch.setattr(telegram_profile_sync, "Bot", _NoUsernameOrAvatarBot)

    updated = await telegram_profile_sync.sync_user_telegram_profile(user, now=now)

    assert updated is True
    assert user.username is None
    assert user.avatar_url is None
    assert user.telegram_contact_updated_at == now


@pytest.mark.asyncio
async def test_sync_user_telegram_profile_preserves_custom_name_username_and_avatar(monkeypatch) -> None:
    now = datetime(2026, 5, 17, 10, 0, tzinfo=UTC)
    user = User(
        id=UUID("f4f4f4f4-f4f4-f4f4-f4f4-f4f4f4f4f4f4"),
        telegram_id=777777777,
        phone="+998901234570",
        first_name="Local",
        last_name="Name",
        username="local_handle",
        avatar_url="https://cdn.primescore.uz/avatar/local.png",
        telegram_contact_updated_at=now - timedelta(minutes=10),
        name_is_custom=True,
        username_is_custom=True,
        avatar_is_custom=True,
        is_premium=False,
    )

    monkeypatch.setattr(telegram_profile_sync, "get_settings", lambda: SimpleNamespace(telegram_bot_token="token"))
    monkeypatch.setattr(telegram_profile_sync, "Bot", _FakeTelegramProfileBot)
    monkeypatch.setattr(
        telegram_profile_sync,
        "upload_user_avatar_image",
        lambda **_kwargs: "/api/storage/test-assets/user-avatars/fresh.jpg",
    )

    updated = await telegram_profile_sync.sync_user_telegram_profile(user, now=now)

    assert updated is True
    assert user.first_name == "Local"
    assert user.last_name == "Name"
    assert user.username == "local_handle"
    assert user.avatar_url == "https://cdn.primescore.uz/avatar/local.png"
    assert user.telegram_contact_updated_at == now
