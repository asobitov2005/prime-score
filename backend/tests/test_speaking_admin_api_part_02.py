from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_speaking_admin_api_dependencies import *
from tests.test_speaking_admin_api_part_01 import TOPIC_ID, _FakeScalarResult, _FakeSession, _admin_principal, _topic_row

async def test_admin_can_create_part1_topic_without_prompt_or_category(app) -> None:
    session = _FakeSession()

    async def override_db_session():
        yield session

    async def override_admin():
        return _admin_principal()

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_current_admin] = override_admin
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/admin/speaking/topics",
                json={
                    "part_number": 1,
                    "topic_title": "Home and living space",
                    "bullet_points": ["Do you live in a house or an apartment?"],
                    "active": True,
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    payload = response.json()
    assert payload["part_number"] == 1
    assert payload["prompt_text"] == "Home and living space"
    assert payload["category_tags"] == []

async def test_admin_can_update_speaking_topic(app) -> None:
    topic = _topic_row()

    class _UpdateSession(_FakeSession):
        async def get(self, _model: object, topic_id: object) -> SimpleNamespace | None:
            if topic_id == TOPIC_ID:
                return topic
            return None

    session = _UpdateSession()

    async def override_db_session():
        yield session

    async def override_admin():
        return _admin_principal()

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_current_admin] = override_admin
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.patch(
                f"/api/admin/speaking/topics/{TOPIC_ID}",
                json={
                    "topic_title": "Describe a useful skill you learned",
                    "prompt_text": "Describe a useful skill you learned.",
                    "bullet_points": ["what it was", "how you learned it", "why it matters now"],
                    "category_tags": ["education"],
                    "active": True,
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["bullet_points"] == ["what it was", "how you learned it", "why it matters now"]
    assert topic.bullet_points == ["what it was", "how you learned it", "why it matters now"]

def _category_row(*, slug: str = "public_transport") -> SimpleNamespace:
    return SimpleNamespace(
        slug=slug,
        label=None,
        scope="custom",
        active=True,
        created_at=datetime(2026, 5, 10, tzinfo=UTC),
        updated_at=datetime(2026, 5, 10, tzinfo=UTC),
    )

class _CategorySession(_FakeSession):
    def __init__(self) -> None:
        super().__init__()
        self.categories = [_category_row(), _category_row(slug="education")]
        self.deleted: list[object] = []

    async def scalar(self, statement: object) -> int:
        statement_str = str(statement)
        if "speaking_categories" in statement_str:
            return None
        return 0

    async def scalars(self, statement: object) -> _FakeScalarResult:
        statement_str = str(statement)
        if "speaking_categories" in statement_str:
            return _FakeScalarResult(self.categories)
        return await super().scalars(statement)

async def test_admin_can_list_speaking_categories(app) -> None:
    async def override_db_session():
        yield _CategorySession()

    async def override_admin():
        return _admin_principal()

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_current_admin] = override_admin
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/admin/speaking/categories")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 2
    slugs = {item["slug"] for item in payload["items"]}
    assert slugs == {"education", "public_transport"}

async def test_admin_can_create_speaking_category(app) -> None:
    session = _CategorySession()
    session.categories = [_category_row(slug="education")]

    async def override_db_session():
        yield session

    async def override_admin():
        return _admin_principal()

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_current_admin] = override_admin
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/admin/speaking/categories",
                json={"name": "Public transport", "scope": "custom"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    payload = response.json()
    assert payload["slug"] == "public_transport"
    assert payload["scope"] == "custom"
    assert len(session.added) == 1
