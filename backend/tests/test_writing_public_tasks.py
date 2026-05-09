from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID

from httpx import ASGITransport, AsyncClient

from app.db.session import get_db_session
from app.models.enums import WritingDifficulty, WritingTaskStatus, WritingTaskType


TASK_ID = UUID("11111111-1111-1111-1111-111111111111")


def _published_task() -> SimpleNamespace:
    return SimpleNamespace(
        id=TASK_ID,
        title="Academic Writing Task 1",
        task_type=WritingTaskType.TASK_1,
        prompt_html="<p>Summarise the chart.</p>",
        image_storage_path="/api/storage/test-assets/writing/chart.png",
        image_summary="A chart summary.",
        image_summary_status="completed",
        word_minimum=150,
        time_limit_seconds=1200,
        difficulty=WritingDifficulty.MEDIUM,
        status=WritingTaskStatus.PUBLISHED,
        source="Cambridge",
        question_subtype=None,
        description="A published writing prompt.",
        sample_band=None,
        created_at=datetime(2026, 5, 9, tzinfo=UTC),
    )


class _FakeScalarResult:
    def __init__(self, rows: list[SimpleNamespace]) -> None:
        self._rows = rows

    def all(self) -> list[SimpleNamespace]:
        return self._rows


class _FakeSession:
    def __init__(self) -> None:
        self.task = _published_task()

    async def scalar(self, _statement: object) -> int:
        return 1

    async def scalars(self, _statement: object) -> _FakeScalarResult:
        return _FakeScalarResult([self.task])

    async def get(self, _model: object, _identity: object) -> SimpleNamespace:
        return self.task


async def test_published_writing_tasks_are_public(app) -> None:
    async def override_db_session():
        yield _FakeSession()

    app.dependency_overrides[get_db_session] = override_db_session
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/writing/tasks?page_size=1")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["items"][0]["id"] == str(TASK_ID)


async def test_published_writing_task_detail_is_public(app) -> None:
    async def override_db_session():
        yield _FakeSession()

    app.dependency_overrides[get_db_session] = override_db_session
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/writing/tasks/{TASK_ID}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["id"] == str(TASK_ID)
