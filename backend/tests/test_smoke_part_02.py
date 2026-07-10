from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_smoke_dependencies import *
from tests.test_smoke_part_01 import USER_HEADERS, login_admin_headers

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
            }
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
