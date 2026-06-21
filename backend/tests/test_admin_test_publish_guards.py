from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.api.routes import admin as admin_routes
from app.db.session import get_session_maker, reset_session_state
from app.models.admin import AdminLoginOtp
from app.models import test as test_models


async def login_admin_headers(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    *,
    phone_number: str = "+998900000002",
    password: str = "TestAdmin123!",
) -> dict[str, str]:
    async def _fake_send_telegram_message_with_id(**_kwargs) -> int:
        return 9001

    monkeypatch.setattr(admin_routes, "send_telegram_message_with_id", _fake_send_telegram_message_with_id)
    monkeypatch.setattr(admin_routes, "_schedule_admin_otp_expiry_notice", lambda _challenge_id: None)

    challenge_response = await client.post(
        "/api/admin/auth/login",
        json={"phone_number": phone_number, "password": password},
    )
    if challenge_response.status_code != 202:
        pytest.skip("Admin auth requires a reachable PostgreSQL instance with seeded admin accounts.")

    challenge_id = challenge_response.json()["challenge_id"]
    session_maker = get_session_maker()
    async with session_maker() as session:
        challenge = await session.get(AdminLoginOtp, challenge_id)
        assert challenge is not None
        otp_code = challenge.otp_code

    verify_response = await client.post(
        "/api/admin/auth/verify-otp",
        json={"challenge_id": challenge_id, "otp_code": otp_code},
    )
    assert verify_response.status_code == 200
    return {"Authorization": f"Bearer {verify_response.json()['access_token']}"}


def _build_draft_payload(title: str) -> dict[str, object]:
    section_id = str(uuid4())
    question_id = str(uuid4())

    return {
        "metadata": {
            "title": title,
            "type": "reading",
            "format": "full",
            "source": "custom",
            "source_detail": "Exam Practice Tests",
            "access_type": "public",
            "time_limit_label": "60 minutes",
        },
        "content": [
            {
                "id": section_id,
                "label": "Passage 1",
                "title": "Autosave Guard Passage",
                "subtitle": "Published test regression coverage",
                "content": "The correct answer to question {{1}} is alpha.",
                "paragraphs": [],
                "showLabels": False,
                "media_kind": "text",
                "audio_url": "",
                "audio_duration_seconds": None,
                "transcript": "",
                "transcript_segments": [],
                "transcript_question_locations": [],
                "marker_count": 1,
            }
        ],
        "question_groups": [
            {
                "section_id": section_id,
                "title": "Questions 1-1",
                "instructions": "Write NO MORE THAN ONE WORD.",
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
                        "id": question_id,
                        "label": "Q1",
                        "prompt": "Write the answer.",
                        "accepted_answers": ["alpha"],
                        "explanation": "The answer is alpha.",
                        "variants": [],
                    }
                ],
            }
        ],
    }


def _to_write_payload(draft: dict[str, object]) -> dict[str, object]:
    metadata = dict(draft["metadata"])
    return {
        "metadata": {
            "title": metadata["title"],
            "type": metadata["type"],
            "format": metadata["format"],
            "source": metadata["source"],
            "source_detail": metadata["source_detail"],
            "access_type": metadata["access_type"],
            "time_limit_label": metadata["time_limit_label"],
        },
        "content": draft["content"]["sections"],
        "question_groups": draft["questionGroups"],
    }


async def _load_tests_by_title(title: str) -> list[test_models.Test]:
    reset_session_state()
    session_maker = get_session_maker()
    async with session_maker() as session:
        rows = await session.scalars(
            select(test_models.Test).where(test_models.Test.title == title).order_by(test_models.Test.created_at.asc())
        )
        return list(rows.all())


@pytest.mark.asyncio
async def test_published_test_rejects_plain_draft_update(app, monkeypatch: pytest.MonkeyPatch) -> None:
    reset_session_state()
    payload = _build_draft_payload(f"Publish Flow Check {uuid4().hex[:8]}")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        admin_headers = await login_admin_headers(client, monkeypatch)

        created = await client.post("/api/admin/tests/draft", headers=admin_headers, json=payload)
        assert created.status_code == 201
        created_id = created.json()["id"]
        created_title = created.json()["title"]

        published = await client.post(f"/api/admin/tests/{created_id}/publish", headers=admin_headers)
        assert published.status_code == 200
        assert published.json()["status"] == "published"

        draft = await client.get(f"/api/admin/tests/{created_id}/draft", headers=admin_headers)
        assert draft.status_code == 200
        assert draft.json()["metadata"]["status"] == "published"

        update = await client.put(
            f"/api/admin/tests/{created_id}/draft",
            headers=admin_headers,
            json=_to_write_payload(draft.json()),
        )
        assert update.status_code == 409
        assert update.json()["detail"] == "Published tests require Quick Fix or explicit New Version."

        title_rows = await _load_tests_by_title(created_title)
        assert len(title_rows) == 1
        assert {row.status.value for row in title_rows} == {"published"}


@pytest.mark.asyncio
async def test_published_test_creates_new_version_only_when_explicitly_requested(app, monkeypatch: pytest.MonkeyPatch) -> None:
    reset_session_state()
    payload = _build_draft_payload(f"New Version Flow Check {uuid4().hex[:8]}")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        admin_headers = await login_admin_headers(client, monkeypatch)

        created = await client.post("/api/admin/tests/draft", headers=admin_headers, json=payload)
        assert created.status_code == 201
        created_id = created.json()["id"]
        created_title = created.json()["title"]

        published = await client.post(f"/api/admin/tests/{created_id}/publish", headers=admin_headers)
        assert published.status_code == 200
        assert published.json()["status"] == "published"

        draft = await client.get(f"/api/admin/tests/{created_id}/draft", headers=admin_headers)
        assert draft.status_code == 200

        update = await client.put(
            f"/api/admin/tests/{created_id}/draft?allow_new_version=true",
            headers=admin_headers,
            json=_to_write_payload(draft.json()),
        )
        assert update.status_code == 200
        assert update.json()["id"] != created_id
        assert update.json()["status"] == "draft"

        title_rows = await _load_tests_by_title(created_title)
        assert len(title_rows) == 2
        assert [row.status.value for row in title_rows] == ["published", "draft"]


@pytest.mark.asyncio
async def test_admin_builder_rejects_guard_titles(app, monkeypatch: pytest.MonkeyPatch) -> None:
    reset_session_state()
    payload = _build_draft_payload(f"New Version Guard {uuid4().hex[:8]}")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        admin_headers = await login_admin_headers(client, monkeypatch)

        created = await client.post("/api/admin/tests/draft", headers=admin_headers, json=payload)

        assert created.status_code == 400
        assert created.json()["detail"] == "Guard/test regression titles are not allowed in the test catalog."


@pytest.mark.asyncio
async def test_published_test_quick_fix_allows_group_instruction_edits_on_full_format(
    app, monkeypatch: pytest.MonkeyPatch
) -> None:
    reset_session_state()
    payload = _build_draft_payload(f"Quick Fix Full Format {uuid4().hex[:8]}")
    payload["question_groups"][0]["questions"][0]["label"] = "Q1"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        admin_headers = await login_admin_headers(client, monkeypatch)

        created = await client.post("/api/admin/tests/draft", headers=admin_headers, json=payload)
        assert created.status_code == 201
        created_id = created.json()["id"]

        published = await client.post(f"/api/admin/tests/{created_id}/publish", headers=admin_headers)
        assert published.status_code == 200

        draft = await client.get(f"/api/admin/tests/{created_id}/draft", headers=admin_headers)
        write_payload = _to_write_payload(draft.json())
        write_payload["question_groups"][0]["instructions"] = "Updated instructions."
        write_payload["question_groups"][0]["questions"][0]["label"] = "1"

        quick_fix = await client.put(
            f"/api/admin/tests/{created_id}/quick-fix",
            headers=admin_headers,
            json=write_payload,
        )
        assert quick_fix.status_code == 200, quick_fix.text


@pytest.mark.asyncio
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


@pytest.mark.asyncio
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


@pytest.mark.asyncio
async def test_admin_builder_rejects_regression_titles(app, monkeypatch: pytest.MonkeyPatch) -> None:
    reset_session_state()
    payload = _build_draft_payload(f"Publish Regression {uuid4().hex[:8]}")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        admin_headers = await login_admin_headers(client, monkeypatch)

        created = await client.post("/api/admin/tests/draft", headers=admin_headers, json=payload)

        assert created.status_code == 400
        assert created.json()["detail"] == "Guard/test regression titles are not allowed in the test catalog."
