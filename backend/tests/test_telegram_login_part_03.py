from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_telegram_login_dependencies import *
from tests.test_telegram_login_part_02 import _FakeTelegramBotSession

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
