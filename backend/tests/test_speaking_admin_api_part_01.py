from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_speaking_admin_api_dependencies import *

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

def _topic_row(*, topic_metadata: dict | None = None) -> SimpleNamespace:
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
        topic_metadata={} if topic_metadata is None else topic_metadata,
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

async def test_admin_can_list_speaking_topics_with_empty_metadata(app) -> None:
    async def override_db_session():
        yield _FakeSession()

    async def override_admin():
        return _admin_principal()

    session = _FakeSession()
    session.topic = _topic_row(topic_metadata={})

    async def override_db_session_with_empty_metadata():
        yield session

    app.dependency_overrides[get_db_session] = override_db_session_with_empty_metadata
    app.dependency_overrides[get_current_admin] = override_admin
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/admin/speaking/topics?part_number=2")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["items"][0]["metadata"] == {}

async def test_admin_can_create_part3_topic_linked_to_part2(app) -> None:
    part2_id = UUID("44444444-4444-4444-4444-444444444444")
    part2_row = SimpleNamespace(
        id=part2_id,
        part_number=2,
        topic_title="A useful skill you learned",
        prompt_text="Describe a useful skill you learned.",
        bullet_points=["what the skill was"],
        followup_group_key="education-skill",
        difficulty_label="medium",
        category_tags=["education"],
        source_kind="custom",
        source_note=None,
        active=True,
        seed_rank=1,
        topic_metadata={},
        created_at=datetime(2026, 5, 10, tzinfo=UTC),
        updated_at=datetime(2026, 5, 10, tzinfo=UTC),
    )

    class _LinkedSession(_FakeSession):
        async def get(self, _model: object, topic_id: object) -> SimpleNamespace | None:
            if topic_id == part2_id:
                return part2_row
            return None

    async def override_db_session():
        yield _LinkedSession()

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
                    "topic_title": "Education and modern skills",
                    "prompt_text": "Discuss how education should prepare people for modern life.",
                    "bullet_points": ["Do schools teach practical skills?"],
                    "linked_part2_topic_id": str(part2_id),
                    "category_tags": ["education"],
                    "active": True,
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    payload = response.json()
    assert payload["followup_group_key"] == "education-skill"

async def test_admin_can_delete_speaking_topic(app) -> None:
    topic = _topic_row()

    class _DeleteSession(_FakeSession):
        async def get(self, _model: object, topic_id: object) -> SimpleNamespace | None:
            if topic_id == TOPIC_ID:
                return topic
            return None

        async def execute(self, _statement: object) -> None:
            return None

        async def delete(self, item: object) -> None:
            self.deleted = item

    session = _DeleteSession()

    async def override_db_session():
        yield session

    async def override_admin():
        return _admin_principal()

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_current_admin] = override_admin
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.delete(f"/api/admin/speaking/topics/{TOPIC_ID}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 204

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
                    "part_number": 2,
                    "topic_title": "A website or app that helps you",
                    "prompt_text": "Describe a website or app that helps you in daily life.",
                    "bullet_points": ["what it is", "how it helps you"],
                    "category_tags": ["technology"],
                    "active": True,
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    payload = response.json()
    assert payload["part_number"] == 2
    assert payload["category_tags"] == ["technology"]
    assert payload["followup_group_key"] == "a-website-or-app-that-helps-you"
