from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from threading import Lock

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

_CACHE_TTL_SECONDS = 75


@dataclass(slots=True)
class LandingUserStatsSnapshot:
    total_users: int
    refreshed_at: datetime


@dataclass(slots=True)
class _CachedLandingUserStatsSnapshot:
    bucket_key: int
    snapshot: LandingUserStatsSnapshot


class LandingLiveMetricsService:
    def __init__(self) -> None:
        self._lock = Lock()
        self._cache: _CachedLandingUserStatsSnapshot | None = None

    async def get_snapshot(self, session: AsyncSession, now: datetime | None = None) -> LandingUserStatsSnapshot:
        current_time = now or datetime.now(UTC)
        bucket_key = int(current_time.timestamp() // _CACHE_TTL_SECONDS)

        with self._lock:
            if self._cache and self._cache.bucket_key == bucket_key:
                return self._cache.snapshot

        total_users = await self._resolve_total_users(session)
        snapshot = LandingUserStatsSnapshot(
            total_users=total_users,
            refreshed_at=datetime.fromtimestamp(bucket_key * _CACHE_TTL_SECONDS, tz=UTC),
        )

        with self._lock:
            self._cache = _CachedLandingUserStatsSnapshot(bucket_key=bucket_key, snapshot=snapshot)
            return snapshot

    async def _resolve_total_users(self, session: AsyncSession) -> int:
        value = await session.scalar(
            select(func.count()).select_from(User).where(User.deleted_at.is_(None))
        )
        return int(value or 0)


landing_live_metrics_service = LandingLiveMetricsService()
