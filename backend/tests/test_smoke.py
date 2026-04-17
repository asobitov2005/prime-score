from __future__ import annotations

from uuid import UUID

import pytest
from httpx import ASGITransport, AsyncClient

from app.services.fixtures import LISTENING_TEST_ID, READING_TEST_ID

USER_HEADERS = {
    "X-Debug-User-Id": "33333333-3333-3333-3333-333333333333",
    "X-Debug-First-Name": "Azizbek",
    "X-Debug-Last-Name": "Prime",
    "X-Debug-Username": "azizbek",
    "X-Debug-Role": "user",
    "X-Debug-Is-Premium": "true",
    "X-Debug-Show-On-Leaderboard": "true",
}


async def login_admin_headers(
    client: AsyncClient,
    *,
    login: str = "test_admin",
    password: str = "TestAdmin123!",
) -> dict[str, str]:
    try:
        response = await client.post("/api/admin/auth/login", json={"login": login, "password": password})
    except Exception:
        pytest.skip("Admin auth requires a reachable PostgreSQL instance with valid credentials.")
    if response.status_code != 200:
        pytest.skip("Admin auth requires a reachable PostgreSQL instance with seeded admin accounts.")
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.mark.asyncio
async def test_health_and_catalog(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        health = await client.get("/api/health")
        assert health.status_code == 200
        assert health.json()["status"] == "ok"

        tests = await client.get("/api/tests")
        assert tests.status_code == 200
        assert len(tests.json()) >= 2

        detail = await client.get(f"/api/tests/{READING_TEST_ID}")
        assert detail.status_code == 200
        assert detail.json()["id"] == str(READING_TEST_ID)
        assert detail.json()["sections"][0]["question_groups"]


@pytest.mark.asyncio
async def test_me_and_admin_routes(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        me = await client.get("/api/me", headers=USER_HEADERS)
        assert me.status_code == 200
        assert me.json()["role"] == "user"

        admin_headers = await login_admin_headers(client)

        dashboard = await client.get("/api/admin/dashboard", headers=admin_headers)
        assert dashboard.status_code == 200
        assert "tests_total" in dashboard.json()

        draft = await client.get(f"/api/admin/tests/{READING_TEST_ID}/draft", headers=admin_headers)
        assert draft.status_code == 200
        assert draft.json()["metadata"]["type"] == "reading"
        assert draft.json()["decisions"]["question_bank"]["state"] == "not_supported"


@pytest.mark.asyncio
async def test_attempt_lifecycle(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        start = await client.post(
            f"/api/tests/{READING_TEST_ID}/start",
            headers=USER_HEADERS,
            json={"scope": "full", "mode": "practice"},
        )
        assert start.status_code == 200
        attempt_id = start.json()["attempt_id"]

        answer = await client.patch(
            f"/api/attempts/{attempt_id}/answer",
            headers=USER_HEADERS,
            json={"question_id": "eee10c17-4108-529c-80fe-aadbd729034c", "value": "TRUE"},
        )
        assert answer.status_code == 200
        assert answer.json()["question_number"] == 1
        assert answer.json()["score_status"] == "draft"

        submit = await client.post(f"/api/attempts/{attempt_id}/submit", headers=USER_HEADERS)
        assert submit.status_code == 200
        assert submit.json()["score_status"] == "ready"
        assert submit.json()["raw_score"] == 1

        result = await client.get(f"/api/attempts/{attempt_id}/result", headers=USER_HEADERS)
        assert result.status_code == 200
        assert result.json()["attempt_id"] == attempt_id
        assert result.json()["section_breakdown"][0]["correct"] >= 1

        review = await client.get(f"/api/attempts/{attempt_id}/review", headers=USER_HEADERS)
        assert review.status_code == 200
        assert review.json()["can_show_explanations"] is True
        assert review.json()["items"][0]["prompt"]
        assert review.json()["items"][0]["correct_answers"] == ["TRUE"]


@pytest.mark.asyncio
async def test_listening_snapshot_time_limit(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        start = await client.post(
            f"/api/tests/{LISTENING_TEST_ID}/start",
            headers=USER_HEADERS,
            json={"scope": "full", "mode": "exam"},
        )
        assert start.status_code == 200
        assert start.json()["time_limit_seconds"] == 1800


@pytest.mark.asyncio
async def test_section_attempt_has_no_band_score(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        start = await client.post(
            f"/api/tests/{READING_TEST_ID}/start",
            headers=USER_HEADERS,
            json={
                "scope": "section",
                "section_id": "11111111-1111-1111-1111-111111111112",
                "mode": "practice",
            },
        )
        assert start.status_code == 200
        assert start.json()["test_snapshot"]["total_questions"] == 13

        attempt_id = start.json()["attempt_id"]
        await client.patch(
            f"/api/attempts/{attempt_id}/answer",
            headers=USER_HEADERS,
            json={"question_id": "eee10c17-4108-529c-80fe-aadbd729034c", "value": "TRUE"},
        )
        submit = await client.post(f"/api/attempts/{attempt_id}/submit", headers=USER_HEADERS)
        assert submit.status_code == 200
        assert submit.json()["band_score"] is None


@pytest.mark.asyncio
async def test_admin_draft_write_flow_and_attempt_runtime(app):
    payload = {
        "metadata": {
            "title": "Admin Created Reading Draft",
            "type": "reading",
            "source": "custom",
            "source_detail": "Test admin draft",
            "access_type": "public",
            "time_limit_label": "60 minutes",
        },
        "content": [
            {
                "id": "11111111-1111-1111-1111-111111111121",
                "label": "Passage 1",
                "title": "Admin Passage",
                "subtitle": "Structured draft content",
                "content": "The answer for {{1}} is alpha and the answer for {{2}} is beta.",
                "media_kind": "text",
                "marker_count": 2,
            }
        ],
        "questions": [
            {
                "id": "11111111-1111-1111-1111-111111111131",
                "section_id": "11111111-1111-1111-1111-111111111121",
                "label": "Q1",
                "type_id": "reading_short_answer",
                "prompt": "Write the first answer.",
                "accepted_answers": ["alpha"],
                "explanation": "The first gap resolves to alpha.",
                "variants": [],
            },
            {
                "id": "11111111-1111-1111-1111-111111111132",
                "section_id": "11111111-1111-1111-1111-111111111121",
                "label": "Q2",
                "type_id": "reading_short_answer",
                "prompt": "Write the second answer.",
                "accepted_answers": ["beta"],
                "explanation": "The second gap resolves to beta.",
                "variants": [],
            },
        ],
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        admin_headers = await login_admin_headers(client)
        created = await client.post("/api/admin/tests/draft", headers=admin_headers, json=payload)
        assert created.status_code == 201
        created_id = created.json()["id"]

        draft = await client.get(f"/api/admin/tests/{created_id}/draft", headers=admin_headers)
        assert draft.status_code == 200
        assert draft.json()["content"]["sections"][0]["content"].startswith("The answer")
        assert draft.json()["questions"][0]["accepted_answers"] == ["alpha"]

        published = await client.post(f"/api/admin/tests/{created_id}/publish", headers=admin_headers)
        assert published.status_code == 200
        assert published.json()["status"] == "published"

        start = await client.post(
            f"/api/tests/{created_id}/start",
            headers=USER_HEADERS,
            json={"scope": "full", "mode": "practice"},
        )
        assert start.status_code == 200
        assert start.json()["test_snapshot"]["sections"][0]["content"].startswith("The answer")
        attempt_id = start.json()["attempt_id"]

        answer = await client.patch(
            f"/api/attempts/{attempt_id}/answer",
            headers=USER_HEADERS,
            json={"question_id": "11111111-1111-1111-1111-111111111131", "value": "alpha"},
        )
        assert answer.status_code == 200
        assert answer.json()["question_number"] == 1

        submit = await client.post(f"/api/attempts/{attempt_id}/submit", headers=USER_HEADERS)
        assert submit.status_code == 200
        assert submit.json()["raw_score"] == 1
        assert submit.json()["score_status"] == "ready"

        result = await client.get(f"/api/attempts/{attempt_id}/result", headers=USER_HEADERS)
        assert result.status_code == 200
        assert result.json()["section_breakdown"][0]["label"] == "Admin Passage"

        review = await client.get(f"/api/attempts/{attempt_id}/review", headers=USER_HEADERS)
        assert review.status_code == 200
        assert review.json()["items"][0]["correct_answers"] == ["alpha"]
        assert review.json()["items"][0]["explanation"] == "The first gap resolves to alpha."
