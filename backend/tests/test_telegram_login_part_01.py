from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_telegram_login_dependencies import *

def test_validate_telegram_webapp_init_data_accepts_signed_payload() -> None:
    token = "123456:test-token"
    auth_date = datetime(2026, 5, 25, 8, 0, tzinfo=UTC)
    init_data = build_signed_telegram_webapp_init_data(
        bot_token=token,
        auth_date=auth_date,
        user={
            "id": 972538005,
            "first_name": "Azizbek",
            "last_name": "Sobitov",
            "username": "TheBugCreator",
            "language_code": "uz",
            "photo_url": "https://t.me/i/userpic/320/avatar.jpg",
        },
    )

    user = validate_telegram_webapp_init_data(
        init_data,
        bot_token=token,
        now_timestamp=int(auth_date.timestamp()) + 30,
    )

    assert user.telegram_id == 972538005
    assert user.first_name == "Azizbek"
    assert user.last_name == "Sobitov"
    assert user.username == "TheBugCreator"
    assert user.language_code == "uz"
    assert user.photo_url == "https://t.me/i/userpic/320/avatar.jpg"

def test_validate_telegram_webapp_init_data_rejects_forged_hash() -> None:
    token = "123456:test-token"
    auth_date = datetime(2026, 5, 25, 8, 0, tzinfo=UTC)
    init_data = build_signed_telegram_webapp_init_data(
        bot_token=token,
        auth_date=auth_date,
        user={"id": 972538005, "first_name": "Azizbek"},
    ).replace("Azizbek", "Attacker")

    with pytest.raises(TelegramWebAppValidationError, match="signature"):
        validate_telegram_webapp_init_data(
            init_data,
            bot_token=token,
            now_timestamp=int(auth_date.timestamp()) + 30,
        )

def test_validate_telegram_webapp_init_data_rejects_expired_payload() -> None:
    token = "123456:test-token"
    auth_date = datetime(2026, 5, 25, 8, 0, tzinfo=UTC)
    init_data = build_signed_telegram_webapp_init_data(
        bot_token=token,
        auth_date=auth_date,
        user={"id": 972538005, "first_name": "Azizbek"},
    )

    with pytest.raises(TelegramWebAppValidationError, match="expired"):
        validate_telegram_webapp_init_data(
            init_data,
            bot_token=token,
            max_age_seconds=60,
            now_timestamp=int(auth_date.timestamp()) + 61,
        )

def test_build_telegram_webapp_fallback_phone_is_stable() -> None:
    assert build_telegram_webapp_fallback_phone(972538005) == "tg:972538005"

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
    assert created.first_login_at == now
