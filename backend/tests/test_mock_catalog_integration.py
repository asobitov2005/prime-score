"""Real PostgreSQL contracts; all fixture writes roll back, including route commits."""

import os
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.deps import get_current_admin, get_current_user
from app.db.session import get_db_session
from app.models.admin import Admin
from app.models import enums
from app.models.mock import OfflineMockBooking
from app.models.test import Test as ExamTest
from app.models.test import TestSection as ExamSection
from app.models.user import User
from app.models.writing import WritingTask
from app.schemas.common import AdminPrincipal, DebugPrincipal


@pytest_asyncio.fixture
async def mock_database(app):
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url or os.environ.get("ENVIRONMENT") != "test":
        pytest.skip("Requires an explicitly configured test database.")
    url = make_url(database_url)
    if url.host not in {"127.0.0.1", "localhost"} or url.database not in {
        "primescore_test", "primescore_mock_migration_check",
    }:
        pytest.skip("Mock integration fixtures are restricted to isolated local/CI databases.")

    engine = create_async_engine(database_url)
    try:
        async with engine.connect() as connection:
            transaction = await connection.begin()
            async with AsyncSession(
                bind=connection, expire_on_commit=False, join_transaction_mode="create_savepoint",
            ) as session:
                suffix = uuid4().hex
                admin = Admin(
                    username=f"mock-{suffix[:12]}", email=f"{suffix}@example.invalid",
                    password_hash="not-a-login-credential", role=enums.AdminRole.ADMIN,
                )
                user = User(
                    telegram_id=-int(suffix[:10], 16), phone=f"test-{suffix[:14]}",
                    first_name="Integration", show_on_leaderboard=False,
                )
                session.add_all([admin, user])
                await session.flush()

                async def database_override():
                    yield session

                app.dependency_overrides[get_db_session] = database_override
                app.dependency_overrides[get_current_admin] = lambda: AdminPrincipal(
                    id=admin.id, username=admin.username, email=admin.email, role="admin",
                )
                app.dependency_overrides[get_current_user] = lambda: DebugPrincipal(
                    id=user.id, first_name=user.first_name,
                )
                try:
                    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                        yield client, session, suffix
                finally:
                    app.dependency_overrides.clear()
            await transaction.rollback()
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_real_bundle_catalog_publication_pagination_and_withdrawal(mock_database):
    client, session, suffix = mock_database
    listening = ExamTest(
        title="Private listening fixture", slug=f"listening-{suffix}", type=enums.TestType.LISTENING,
        format=enums.TestFormat.FULL, access_type=enums.AccessType.PUBLIC, status=enums.TestStatus.PUBLISHED,
        source=enums.TestSource.CUSTOM, exam_time_limit_seconds=2400,
    )
    reading = ExamTest(
        title="Private reading fixture", slug=f"reading-{suffix}", type=enums.TestType.READING,
        format=enums.TestFormat.FULL, access_type=enums.AccessType.PUBLIC, status=enums.TestStatus.PUBLISHED,
        source=enums.TestSource.CUSTOM, exam_time_limit_seconds=3600,
    )
    task1 = WritingTask(title="Private Task 1", task_type="task_1", prompt_html="Private prompt.",
                        time_limit_seconds=1200, status="published")
    task2 = WritingTask(title="Private Task 2", task_type="task_2", prompt_html="Private prompt.",
                        time_limit_seconds=2400, status="published")
    session.add_all([listening, reading, task1, task2])
    await session.flush()
    session.add_all([
        ExamSection(test_id=listening.id, position=position, title=f"Part {position}", audio_duration_seconds=1140)
        for position in (1, 2)
    ])
    await session.flush()
    # Production contains both enum names and enum values; exercise the actual SQL comparator.
    await session.execute(text("UPDATE tests SET type='READING', format='FULL', status='PUBLISHED' WHERE id=:id"), {"id": reading.id})
    writing_catalog = await client.get("/api/admin/writing/tasks?status=published&task_type=task_1&page_size=100")
    assert writing_catalog.status_code == 200, writing_catalog.text
    assert str(task1.id) in {item["id"] for item in writing_catalog.json()["items"]}
    before = (await client.get("/api/mock/online-mocks")).json()["total"]
    payload = {
        "title": "Private bundle fixture", "description": "Transactional test only",
        "listening_test_id": str(listening.id), "reading_test_id": str(reading.id),
        "writing_task_1_id": str(task1.id), "writing_task_2_id": str(task2.id),
        "academic_confirmed": True, "is_published": False,
    }
    draft = await client.post("/api/admin/mock/online-mocks", json=payload)
    assert draft.status_code == 201, draft.text
    assert (await client.get("/api/mock/online-mocks")).json()["total"] == before
    bundle_ids = []
    for number in range(2):
        result = await client.post("/api/admin/mock/online-mocks", json={**payload, "is_published": True, "title": f"Private bundle {number}"})
        assert result.status_code == 201, result.text
        bundle_ids.append(result.json()["id"])

    page1 = (await client.get("/api/mock/online-mocks?page=1&page_size=1")).json()
    page2 = (await client.get("/api/mock/online-mocks?page=2&page_size=1")).json()
    assert page1["total"] == before + 2
    assert {page1["items"][0]["id"], page2["items"][0]["id"]} == set(bundle_ids)
    assert page1["items"][0]["duration_minutes"] == 160
    detail = await client.get(f"/api/mock/online-mocks/{bundle_ids[0]}")
    assert detail.status_code == 200, detail.text
    stages = detail.json()["stages"]
    assert [stage["key"] for stage in stages] == ["listening", "reading", "writing_task_1", "writing_task_2"]
    assert all("start=1" in stage["launch_url"] for stage in stages[:2])
    assert "prompt_html" not in detail.text and "correct_answer" not in detail.text

    reading.status = enums.TestStatus.ARCHIVED
    await session.flush()
    assert (await client.get("/api/mock/online-mocks")).json()["total"] == before
    assert (await client.get(f"/api/mock/online-mocks/{bundle_ids[0]}")).status_code == 404
    reading.format = enums.TestFormat.PASSAGE_1
    await session.flush()
    unpublished = await client.patch(f"/api/admin/mock/online-mocks/{bundle_ids[0]}", json={"is_published": False})
    assert unpublished.status_code == 200, unpublished.text
    assert (await session.get(ExamTest, reading.id)) is not None


@pytest.mark.asyncio
async def test_real_offline_booking_is_idempotent_and_seats_are_counted(mock_database):
    client, session, _suffix = mock_database
    baseline = (await client.get("/api/mock/offline-schedules?page=1&page_size=6")).json()["total"]
    result = await client.post("/api/admin/mock/offline-schedules", json={
        "title": "Private offline fixture", "starts_at": (datetime.now(UTC) + timedelta(days=2)).isoformat(),
        "duration_minutes": 180, "location": "Private test venue", "address": "Private test address",
        "capacity": 1, "price_amount": "100000", "is_published": True,
    })
    assert result.status_code == 201, result.text
    schedule = result.json()
    assert schedule["available_seats"] == 1
    assert schedule["address"] == "Private test address"
    assert (await client.get("/api/mock/offline-schedules?page=1&page_size=6")).json()["total"] == baseline + 1
    first = await client.post("/api/mock/bookings", json={"schedule_id": schedule["id"]})
    second = await client.post("/api/mock/bookings", json={"schedule_id": schedule["id"]})
    assert first.status_code == 201, first.text
    assert second.status_code == 200, second.text
    assert first.json()["id"] == second.json()["id"]
    assert await session.scalar(select(func.count()).select_from(OfflineMockBooking).where(
        OfflineMockBooking.schedule_id == UUID(schedule["id"]),
    )) == 1
    assert (await client.get("/api/mock/offline-schedules?page=1&page_size=6")).json()["total"] == baseline
    listed = (await client.get("/api/admin/mock/offline-schedules")).json()["items"]
    stored = next(item for item in listed if item["id"] == schedule["id"])
    assert stored["reserved_count"] == 1 and stored["available_seats"] == 0
