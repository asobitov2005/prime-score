from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID

from httpx import ASGITransport, AsyncClient

from app.core.deps import get_current_admin
from app.db.session import get_db_session
from app.schemas.common import AdminPrincipal


TOPIC_ID = UUID("22222222-2222-2222-2222-222222222222")
TEST_ID = UUID("33333333-3333-3333-3333-333333333333")


def _admin_principal() -> AdminPrincipal:
    return AdminPrincipal(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        username="admin",
        email="admin@example.com",
        phone_number="+998901234567",
        telegram_id=900000001,
        role="admin",
        is_active=True,
    )


def _topic_row() -> SimpleNamespace:
    return SimpleNamespace(
        id=TOPIC_ID,
        part_number=2,
        topic_title="Describe a useful skill you learned",
        prompt_text="Describe a useful skill you learned.",
        bullet_points=["what it was", "how you learned it", "why it was useful"],
        followup_group_key="education-skill-01",
        difficulty_label="medium",
        category_tags=["education"],
        source_kind="real_reported",
        source_note="Reported 2026 trend",
        active=True,
        seed_rank=1,
        metadata={},
        created_at=datetime(2026, 5, 10, tzinfo=UTC),
        updated_at=datetime(2026, 5, 10, tzinfo=UTC),
    )


def _test_row() -> SimpleNamespace:
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
        created_by=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
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
        self.topic = _topic_row()
        self.test = _test_row()
        self.added: list[object] = []

    async def scalar(self, _statement: object) -> int:
        return 1

    async def scalars(self, statement: object) -> _FakeScalarResult:
        statement_str = str(statement)
        if "speaking_topics" in statement_str:
            return _FakeScalarResult([self.topic])
        return _FakeScalarResult([self.test])

    def add(self, item: object) -> None:
        self.added.append(item)

    async def commit(self) -> None:
        return None

    async def refresh(self, item: object) -> None:
        if getattr(item, "id", None) is None:
            item.id = TOPIC_ID
        if getattr(item, "created_at", None) is None:
            item.created_at = datetime(2026, 5, 10, tzinfo=UTC)
        if getattr(item, "updated_at", None) is None:
            item.updated_at = datetime(2026, 5, 10, tzinfo=UTC)


async def test_admin_can_list_speaking_topics(app) -> None:
    async def override_db_session():
        yield _FakeSession()

    async def override_admin():
        return _admin_principal()

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_current_admin] = override_admin
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/admin/speaking/topics?part_number=2&category=education")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"][0]["id"] == str(TOPIC_ID)
    assert payload["items"][0]["category_tags"] == ["education"]


async def test_admin_can_create_speaking_topic(app) -> None:
    async def override_db_session():
        yield _FakeSession()

    async def override_admin():
        return _admin_principal()

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_current_admin] = override_admin
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/admin/speaking/topics",
                json={
                    "part_number": 3,
                    "topic_title": "Technology and education",
                    "prompt_text": "How is technology changing education?",
                    "bullet_points": [],
                    "followup_group_key": "technology-education-02",
                    "difficulty_label": "medium",
                    "category_tags": ["technology", "education"],
                    "source_kind": "editorial",
                    "source_note": "PrimeScore seed",
                    "active": True,
                    "seed_rank": 2,
                    "metadata": {"window": "2026-may-aug"},
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    payload = response.json()
    assert payload["part_number"] == 3
    assert payload["category_tags"] == ["technology", "education"]
