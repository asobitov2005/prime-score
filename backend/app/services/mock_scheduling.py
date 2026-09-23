from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mock import OfflineMockBooking


async def count_bookings_by_schedule(
    session: AsyncSession,
    schedule_ids: list[UUID],
) -> dict[UUID, int]:
    if not schedule_ids:
        return {}

    rows = (
        await session.execute(
            select(OfflineMockBooking.schedule_id, func.count(OfflineMockBooking.id))
            .where(OfflineMockBooking.schedule_id.in_(schedule_ids))
            .group_by(OfflineMockBooking.schedule_id)
        )
    ).all()
    return {schedule_id: int(count) for schedule_id, count in rows}
