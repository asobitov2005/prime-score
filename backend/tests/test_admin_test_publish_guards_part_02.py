from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_admin_test_publish_guards_dependencies import *
from tests.test_admin_test_publish_guards_part_01 import _build_draft_payload, _to_write_payload, login_admin_headers

async def test_published_test_quick_fix_allows_group_instruction_edits_on_multi_section_full_reading(
    app, monkeypatch: pytest.MonkeyPatch
) -> None:
    reset_session_state()
    section_one_id = str(uuid4())
    section_two_id = str(uuid4())
    question_one_id = str(uuid4())
    question_two_id = str(uuid4())
    payload = {
        "metadata": {
            "title": f"Quick Fix Multi Section {uuid4().hex[:8]}",
            "type": "reading",
            "format": "full",
            "source": "custom",
            "source_detail": "Exam Practice Tests",
            "access_type": "public",
            "time_limit_label": "60 minutes",
        },
        "content": [
            {
                "id": section_one_id,
                "label": "Passage 1",
                "title": "Passage One",
                "subtitle": "Questions 1-13",
                "content": "Passage one body",
                "paragraphs": [],
                "showLabels": False,
                "media_kind": "text",
                "audio_url": "",
                "audio_duration_seconds": None,
                "transcript": "",
                "transcript_segments": [],
                "transcript_question_locations": [],
                "marker_count": 1,
            },
            {
                "id": section_two_id,
                "label": "Passage 2",
                "title": "Passage Two",
                "subtitle": "Questions 14-26",
                "content": "Passage two body",
                "paragraphs": [],
                "showLabels": False,
                "media_kind": "text",
                "audio_url": "",
                "audio_duration_seconds": None,
                "transcript": "",
                "transcript_segments": [],
                "transcript_question_locations": [],
                "marker_count": 1,
            },
        ],
        "question_groups": [
            {
                "section_id": section_one_id,
                "title": "Questions 1-1",
                "instructions": "Answer the question.",
                "type_id": "reading_short_answer",
                "question_start": 1,
                "question_end": 1,
                "shared_options": [],
                "question_block": "",
                "answer_block": "",
                "secondary_block": "",
                "diagram_title": "",
                "diagram_image_url": "",
                "questions": [
                    {
                        "id": question_one_id,
                        "label": "Q1",
                        "prompt": "Question one",
                        "accepted_answers": ["alpha"],
                        "explanation": "",
                        "variants": [],
                    }
                ],
            },
            {
                "section_id": section_two_id,
                "title": "Questions 14-14",
                "instructions": "Answer the question.",
                "type_id": "reading_short_answer",
                "question_start": 14,
                "question_end": 14,
                "shared_options": [],
                "question_block": "",
                "answer_block": "",
                "secondary_block": "",
                "diagram_title": "",
                "diagram_image_url": "",
                "questions": [
                    {
                        "id": question_two_id,
                        "label": "Q14",
                        "prompt": "Question fourteen",
                        "accepted_answers": ["beta"],
                        "explanation": "",
                        "variants": [],
                    }
                ],
            },
        ],
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        admin_headers = await login_admin_headers(client, monkeypatch)

        created = await client.post("/api/admin/tests/draft", headers=admin_headers, json=payload)
        assert created.status_code == 201
        created_id = created.json()["id"]

        published = await client.post(f"/api/admin/tests/{created_id}/publish", headers=admin_headers)
        assert published.status_code == 200

        draft = await client.get(f"/api/admin/tests/{created_id}/draft", headers=admin_headers)
        write_payload = _to_write_payload(draft.json())
        write_payload["question_groups"][1]["instructions"] = "Updated passage two instructions."
        write_payload["question_groups"][1]["questions"][0]["label"] = "2"

        quick_fix = await client.put(
            f"/api/admin/tests/{created_id}/quick-fix",
            headers=admin_headers,
            json=write_payload,
        )
        assert quick_fix.status_code == 200, quick_fix.text
        assert quick_fix.json()["status"] == "published"

async def test_published_test_quick_fix_allows_group_instruction_edits(app, monkeypatch: pytest.MonkeyPatch) -> None:
    reset_session_state()
    payload = _build_draft_payload(f"Quick Fix Instructions {uuid4().hex[:8]}")
    payload["metadata"]["format"] = "passage_2"
    payload["content"][0]["label"] = "Passage 2"
    payload["question_groups"][0]["question_start"] = 14
    payload["question_groups"][0]["question_end"] = 14
    payload["question_groups"][0]["questions"][0]["label"] = "Q14"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        admin_headers = await login_admin_headers(client, monkeypatch)

        created = await client.post("/api/admin/tests/draft", headers=admin_headers, json=payload)
        assert created.status_code == 201
        created_id = created.json()["id"]

        published = await client.post(f"/api/admin/tests/{created_id}/publish", headers=admin_headers)
        assert published.status_code == 200

        draft = await client.get(f"/api/admin/tests/{created_id}/draft", headers=admin_headers)
        assert draft.status_code == 200

        write_payload = _to_write_payload(draft.json())
        write_payload["question_groups"][0]["instructions"] = "Updated group instructions for quick fix."
        write_payload["question_groups"][0]["questions"][0]["label"] = "14"

        quick_fix = await client.put(
            f"/api/admin/tests/{created_id}/quick-fix",
            headers=admin_headers,
            json=write_payload,
        )
        assert quick_fix.status_code == 200, quick_fix.text
        assert quick_fix.json()["status"] == "published"

        refreshed = await client.get(f"/api/admin/tests/{created_id}/draft", headers=admin_headers)
        assert refreshed.status_code == 200
        assert refreshed.json()["questionGroups"][0]["instructions"] == "Updated group instructions for quick fix."

async def test_admin_builder_rejects_regression_titles(app, monkeypatch: pytest.MonkeyPatch) -> None:
    reset_session_state()
    payload = _build_draft_payload(f"Publish Regression {uuid4().hex[:8]}")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        admin_headers = await login_admin_headers(client, monkeypatch)

        created = await client.post("/api/admin/tests/draft", headers=admin_headers, json=payload)

        assert created.status_code == 400
        assert created.json()["detail"] == "Guard/test regression titles are not allowed in the test catalog."
