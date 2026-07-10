from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_xp_system_dependencies import *
from tests.test_xp_system_part_01 import OTHER_USER_ID, USER_ID, _debug_user

async def test_leaderboard_route_returns_xp_rankings(app, monkeypatch) -> None:
    async def override_user():
        return _debug_user()

    async def override_db_session():
        yield SimpleNamespace(get=lambda *args, **kwargs: None)

    async def fake_rows(*args, **kwargs):
        return [
            (
                SimpleNamespace(
                    xp_total=980,
                    average_score=7.8,
                    full_mock_completions=4,
                    achieved_at=datetime(2026, 5, 15, tzinfo=UTC),
                ),
                SimpleNamespace(
                    id=OTHER_USER_ID,
                    first_name="Maria",
                    last_name="Stone",
                    username=None,
                    avatar_url=None,
                    current_level=5,
                    current_streak=9,
                    show_on_leaderboard=True,
                    deleted_at=None,
                ),
            ),
            (
                SimpleNamespace(
                    xp_total=760,
                    average_score=7.0,
                    full_mock_completions=2,
                    achieved_at=datetime(2026, 5, 16, tzinfo=UTC),
                ),
                SimpleNamespace(
                    id=USER_ID,
                    first_name="Prime",
                    last_name="User",
                    username="prime_user",
                    avatar_url=None,
                    current_level=4,
                    current_streak=5,
                    show_on_leaderboard=True,
                    deleted_at=None,
                ),
            ),
        ]

    monkeypatch.setattr(leaderboard_route, "leaderboard_rows", fake_rows)
    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db_session] = override_db_session
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/leaderboard?period=week")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["period"] == "week"
    assert payload["items"][0]["xp"] == 980
    assert payload["current_user"]["xp"] == 760
    assert payload["current_user"]["level"] == 4
