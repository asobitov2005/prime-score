from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db_session
from app.models.mock import OfflineMockBooking, OfflineMockSchedule
from app.schemas.common import DebugPrincipal
from app.schemas.mock_scheduling import (
    OfflineMockBookingCreate,
    OfflineMockBookingListRead,
    OfflineMockBookingRead,
    OfflineMockScheduleListRead,
    OfflineMockScheduleRead,
    validate_schedule_range,
)
from app.services.mock_scheduling import count_bookings_by_schedule

router = APIRouter()


def _booking_read(booking: OfflineMockBooking, schedule: OfflineMockSchedule) -> OfflineMockBookingRead:
    return OfflineMockBookingRead(
        id=booking.id,
        schedule_id=schedule.id,
        title=schedule.title,
        starts_at=schedule.starts_at,
        duration_minutes=schedule.duration_minutes,
        location=schedule.location,
        price_amount=schedule.price_amount,
        payment_method="click",
        payment_confirmation="manual",
    )


@router.get("/offline-schedules", response_model=OfflineMockScheduleListRead)
async def list_public_offline_schedules(
    from_at: datetime = Query(alias="from"),
    to_at: datetime = Query(alias="to"),
    session: AsyncSession = Depends(get_db_session),
) -> OfflineMockScheduleListRead:
    try:
        validate_schedule_range(from_at, to_at)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    now = datetime.now(UTC)
    schedules = list(
        (
            await session.scalars(
                select(OfflineMockSchedule)
                .where(
                    OfflineMockSchedule.is_published.is_(True),
                    OfflineMockSchedule.starts_at >= from_at,
                    OfflineMockSchedule.starts_at < to_at,
                    OfflineMockSchedule.starts_at > now,
                )
                .order_by(OfflineMockSchedule.starts_at.asc())
            )
        ).all()
    )
    if not schedules:
        return OfflineMockScheduleListRead(items=[])

    reserved_counts = await count_bookings_by_schedule(
        session,
        [item.id for item in schedules],
    )
    available = []
    for schedule in schedules:
        reserved_count = reserved_counts.get(schedule.id, 0)
        available_seats = max(0, schedule.capacity - reserved_count)
        if available_seats:
            available.append(
                OfflineMockScheduleRead(
                    id=schedule.id,
                    title=schedule.title,
                    starts_at=schedule.starts_at,
                    duration_minutes=schedule.duration_minutes,
                    location=schedule.location,
                    capacity=schedule.capacity,
                    reserved_count=reserved_count,
                    available_seats=available_seats,
                    price_amount=schedule.price_amount,
                    is_published=schedule.is_published,
                )
            )
    return OfflineMockScheduleListRead(items=available)


@router.get("/bookings/me", response_model=OfflineMockBookingListRead)
async def list_my_offline_mock_bookings(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> OfflineMockBookingListRead:
    rows = (
        await session.execute(
            select(OfflineMockBooking, OfflineMockSchedule)
            .join(OfflineMockSchedule, OfflineMockSchedule.id == OfflineMockBooking.schedule_id)
            .where(
                OfflineMockBooking.user_id == current_user.id,
                OfflineMockSchedule.starts_at > datetime.now(UTC),
            )
            .order_by(OfflineMockSchedule.starts_at.asc())
            .limit(1)
        )
    ).all()
    return OfflineMockBookingListRead(
        items=[_booking_read(booking, schedule) for booking, schedule in rows]
    )


@router.post(
    "/bookings",
    response_model=OfflineMockBookingRead,
    status_code=status.HTTP_201_CREATED,
)
async def reserve_offline_mock_schedule(
    payload: OfflineMockBookingCreate,
    response: Response,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> OfflineMockBookingRead:
    schedule = await session.scalar(
        select(OfflineMockSchedule)
        .where(OfflineMockSchedule.id == payload.schedule_id)
        .with_for_update()
    )
    if schedule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mock session was not found.")

    existing = await session.scalar(
        select(OfflineMockBooking).where(
            OfflineMockBooking.user_id == current_user.id,
            OfflineMockBooking.schedule_id == schedule.id,
        )
    )
    if existing is not None:
        response.status_code = status.HTTP_200_OK
        return _booking_read(existing, schedule)

    if not schedule.is_published:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mock session was not found.")
    if schedule.starts_at <= datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This mock session has already started.")

    reserved_count = int(
        await session.scalar(
            select(func.count(OfflineMockBooking.id)).where(
                OfflineMockBooking.schedule_id == schedule.id
            )
        )
        or 0
    )
    if reserved_count >= schedule.capacity:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This mock session is full.")

    booking = OfflineMockBooking(user_id=current_user.id, schedule_id=schedule.id)
    session.add(booking)
    await session.commit()
    await session.refresh(booking)
    return _booking_read(booking, schedule)
