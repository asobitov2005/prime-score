from app.api.routes import auth


def test_auth_router_keeps_existing_paths() -> None:
    route_paths = [getattr(route, "path", None) for route in auth.router.routes]

    expected_paths = {
        "/request-code",
        "/verify-code",
        "/telegram-webapp",
        "/refresh",
        "/logout",
        "/sessions",
        "/sessions/{session_id}/status",
        "/sessions/{session_id}",
    }

    assert expected_paths.issubset(set(route_paths))
    assert len(route_paths) == len(set(route_paths))


def test_auth_facade_keeps_legacy_helpers() -> None:
    assert auth._upsert_user_from_login is auth.upsert_user_from_login
    assert auth._fetch_telegram_avatar_url is auth.fetch_telegram_avatar_url
    assert auth._resolve_telegram_avatar_url is auth.resolve_telegram_avatar_url
    assert auth._enforce_active_session_limit is auth.enforce_active_session_limit
    assert auth._detect_device_info is auth.detect_device_info
    assert auth._create_login_session_response is auth.create_login_session_response


def test_device_detection_behaviour_is_preserved() -> None:
    assert auth.detect_device_info("Mozilla Chrome/126 Windows") == {
        "type": "Desktop",
        "browser": "Chrome",
        "os": "Windows",
        "user_agent": "Mozilla Chrome/126 Windows",
    }
    assert auth.detect_device_info("Telegram Android Mobile") == {
        "type": "Mobile",
        "browser": "Telegram",
        "os": "Android",
        "user_agent": "Telegram Android Mobile",
    }
