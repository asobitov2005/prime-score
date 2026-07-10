from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_speaking_user_api_dependencies import *
from tests.test_speaking_user_api_part_01 import SESSION_ID, _DeleteSession, _HistorySession, _debug_user

async def test_user_can_list_submitted_speaking_history(app) -> None:
    async def override_db_session():
        yield _HistorySession()

    async def override_user():
        return _debug_user()

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_current_user] = override_user
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/speaking/sessions/history")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"][0]["session_id"] == str(SESSION_ID)
    assert payload["items"][0]["overall_band"] == 6.5

async def test_user_can_delete_speaking_session(app) -> None:
    fake_session = _DeleteSession()

    async def override_db_session():
        yield fake_session

    async def override_user():
        return _debug_user()

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_current_user] = override_user
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.delete(f"/api/speaking/sessions/{SESSION_ID}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert fake_session.execute_count == 6
