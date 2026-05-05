from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from random import Random
from threading import Lock
from zoneinfo import ZoneInfo

from app.core.config import get_settings

_CACHE_TTL_SECONDS = 75
_HOURLY_RANGES: tuple[tuple[int, int], ...] = (
    (90, 170),
    (80, 150),
    (70, 130),
    (60, 120),
    (50, 100),
    (60, 110),
    (90, 170),
    (130, 260),
    (220, 420),
    (320, 560),
    (420, 720),
    (520, 820),
    (620, 920),
    (700, 980),
    (680, 960),
    (620, 900),
    (520, 780),
    (430, 650),
    (320, 520),
    (220, 400),
    (160, 320),
    (120, 250),
    (90, 190),
    (80, 160),
)


@dataclass(slots=True)
class LandingLiveSnapshot:
    online_count: int
    refreshed_at: datetime


@dataclass(slots=True)
class _CachedLandingLiveSnapshot:
    bucket_key: int
    snapshot: LandingLiveSnapshot


class LandingLiveMetricsService:
    def __init__(self) -> None:
        settings = get_settings()
        self._timezone = ZoneInfo(settings.timezone)
        self._lock = Lock()
        self._cache: _CachedLandingLiveSnapshot | None = None

    def get_snapshot(self, now: datetime | None = None) -> LandingLiveSnapshot:
        local_now = (now or datetime.now(self._timezone)).astimezone(self._timezone)
        bucket_key = int(local_now.timestamp() // _CACHE_TTL_SECONDS)

        with self._lock:
            if self._cache and self._cache.bucket_key == bucket_key:
                return self._cache.snapshot

            snapshot = LandingLiveSnapshot(
                online_count=self._resolve_online_count(local_now),
                refreshed_at=datetime.fromtimestamp(bucket_key * _CACHE_TTL_SECONDS, tz=self._timezone),
            )
            self._cache = _CachedLandingLiveSnapshot(bucket_key=bucket_key, snapshot=snapshot)
            return snapshot

    def _resolve_online_count(self, local_now: datetime) -> int:
        day_profile = self._build_day_profile(local_now.date())
        hour = local_now.hour
        current_anchor = day_profile[hour]

        next_date = local_now.date()
        next_hour = hour + 1
        if next_hour >= 24:
            next_hour = 0
            next_date = local_now.date() + timedelta(days=1)

        next_anchor = self._build_day_profile(next_date)[next_hour]
        hour_progress = (
            local_now.minute * 60
            + local_now.second
            + local_now.microsecond / 1_000_000
        ) / 3600
        eased_progress = hour_progress * hour_progress * (3 - 2 * hour_progress)
        interpolated = current_anchor + (next_anchor - current_anchor) * eased_progress
        return max(48, int(round(interpolated)))

    def _build_day_profile(self, target_day: date) -> list[int]:
        rng = Random(f"landing-live:{target_day.isoformat()}")
        anchors: list[int] = []

        for hour, (low, high) in enumerate(_HOURLY_RANGES):
            if not anchors:
                anchors.append(rng.randint(low, high))
                continue

            previous = anchors[-1]
            raw_target = rng.randint(low, high)
            blended = round(previous * 0.72 + raw_target * 0.28)
            max_delta = 55 if hour < 7 or hour >= 21 else 95
            constrained = max(previous - max_delta, min(previous + max_delta, blended))
            anchors.append(max(low, min(high, constrained)))

        return anchors


landing_live_metrics_service = LandingLiveMetricsService()
