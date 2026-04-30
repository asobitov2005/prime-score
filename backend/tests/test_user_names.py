from app.services.user_names import normalize_user_name_parts, resolve_login_name_parts, split_full_name


def test_normalize_user_name_parts_strips_duplicate_last_name_suffix() -> None:
    assert normalize_user_name_parts("Khurshid Uktamaliyev", "Uktamaliyev") == (
        "Khurshid",
        "Uktamaliyev",
    )


def test_split_full_name_returns_first_and_rest() -> None:
    assert split_full_name("Khurshid Uktamaliyev") == ("Khurshid", "Uktamaliyev")


def test_resolve_login_name_parts_supports_legacy_name_payload() -> None:
    assert resolve_login_name_parts({"name": "Khurshid Uktamaliyev"}) == (
        "Khurshid",
        "Uktamaliyev",
    )


def test_resolve_login_name_parts_prefers_explicit_fields() -> None:
    assert resolve_login_name_parts(
        {
            "first_name": "Khurshid Uktamaliyev",
            "last_name": "Uktamaliyev",
        }
    ) == ("Khurshid", "Uktamaliyev")
