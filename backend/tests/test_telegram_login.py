from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.api.routes.auth import _upsert_user_from_login
from app.models.user import User
from app.bot.main import _is_contact_refresh_due


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

    updated = _upsert_user_from_login(
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

    updated = _upsert_user_from_login(
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


def test_contact_refresh_is_due_after_thirty_days() -> None:
    now = datetime(2026, 5, 8, 12, 0, tzinfo=UTC)
    recent_contact = now - timedelta(days=29)
    stale_contact = now - timedelta(days=31)

    assert _is_contact_refresh_due(recent_contact, now=now) is False
    assert _is_contact_refresh_due(stale_contact, now=now) is True
    assert _is_contact_refresh_due(None, now=now) is True
