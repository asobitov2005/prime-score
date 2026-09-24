from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.admin_common import _write_audit_log
from app.core.deps import get_current_admin
from app.db.session import get_db_session
from app.models.mock import OfflineMockBooking, OfflineMockSchedule
from app.schemas.common import AdminPrincipal
from app.schemas.mock_scheduling import (
    AdminOfflineMockScheduleUpsert,
    OfflineMockScheduleListRead,
    OfflineMockScheduleRead,
)
from app.services.mock_scheduling import count_bookings_by_schedule

router = APIRouter()


def _schedule_read(
    schedule: OfflineMockSchedule,
    reserved_count: int,
) -> OfflineMockScheduleRead:
    return OfflineMockScheduleRead(
        id=schedule.id,
        title=schedule.title,
        starts_at=schedule.starts_at,
        duration_minutes=schedule.duration_minutes,
        location=schedule.location,
        address=schedule.address,
        capacity=schedule.capacity,
        reserved_count=reserved_count,
        available_seats=max(0, schedule.capacity - reserved_count),
        price_amount=schedule.price_amount,
        is_published=schedule.is_published,
    )


def _validate_publish_state(payload: AdminOfflineMockScheduleUpsert) -> None:
    if payload.is_published and payload.starts_at <= datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A past mock session cannot be published.",
        )


async def _audit_schedule_change(
    session: AsyncSession,
    current_admin: AdminPrincipal,
    action: str,
    schedule: OfflineMockSchedule,
) -> None:
    await _write_audit_log(
        session,
        admin_id=current_admin.id,
        action=action,
        target_type="offline_mock_schedule",
        target_id=schedule.id,
        changes={
            "title": schedule.title,
            "starts_at": schedule.starts_at.isoformat(),
            "duration_minutes": schedule.duration_minutes,
            "location": schedule.location,
            "address": schedule.address,
            "capacity": schedule.capacity,
            "price_amount": str(schedule.price_amount),
            "is_published": schedule.is_published,
        },
    )


@router.get("/mock/offline-schedules", response_model=OfflineMockScheduleListRead)
async def list_admin_offline_mock_schedules(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> OfflineMockScheduleListRead:
    _ = current_admin
    schedules = list(
        (
            await session.scalars(
                select(OfflineMockSchedule).order_by(OfflineMockSchedule.starts_at.desc())
            )
        ).all()
    )
    reserved_counts = await count_bookings_by_schedule(
        session,
        [schedule.id for schedule in schedules],
    )
    return OfflineMockScheduleListRead(
        total=len(schedules),
        items=[
            _schedule_read(schedule, reserved_counts.get(schedule.id, 0))
            for schedule in schedules
        ]
    )


@router.post(
    "/mock/offline-schedules",
    response_model=OfflineMockScheduleRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_admin_offline_mock_schedule(
    payload: AdminOfflineMockScheduleUpsert,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> OfflineMockScheduleRead:
    _validate_publish_state(payload)
    schedule = OfflineMockSchedule(**payload.model_dump())
    session.add(schedule)
    await session.flush()
    await _audit_schedule_change(session, current_admin, "mock.schedule.create", schedule)
    await session.commit()
    await session.refresh(schedule)
    return _schedule_read(schedule, 0)


@router.patch("/mock/offline-schedules/{schedule_id}", response_model=OfflineMockScheduleRead)
async def update_admin_offline_mock_schedule(
    schedule_id: UUID,
    payload: AdminOfflineMockScheduleUpsert,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> OfflineMockScheduleRead:
    schedule = await session.scalar(
        select(OfflineMockSchedule)
        .where(OfflineMockSchedule.id == schedule_id)
        .with_for_update()
    )
    if schedule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mock session was not found.")
    _validate_publish_state(payload)

    reserved_count = int(
        await session.scalar(
            select(func.count(OfflineMockBooking.id)).where(
                OfflineMockBooking.schedule_id == schedule.id
            )
        )
        or 0
    )
    if payload.capacity < reserved_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Capacity cannot be lower than existing reservations.",
        )

    for field, value in payload.model_dump().items():
        if field == "address" and field not in payload.model_fields_set:
            continue
        setattr(schedule, field, value)
    await _audit_schedule_change(session, current_admin, "mock.schedule.update", schedule)
    await session.commit()
    await session.refresh(schedule)
    return _schedule_read(schedule, reserved_count)
