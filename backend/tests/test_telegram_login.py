from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID
from types import SimpleNamespace

import pytest

from app.api.routes import auth as auth_routes
from app.bot.main import _is_contact_refresh_due
from app.models.user import User


def test_upsert_user_from_login_keeps_telegram_username_and_phone() -> None:
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
    assert updated.username == "new_handle"
    assert updated.telegram_contact_updated_at == now


def test_upsert_user_from_login_keeps_existing_profile_name_and_avatar() -> None:
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
    assert updated.first_name == "Platform"
    assert updated.last_name == "Name"
    assert updated.avatar_url == "https://cdn.primescore.uz/avatar/custom.png"
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


def test_contact_refresh_is_due_after_thirty_days() -> None:
    now = datetime(2026, 5, 8, 12, 0, tzinfo=UTC)
    recent_contact = now - timedelta(days=29)
    stale_contact = now - timedelta(days=31)

    assert _is_contact_refresh_due(recent_contact, now=now) is False
    assert _is_contact_refresh_due(stale_contact, now=now) is True
    assert _is_contact_refresh_due(None, now=now) is True
