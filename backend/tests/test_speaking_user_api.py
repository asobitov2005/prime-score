from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID

from httpx import ASGITransport, AsyncClient

from app.core.deps import get_current_user
from app.db.session import get_db_session
from app.schemas.common import DebugPrincipal


TEST_ID = UUID("33333333-3333-3333-3333-333333333333")
SESSION_ID = UUID("44444444-4444-4444-4444-444444444444")


def _debug_user() -> DebugPrincipal:
    return DebugPrincipal(
        id=UUID("55555555-5555-5555-5555-555555555555"),
        first_name="Azizbek",
        last_name="Prime",
        username="azizbek",
        phone="+998901234567",
        role="user",
        is_premium=True,
        show_on_leaderboard=True,
    )


def _published_test() -> SimpleNamespace:
    return SimpleNamespace(
        id=TEST_ID,
        title="Speaking Mock Test 1",
        slug="speaking-mock-test-1",
        status="published",
        access_type="public",
        mode_kind="full",
        source="real_exam",
        source_detail="May-Aug 2026",
        description="A dedicated speaking mock.",
        estimated_minutes=14,
        version=1,
        created_by=None,
        created_at=datetime(2026, 5, 10, tzinfo=UTC),
        updated_at=datetime(2026, 5, 10, tzinfo=UTC),
    )


class _FakeScalarResult:
    def __init__(self, rows: list[SimpleNamespace]) -> None:
        self._rows = rows

    def all(self) -> list[SimpleNamespace]:
        return self._rows


class _FakeSession:
    def __init__(self) -> None:
        self.test = _published_test()
        self.added: list[object] = []

    async def scalar(self, _statement: object) -> int:
        return 1

    async def scalars(self, _statement: object) -> _FakeScalarResult:
        return _FakeScalarResult([self.test])

    async def get(self, _model: object, _identity: object) -> SimpleNamespace:
        return self.test

    def add(self, item: object) -> None:
        self.added.append(item)

    async def commit(self) -> None:
        return None

    async def refresh(self, item: object) -> None:
        if getattr(item, "id", None) is None:
            item.id = SESSION_ID
        if getattr(item, "created_at", None) is None:
            item.created_at = datetime(2026, 5, 10, tzinfo=UTC)
        if getattr(item, "updated_at", None) is None:
            item.updated_at = datetime(2026, 5, 10, tzinfo=UTC)


class _HistorySession(_FakeSession):
    async def scalars(self, statement: object) -> _FakeScalarResult:
        statement_str = str(statement)
        if "speaking_sessions" in statement_str:
            return _FakeScalarResult(
                [
                    SimpleNamespace(
                        id=SESSION_ID,
                        speaking_test_id=TEST_ID,
                        status="graded",
                        entry_mode="full",
                        current_part=None,
                        warning_count=0,
                        termination_reason=None,
                        created_at=datetime(2026, 5, 10, 9, 0, tzinfo=UTC),
                        updated_at=datetime(2026, 5, 10, 9, 20, tzinfo=UTC),
                        started_at=datetime(2026, 5, 10, 9, 5, tzinfo=UTC),
                        ended_at=datetime(2026, 5, 10, 9, 18, tzinfo=UTC),
                        graded_at=datetime(2026, 5, 10, 9, 20, tzinfo=UTC),
                        speaking_test_title="Speaking Mock Test 1",
                        speaking_test_source="real_exam",
                        speaking_test_source_detail="May-Aug 2026",
                        overall_band=6.5,
                        time_spent_sec=780,
                    )
                ]
            )
        return await super().scalars(statement)


async def test_user_can_list_published_speaking_tests(app) -> None:
    async def override_db_session():
        yield _FakeSession()

    async def override_user():
        return _debug_user()

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_current_user] = override_user
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/speaking/tests")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["items"][0]["id"] == str(TEST_ID)


async def test_user_can_create_speaking_session(app) -> None:
    async def override_db_session():
        yield _FakeSession()

    async def override_user():
        return _debug_user()

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_current_user] = override_user
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/speaking/sessions",
                json={"speaking_test_id": str(TEST_ID), "entry_mode": "full"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    payload = response.json()
    assert payload["session_id"] == str(SESSION_ID)
    assert payload["entry_mode"] == "full"


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
