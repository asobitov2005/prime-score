from datetime import UTC, datetime
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.exc import IntegrityError

from app.api.routes import admin_writing, admin_writing_part_01, admin_writing_part_02, admin_writing_part_03
from app.core.deps import get_current_admin
from app.models.enums import WritingDifficulty, WritingQuestionSubtype, WritingTaskStatus, WritingTaskType
from app.models.writing import WritingSubmission, WritingTask
from test_mock_scheduling_api import _FakeSession, _admin, _request


ROUTES = [
    ("GET", "/tasks", admin_writing_part_01.list_tasks),
    ("GET", "/tasks/{task_id}", admin_writing_part_01.get_task),
    ("POST", "/tasks", admin_writing_part_02.create_task),
    ("PATCH", "/tasks/{task_id}", admin_writing_part_02.update_task),
    ("DELETE", "/tasks/{task_id}", admin_writing_part_02.delete_task),
    ("POST", "/tasks/{task_id}/publish", admin_writing_part_02.publish_task),
    ("POST", "/tasks/{task_id}/archive", admin_writing_part_02.archive_task),
    ("POST", "/tasks/{task_id}/regenerate-image-summary", admin_writing_part_02.regenerate_image_summary),
    ("POST", "/tasks/upload-image", admin_writing_part_02.upload_image),
    ("GET", "/submissions", admin_writing_part_03.list_submissions),
    ("GET", "/submissions/{submission_id}", admin_writing_part_03.get_submission),
    ("POST", "/submissions/{submission_id}/regrade", admin_writing_part_03.regrade_submission),
]


class _Result:
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return self.rows

    def first(self):
        return self.rows[0] if self.rows else None


class _Session(_FakeSession):
    deleted = None
    rolled_back = False

    async def execute(self, statement):
        return _Result(self.execute_rows)

    async def delete(self, item):
        self.deleted = item

    async def rollback(self):
        self.rolled_back = True


def _task():
    return WritingTask(
        id=uuid4(), title="Stored Writing Task", task_type=WritingTaskType.TASK_2,
        prompt_html="<p>Stored prompt</p>", image_summary_status="not_required",
        word_minimum=250, time_limit_seconds=2400, difficulty=WritingDifficulty.MEDIUM,
        status=WritingTaskStatus.DRAFT, question_subtype=WritingQuestionSubtype.OPINION,
        created_at=datetime.now(UTC),
    )


def test_facade_and_app_register_actual_existing_handlers_with_admin_auth(app):
    assert len(admin_writing.router.routes) == len(ROUTES)
    paths = app.openapi()["paths"]
    for method, path, endpoint in ROUTES:
        # FastAPI can retain included routers lazily instead of flattening app.routes.
        # Check the published contract and the owning router, not its internal layout.
        assert method.lower() in paths["/api/admin/writing" + path]
        matches = [route for route in admin_writing.router.routes if route.path == path and method in route.methods]
        assert len(matches) == 1
        assert matches[0].endpoint is endpoint
        assert get_current_admin in [dependency.call for dependency in matches[0].dependant.dependencies]


@pytest.mark.parametrize("method,path,endpoint", ROUTES)
async def test_every_admin_writing_route_rejects_guests_and_user_only_auth(app, method, path, endpoint):
    path = path.replace("{task_id}", str(uuid4())).replace("{submission_id}", str(uuid4()))
    for user in (False, True):
        response = await _request(app, method, "/api/admin/writing" + path, session=_Session(), user=user)
        assert response.status_code == 401


async def test_catalogue_and_detail_call_existing_serializers(app):
    task = _task()
    response = await _request(app, "GET", "/api/admin/writing/tasks?status=published&task_type=task_2&page=1&page_size=100", session=_Session(1, scalar_rows=[task]), admin=True)
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["id"] == str(task.id)
    response = await _request(app, "GET", f"/api/admin/writing/tasks/{task.id}", session=_Session(model_row=task), admin=True)
    assert response.status_code == 200
    assert response.json()["prompt_html"] == task.prompt_html


async def test_create_update_publish_archive_existing_task_handlers(app):
    session = _Session()
    response = await _request(app, "POST", "/api/admin/writing/tasks", session=session, admin=True, payload={
        "title": "Created through registered route", "task_type": "task_2",
        "prompt_html": "<p>Task prompt</p>", "question_subtype": "opinion",
    })
    assert response.status_code == 201, response.text
    task = session.added[0]
    assert task.created_by == _admin().id
    assert response.json()["status"] == "draft"
    response = await _request(app, "PATCH", f"/api/admin/writing/tasks/{task.id}", session=_Session(model_row=task), admin=True, payload={"title": "Updated title"})
    assert response.status_code == 200
    assert response.json()["title"] == "Updated title"
    for action, status in [("publish", "published"), ("archive", "archived")]:
        response = await _request(app, "POST", f"/api/admin/writing/tasks/{task.id}/{action}", session=_Session(model_row=task), admin=True)
        assert response.status_code == 200
        assert response.json()["status"] == status


async def test_delete_unreferenced_task_returns_empty_204(app):
    task = _task()
    session = _Session(0, model_row=task)
    response = await _request(app, "DELETE", f"/api/admin/writing/tasks/{task.id}", session=session, admin=True)
    assert response.status_code == 204
    assert not response.content
    assert session.deleted is task


async def test_delete_existing_submission_returns_conflict(app):
    task = _task()
    session = _Session(1, model_row=task)
    response = await _request(app, "DELETE", f"/api/admin/writing/tasks/{task.id}", session=session, admin=True)
    assert response.status_code == 409
    assert session.deleted is None


@pytest.mark.parametrize("reference", ["online_full_mocks", "writing_drafts", "writing_submissions"])
async def test_delete_fk_conflict_rolls_back_including_concurrent_reference(app, reference):
    class ForeignKeyViolation(Exception):
        sqlstate = "23503"

    class ReferencedSession(_Session):
        async def commit(self):
            raise IntegrityError("DELETE", {}, ForeignKeyViolation(reference))

    task = _task()
    session = ReferencedSession(0, model_row=task)
    response = await _request(app, "DELETE", f"/api/admin/writing/tasks/{task.id}", session=session, admin=True)
    assert response.status_code == 409
    assert "archive instead" in response.json()["detail"]
    assert session.rolled_back


async def test_regenerate_image_summary_dispatches_existing_job(app, monkeypatch):
    task = _task()
    task.image_storage_path = "test-image.png"
    queued = []
    monkeypatch.setattr(admin_writing_part_02, "_enqueue_image_summary", queued.append)
    response = await _request(app, "POST", f"/api/admin/writing/tasks/{task.id}/regenerate-image-summary", session=_Session(model_row=task), admin=True)
    assert response.status_code == 204
    assert queued == [task.id]


async def test_static_upload_route_uses_existing_storage_handler(app, monkeypatch):
    stored = []

    def upload(**kwargs):
        stored.append(kwargs)
        return "/test-image.png"

    monkeypatch.setattr(admin_writing_part_02, "upload_test_diagram_image", upload)
    app.dependency_overrides[get_current_admin] = _admin
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/admin/writing/tasks/upload-image", files={"file": ("image.png", b"test image payload", "image/png")})
        assert response.status_code == 200
        assert response.json() == {"url": "/test-image.png"}
        assert len(stored) == 1
    finally:
        app.dependency_overrides.clear()


async def test_submission_listing_and_missing_detail_use_existing_handlers(app):
    response = await _request(app, "GET", "/api/admin/writing/submissions", session=_Session(0), admin=True)
    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}
    response = await _request(app, "GET", f"/api/admin/writing/submissions/{uuid4()}", session=_Session(), admin=True)
    assert response.status_code == 404


async def test_regrade_dispatches_existing_service(app, monkeypatch):
    from app.services import writing_dispatch

    submission = WritingSubmission(id=uuid4(), status="failed", error_message="Previous failure")
    dispatched = []

    async def dispatch(submission_id):
        dispatched.append(submission_id)
        return "test-celery-id"

    monkeypatch.setattr(writing_dispatch, "dispatch_writing_grading", dispatch)
    response = await _request(app, "POST", f"/api/admin/writing/submissions/{submission.id}/regrade", session=_Session(model_row=submission), admin=True)
    assert response.status_code == 202
    assert submission.status == "queued"
    assert submission.error_message is None
    assert dispatched == [submission.id]
