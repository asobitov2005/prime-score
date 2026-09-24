from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from urllib.parse import urlencode
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import UniqueConstraint

from app.core.deps import get_current_admin, get_current_user
from app.db.session import get_db_session
from app.models.mock import OfflineMockBooking, OfflineMockSchedule
from app.models.ops import AuditLog
from app.schemas.common import AdminPrincipal, DebugPrincipal


class _Rows:
    def __init__(self, rows: list[object]) -> None:
        self._rows = rows

    def all(self) -> list[object]:
        return self._rows


class _FakeSession:
    def __init__(
        self,
        *scalar_values: object,
        scalar_rows: list[object] | None = None,
        execute_rows: list[object] | None = None,
        model_row: object | None = None,
    ) -> None:
        self.scalar_values = list(scalar_values)
        self.scalar_rows = scalar_rows or []
        self.execute_rows = execute_rows or []
        self.model_row = model_row
        self.added: list[object] = []

    async def scalar(self, _statement: object) -> object:
        if not self.scalar_values:
            return None
        return self.scalar_values.pop(0)

    async def scalars(self, _statement: object) -> _Rows:
        return _Rows(self.scalar_rows)

    async def execute(self, _statement: object) -> _Rows:
        return _Rows(self.execute_rows)

    async def get(self, _model: object, _key: object) -> object | None:
        return self.model_row

    def add(self, item: object) -> None:
        self.added.append(item)

    async def flush(self) -> None:
        for item in self.added:
            if getattr(item, "id", None) is None:
                item.id = uuid4()

    async def commit(self) -> None:
        return None

    async def refresh(self, item: object) -> None:
        if getattr(item, "id", None) is None:
            item.id = uuid4()
        if getattr(item, "created_at", None) is None:
            item.created_at = datetime.now(UTC)
        if getattr(item, "updated_at", None) is None:
            item.updated_at = datetime.now(UTC)


def _schedule(*, capacity: int = 2) -> OfflineMockSchedule:
    return OfflineMockSchedule(
        id=UUID("11111111-1111-4111-8111-111111111111"),
        title="Offline IELTS Mock",
        starts_at=datetime.now(UTC) + timedelta(days=3),
        duration_minutes=180,
        location="Tashkent",
        capacity=capacity,
        price_amount=Decimal("100000"),
        is_published=True,
    )


def _user() -> DebugPrincipal:
    return DebugPrincipal(
        id=UUID("22222222-2222-4222-8222-222222222222"),
        first_name="Test",
        last_name="User",
    )


def _admin() -> AdminPrincipal:
    return AdminPrincipal(
        id=UUID("33333333-3333-4333-8333-333333333333"),
        username="admin",
        email="admin@example.com",
        role="admin",
    )


async def _request(
    app,
    method: str,
    path: str,
    *,
    session: _FakeSession,
    user: bool = False,
    admin: bool = False,
    payload: dict[str, object] | None = None,
):
    async def override_db_session():
        yield session

    app.dependency_overrides[get_db_session] = override_db_session
    if user:
        async def override_user():
            return _user()

        app.dependency_overrides[get_current_user] = override_user
    if admin:
        async def override_admin():
            return _admin()

        app.dependency_overrides[get_current_admin] = override_admin
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            return await client.request(method, path, json=payload)
    finally:
        app.dependency_overrides.clear()


def test_offline_schedule_has_demo_price_default() -> None:
    price_column = OfflineMockSchedule.__table__.c.price_amount

    assert price_column.server_default is not None
    assert str(price_column.server_default.arg) == "100000"


def test_user_can_only_reserve_one_booking_per_schedule() -> None:
    constraints = OfflineMockBooking.__table__.constraints

    assert any(
        isinstance(constraint, UniqueConstraint)
        and {column.name for column in constraint.columns} == {"user_id", "schedule_id"}
        for constraint in constraints
    )


def test_schedule_rejects_non_positive_capacity() -> None:
    from app.schemas.mock_scheduling import AdminOfflineMockScheduleUpsert

    with pytest.raises(ValueError):
        AdminOfflineMockScheduleUpsert(
            title="Offline Mock",
            starts_at=datetime.now(UTC) + timedelta(days=1),
            duration_minutes=180,
            location="Tashkent",
            capacity=0,
            price_amount=Decimal("100000"),
            is_published=True,
        )


def test_schedule_rejects_negative_demo_price() -> None:
    from app.schemas.mock_scheduling import AdminOfflineMockScheduleUpsert

    with pytest.raises(ValueError):
        AdminOfflineMockScheduleUpsert(
            title="Offline Mock",
            starts_at=datetime.now(UTC) + timedelta(days=1),
            duration_minutes=180,
            location="Tashkent",
            capacity=12,
            price_amount=Decimal("-1"),
            is_published=True,
        )


async def test_guest_can_browse_published_offline_schedules(app) -> None:
    schedule = _schedule()
    date_query = urlencode(
        {
            "from": (datetime.now(UTC) - timedelta(days=1)).isoformat(),
            "to": (datetime.now(UTC) + timedelta(days=43)).isoformat(),
        }
    )
    response = await _request(
        app,
        "GET",
        f"/api/mock/offline-schedules?{date_query}",
        session=_FakeSession(scalar_rows=[schedule], execute_rows=[(schedule.id, 1)]),
    )

    assert response.status_code == 200
    assert response.json()["items"][0]["available_seats"] == 1


async def test_schedule_range_is_limited_to_45_days(app) -> None:
    now = datetime.now(UTC)
    date_query = urlencode({"from": now.isoformat(), "to": (now + timedelta(days=46)).isoformat()})
    response = await _request(
        app,
        "GET",
        f"/api/mock/offline-schedules?{date_query}",
        session=_FakeSession(),
    )

    assert response.status_code == 400


async def test_booking_requires_user_authentication(app) -> None:
    response = await _request(
        app,
        "POST",
        "/api/mock/bookings",
        session=_FakeSession(),
    )

    assert response.status_code == 401


async def test_my_bookings_returns_all_future_reservations(app) -> None:
    schedules = [_schedule(), _schedule()]
    schedules[1].id = uuid4()
    schedules[1].starts_at += timedelta(days=1)
    bookings = [
        OfflineMockBooking(id=uuid4(), user_id=_user().id, schedule_id=schedule.id)
        for schedule in schedules
    ]

    class BookingSession(_FakeSession):
        async def execute(self, statement):
            from sqlalchemy.dialects import postgresql

            sql = str(statement.compile(
                dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True},
            ))
            assert "LIMIT" not in sql
            assert f"offline_mock_bookings.user_id = '{_user().id}'" in sql
            assert "offline_mock_schedules.starts_at >" in sql
            assert "ORDER BY offline_mock_schedules.starts_at ASC, offline_mock_bookings.id" in sql
            return await super().execute(statement)

    response = await _request(
        app, "GET", "/api/mock/bookings/me", user=True,
        session=BookingSession(execute_rows=list(zip(bookings, schedules))),
    )
    assert response.status_code == 200
    assert [item["schedule_id"] for item in response.json()["items"]] == [
        str(schedule.id) for schedule in schedules
    ]


async def test_my_bookings_requires_authentication(app) -> None:
    response = await _request(app, "GET", "/api/mock/bookings/me", session=_FakeSession())
    assert response.status_code == 401


async def test_authenticated_user_can_reserve_with_manual_click_payment_instructions(app) -> None:
    schedule = _schedule()
    response = await _request(
        app,
        "POST",
        "/api/mock/bookings",
        session=_FakeSession(schedule, None, 0),
        user=True,
        payload={"schedule_id": str(schedule.id)},
    )

    assert response.status_code == 201
    assert response.json()["payment_method"] == "click"
    assert response.json()["payment_confirmation"] == "manual"
    assert Decimal(response.json()["price_amount"]) == Decimal("100000")


async def test_full_schedule_cannot_be_reserved(app) -> None:
    schedule = _schedule(capacity=1)
    response = await _request(
        app,
        "POST",
        "/api/mock/bookings",
        session=_FakeSession(schedule, None, 1),
        user=True,
        payload={"schedule_id": str(schedule.id)},
    )

    assert response.status_code == 409


async def test_past_schedule_cannot_be_reserved(app) -> None:
    schedule = _schedule()
    schedule.starts_at = datetime.now(UTC) - timedelta(minutes=1)
    response = await _request(
        app,
        "POST",
        "/api/mock/bookings",
        session=_FakeSession(schedule),
        user=True,
        payload={"schedule_id": str(schedule.id)},
    )

    assert response.status_code == 409


async def test_repeat_booking_is_idempotent(app) -> None:
    schedule = _schedule()
    existing = OfflineMockBooking(
        id=UUID("44444444-4444-4444-8444-444444444444"),
        user_id=_user().id,
        schedule_id=schedule.id,
    )
    session = _FakeSession(schedule, existing)
    response = await _request(
        app,
        "POST",
        "/api/mock/bookings",
        session=session,
        user=True,
        payload={"schedule_id": str(schedule.id)},
    )

    assert response.status_code == 200
    assert response.json()["id"] == str(existing.id)
    assert session.added == []


@pytest.mark.parametrize("schedule_state", ["unpublished", "past"])
async def test_repeat_booking_returns_existing_after_schedule_closes(app, schedule_state: str) -> None:
    schedule = _schedule()
    if schedule_state == "unpublished":
        schedule.is_published = False
    else:
        schedule.starts_at = datetime.now(UTC) - timedelta(minutes=1)
    existing = OfflineMockBooking(
        id=UUID("44444444-4444-4444-8444-444444444444"),
        user_id=_user().id,
        schedule_id=schedule.id,
    )
    response = await _request(
        app,
        "POST",
        "/api/mock/bookings",
        session=_FakeSession(schedule, existing),
        user=True,
        payload={"schedule_id": str(schedule.id)},
    )

    assert response.status_code == 200
    assert response.json()["id"] == str(existing.id)


async def test_unpublished_schedule_cannot_be_reserved(app) -> None:
    schedule = _schedule()
    schedule.is_published = False
    response = await _request(
        app,
        "POST",
        "/api/mock/bookings",
        session=_FakeSession(schedule),
        user=True,
        payload={"schedule_id": str(schedule.id)},
    )

    assert response.status_code == 404


async def test_admin_schedule_management_requires_admin_authentication(app) -> None:
    response = await _request(
        app,
        "POST",
        "/api/admin/mock/offline-schedules",
        session=_FakeSession(),
    )

    assert response.status_code == 401


async def test_admin_can_create_audited_demo_schedule(app) -> None:
    session = _FakeSession()
    response = await _request(
        app,
        "POST",
        "/api/admin/mock/offline-schedules",
        session=session,
        admin=True,
        payload={
            "title": "Offline IELTS Mock",
            "starts_at": (datetime.now(UTC) + timedelta(days=3)).isoformat(),
            "duration_minutes": 180,
            "location": "Tashkent",
            "capacity": 12,
            "price_amount": 100000,
            "is_published": True,
        },
    )

    assert response.status_code == 201
    assert response.json()["is_published"] is True
    assert any(isinstance(item, OfflineMockSchedule) for item in session.added)
    assert any(isinstance(item, AuditLog) for item in session.added)


async def test_admin_cannot_reduce_capacity_below_existing_reservations(app) -> None:
    schedule = _schedule(capacity=4)
    response = await _request(
        app,
        "PATCH",
        f"/api/admin/mock/offline-schedules/{schedule.id}",
        session=_FakeSession(schedule, 3),
        admin=True,
        payload={
            "title": schedule.title,
            "starts_at": schedule.starts_at.isoformat(),
            "duration_minutes": schedule.duration_minutes,
            "location": schedule.location,
            "capacity": 2,
            "price_amount": 100000,
            "is_published": True,
        },
    )

    assert response.status_code == 409


async def test_admin_can_unpublish_schedule_without_deleting_reservations(app) -> None:
    schedule = _schedule()
    session = _FakeSession(schedule, 1)
    response = await _request(
        app,
        "PATCH",
        f"/api/admin/mock/offline-schedules/{schedule.id}",
        session=session,
        admin=True,
        payload={
            "title": schedule.title,
            "starts_at": schedule.starts_at.isoformat(),
            "duration_minutes": schedule.duration_minutes,
            "location": schedule.location,
            "capacity": schedule.capacity,
            "price_amount": 100000,
            "is_published": False,
        },
    )

    assert response.status_code == 200
    assert response.json()["is_published"] is False
    assert any(isinstance(item, AuditLog) for item in session.added)


async def test_future_pagination_without_range_includes_address(app):
    schedule = _schedule()
    schedule.address = "Building 12, room 3"
    response = await _request(
        app, "GET", "/api/mock/offline-schedules?page=2&page_size=1",
        session=_FakeSession(3, scalar_rows=[schedule]),
    )
    assert response.status_code == 200
    assert response.json()["total"] == 3
    assert response.json()["page"] == 2
    assert response.json()["page_size"] == 1
    assert response.json()["items"][0]["address"] == schedule.address


async def test_range_requires_both_bounds(app):
    query = urlencode({"from": datetime.now(UTC).isoformat()})
    response = await _request(app, "GET", f"/api/mock/offline-schedules?{query}", session=_FakeSession())
    assert response.status_code == 400


async def test_legacy_admin_update_preserves_existing_address(app):
    schedule = _schedule()
    schedule.address = "Existing address"
    response = await _request(
        app, "PATCH", f"/api/admin/mock/offline-schedules/{schedule.id}",
        session=_FakeSession(schedule, 0), admin=True,
        payload={
            "title": schedule.title, "starts_at": schedule.starts_at.isoformat(),
            "duration_minutes": schedule.duration_minutes, "location": schedule.location,
            "capacity": schedule.capacity, "price_amount": "100000", "is_published": True,
        },
    )
    assert response.status_code == 200
    assert response.json()["address"] == "Existing address"
