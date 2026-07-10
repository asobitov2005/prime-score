from types import SimpleNamespace

import pytest

from app.services import admin_auth
from app.services.admin_auth_accounts import build_admin_principal
from app.services.admin_auth_shared import AdminOtpFailure


def test_admin_auth_facade_keeps_public_exports() -> None:
    expected_names = {
        "AdminAuthThrottle",
        "AdminOtpFailure",
        "authenticate_admin",
        "authenticate_admin_by_phone_number",
        "build_admin_principal",
        "consume_admin_login_otp",
        "consume_admin_password_reset_token",
        "create_admin_account",
        "get_admin_auth_throttle",
        "get_admin_by_id",
        "get_admin_by_login",
        "get_admin_by_phone_number",
        "get_admin_password_reset_challenge",
        "normalize_phone_number",
        "update_admin_security_settings",
    }

    assert expected_names.issubset(set(admin_auth.__all__))
    for name in expected_names:
        assert hasattr(admin_auth, name)


def test_normalize_phone_number_preserves_existing_behaviour() -> None:
    assert admin_auth.normalize_phone_number("90 123-45-67") == "+998901234567"
    assert admin_auth.normalize_phone_number("00998 90 123 45 67") == "+998901234567"
    assert admin_auth.normalize_phone_number("+998 (90) 123-45-67") == "+998901234567"


def test_consume_admin_login_otp_marks_valid_code_used() -> None:
    otp = SimpleNamespace(
        used_at=None,
        purpose=admin_auth.ADMIN_LOGIN_OTP_PURPOSE,
        expires_at=admin_auth.datetime.now(admin_auth.timezone.utc)
        + admin_auth.timedelta(seconds=30),
        attempts=0,
        otp_code="12345",
    )

    admin_auth.consume_admin_login_otp(otp, "12345")

    assert otp.used_at is not None


def test_consume_admin_login_otp_tracks_invalid_attempt() -> None:
    from datetime import datetime, timedelta, timezone

    otp = SimpleNamespace(
        used_at=None,
        purpose=admin_auth.ADMIN_LOGIN_OTP_PURPOSE,
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=30),
        attempts=0,
        otp_code="12345",
    )

    with pytest.raises(AdminOtpFailure, match="invalid"):
        admin_auth.consume_admin_login_otp(otp, "54321")

    assert otp.attempts == 1


def test_build_admin_principal_is_reexported() -> None:
    assert admin_auth.build_admin_principal is build_admin_principal
