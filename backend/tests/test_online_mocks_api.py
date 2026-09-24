from datetime import UTC, datetime
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import pytest
from sqlalchemy.dialects import postgresql

from app.models.mock import OnlineFullMock
from app.models.ops import AuditLog
from app.models.test import Test as ExamTest
from app.models.writing import WritingTask
from app.schemas.online_mocks import OnlineMockPatch
from app.services.online_mocks import bundle_detail, public_bundle_query
from test_mock_scheduling_api import _FakeSession, _request


class _Result:
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return self.rows

    def first(self):
        return self.rows[0] if self.rows else None


class _Session(_FakeSession):
    async def execute(self, statement):
        return _Result(self.execute_rows)


def _resources():
    return [
        ExamTest(id=uuid4(), title="Listening", type="listening", format="full", status="published", exam_time_limit_seconds=1800),
        ExamTest(id=uuid4(), title="Reading", type="reading", format="full", status="published", exam_time_limit_seconds=3600),
        WritingTask(id=uuid4(), title="Task 1", task_type="task_1", status="published", time_limit_seconds=1200),
        WritingTask(id=uuid4(), title="Task 2", task_type="task_2", status="published", time_limit_seconds=2400),
    ]


def _payload(resources):
    return {
        "title": "Academic Full Mock", "description": None,
        "listening_test_id": str(resources[0].id), "reading_test_id": str(resources[1].id),
        "writing_task_1_id": str(resources[2].id), "writing_task_2_id": str(resources[3].id),
        "is_published": True, "academic_confirmed": True,
    }


def _bundle(resources):
    return OnlineFullMock(
        **_payload(resources), id=uuid4(), module="academic", created_at=datetime.now(UTC),
    )


def test_launch_links_start_full_exam_and_writing_uses_each_real_task():
    resources = _resources()
    detail = bundle_detail((_bundle(resources), *resources, 1680)).model_dump(mode="json")
    assert [stage["key"] for stage in detail["stages"]] == [
        "listening", "reading", "writing_task_1", "writing_task_2",
    ]
    assert detail["total_seconds"] == 9000
    assert detail["duration_minutes"] == 150
    assert detail["skills"] == ["listening", "reading", "writing"]
    assert not {"overall_band", "progress", "completed"} & detail.keys()
    for index, stage in enumerate(detail["stages"]):
        url = urlparse(stage["launch_url"])
        query = parse_qs(url.query)
        if index < 2:
            assert url.path == f"/exam-preview/{stage['key']}"
            assert query == {"testId": [str(resources[index].id)], "start": ["1"], "scope": ["full"], "mode": ["exam"]}
        else:
            assert url.path == "/exam-preview/writing"
            assert query == {"taskId": [str(resources[index].id)], "mode": ["exam"]}


def test_missing_test_metadata_uses_actual_runtime_timing():
    resources = _resources()
    resources[0].exam_time_limit_seconds = None
    resources[1].exam_time_limit_seconds = None
    detail = bundle_detail((_bundle(resources), *resources, 600))
    assert detail.total_seconds == 7920
    assert detail.duration_minutes == 132
    assert detail.stages[0].time_limit_seconds == 720
    assert detail.stages[1].time_limit_seconds == 3600


def test_public_query_accepts_legacy_enum_casing_and_rechecks_components():
    sql = str(public_bundle_query().compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))
    for lower, upper in [("reading", "READING"), ("listening", "LISTENING"), ("full", "FULL"), ("published", "PUBLISHED"), ("task_1", "TASK_1"), ("task_2", "TASK_2")]:
        assert f"'{lower}', '{upper}'" in sql
    assert "archived_at IS NULL" in sql
    assert "academic_confirmed IS true" in sql


def test_public_query_loads_only_component_metadata():
    sql = str(public_bundle_query().compile(dialect=postgresql.dialect()))
    for column in ("prompt_html", "sample_answer", "image_summary", "image_storage_path", "source_detail"):
        assert column not in sql
    for alias in ("writing_tasks_1", "writing_tasks_2"):
        for column in ("id", "title", "time_limit_seconds"):
            assert f"{alias}.{column}" in sql
    for alias in ("tests_1", "tests_2"):
        for column in ("id", "title", "exam_time_limit_seconds"):
            assert f"{alias}.{column}" in sql


@pytest.mark.parametrize("field", ["title", "listening_test_id", "reading_test_id", "writing_task_1_id", "writing_task_2_id", "is_published", "academic_confirmed"])
def test_partial_update_rejects_explicit_null(field):
    with pytest.raises(ValueError):
        OnlineMockPatch.model_validate({field: None})
    assert OnlineMockPatch().model_dump(exclude_unset=True) == {}


@pytest.mark.parametrize("path", ["/api/mock/online-mocks", "/api/admin/mock/online-mocks"])
async def test_catalogue_pagination_bounds(app, path):
    response = await _request(app, "GET", path + "?page=0", session=_Session(), admin=True)
    assert response.status_code == 422


async def test_public_catalogue_paginates_real_bundles(app):
    resources = _resources()
    bundle = _bundle(resources)
    response = await _request(app, "GET", "/api/mock/online-mocks?page=2&page_size=1", session=_Session(2, execute_rows=[(bundle, *resources, 1680)]))
    assert response.status_code == 200
    body = response.json()
    assert (body["total"], body["page"], body["page_size"]) == (2, 2, 1)
    assert body["items"][0]["id"] == str(bundle.id)
    assert body["items"][0]["duration_minutes"] == 150


async def test_detail_requires_auth_but_not_new_premium_gate(app):
    resources = _resources()
    bundle = _bundle(resources)
    path = f"/api/mock/online-mocks/{bundle.id}"
    assert (await _request(app, "GET", path, session=_Session())).status_code == 401
    response = await _request(app, "GET", path, session=_Session(execute_rows=[(bundle, *resources, 1680)]), user=True)
    assert response.status_code == 200
    assert len(response.json()["stages"]) == 4
    assert response.json()["requires_premium"] is True


async def test_missing_or_unavailable_detail_not_exposed(app):
    response = await _request(app, "GET", f"/api/mock/online-mocks/{uuid4()}", session=_Session(), user=True)
    assert response.status_code == 404


@pytest.mark.parametrize("method,suffix", [("GET", ""), ("POST", ""), ("GET", "/id"), ("PATCH", "/id"), ("DELETE", "/id")])
async def test_admin_operations_require_admin(app, method, suffix):
    path = "/api/admin/mock/online-mocks" + suffix.replace("id", str(uuid4()))
    response = await _request(app, method, path, session=_Session(), user=True)
    assert response.status_code == 401


async def test_admin_create_audits_and_uses_real_components(app):
    resources = _resources()
    session = _Session(*resources)
    response = await _request(app, "POST", "/api/admin/mock/online-mocks", session=session, admin=True, payload=_payload(resources))
    assert response.status_code == 201
    assert response.json()["academic_confirmed"] is True
    assert any(isinstance(item, AuditLog) for item in session.added)


@pytest.mark.parametrize("invalid", ["missing", "part", "wrong_test_type", "wrong_task_type", "unpublished", "unconfirmed"])
async def test_admin_rejects_invalid_published_bundle(app, invalid):
    resources = _resources()
    payload = _payload(resources)
    if invalid == "missing":
        resources[0] = None
    elif invalid == "part":
        resources[0].format = "part_1"
    elif invalid == "wrong_test_type":
        resources[0].type = "reading"
    elif invalid == "wrong_task_type":
        resources[2].task_type = "task_2"
    elif invalid == "unpublished":
        resources[3].status = "draft"
    else:
        payload["academic_confirmed"] = False
    session = _Session(*resources)
    response = await _request(app, "POST", "/api/admin/mock/online-mocks", session=session, admin=True, payload=payload)
    assert response.status_code == 422
    assert not session.added


async def test_draft_can_reference_unpublished_structurally_valid_resources(app):
    resources = _resources()
    resources[0].status = "draft"
    payload = {**_payload(resources), "is_published": False, "academic_confirmed": False}
    response = await _request(app, "POST", "/api/admin/mock/online-mocks", session=_Session(*resources), admin=True, payload=payload)
    assert response.status_code == 201


async def test_partial_update_preserves_components_and_clears_description(app):
    resources = _resources()
    bundle = _bundle(resources)
    bundle.description = "Previous description"
    response = await _request(app, "PATCH", f"/api/admin/mock/online-mocks/{bundle.id}", session=_Session(bundle, *resources), admin=True, payload={"description": None})
    assert response.status_code == 200
    assert response.json()["description"] is None
    assert response.json()["reading_test_id"] == str(resources[1].id)


async def test_changed_components_require_renewed_academic_confirmation(app):
    resources = _resources()
    bundle = _bundle(resources)
    response = await _request(app, "PATCH", f"/api/admin/mock/online-mocks/{bundle.id}", session=_Session(bundle), admin=True, payload={"reading_test_id": str(uuid4())})
    assert response.status_code == 422


async def test_archive_changes_bundle_only_and_audits(app):
    resources = _resources()
    bundle = _bundle(resources)
    session = _Session(bundle)
    response = await _request(app, "DELETE", f"/api/admin/mock/online-mocks/{bundle.id}", session=session, admin=True)
    assert response.status_code == 204
    assert bundle.archived_at is not None
    assert bundle.is_published is False
    assert all(item.status == "published" for item in resources)
    assert any(isinstance(item, AuditLog) for item in session.added)
