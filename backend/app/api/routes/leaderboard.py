from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from math import erf, sqrt
from statistics import fmean, pstdev

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_async_session
from app.models.attempt import Attempt
from app.models.user import User
from app.schemas.common import DebugPrincipal
from app.schemas.leaderboard import LeaderboardEntryRead, LeaderboardResponse
from app.core.enums import AttemptStatus, TestType

router = APIRouter()

LEADERBOARD_TYPES = {"combined", TestType.reading.value, TestType.listening.value}
LEADERBOARD_PERIODS = {"week", "month", "all_time"}


@dataclass(slots=True)
class _UserAggregate:
    user_id: object
    display_name: str
    show_on_leaderboard: bool
    reading_scores: list[float] = field(default_factory=list)
    listening_scores: list[float] = field(default_factory=list)
    reading_bands: list[float] = field(default_factory=list)
    listening_bands: list[float] = field(default_factory=list)
    relevant_accuracies: list[float] = field(default_factory=list)
    relevant_attempts: int = 0
    total_time_sec: int = 0
    last_active_at: datetime | None = None


def _normal_cdf(value: float) -> float:
    return 0.5 * (1.0 + erf(value / sqrt(2.0)))


def _display_name(user: User) -> str:
    full_name = " ".join(part for part in [user.first_name, user.last_name] if part).strip()
    if full_name:
        return full_name
    if user.username:
        return user.username
    return "Anonymous Candidate"


def _period_cutoff(period: str) -> datetime | None:
    now = datetime.now(UTC)
    if period == "week":
        return now - timedelta(days=7)
    if period == "month":
        return now - timedelta(days=30)
    return None


def _round_to_half(value: float | None) -> float | None:
    if value is None:
        return None
    return round(value * 2) / 2


def _percentile_from_band(band: float | None, accuracy_percent: float | None) -> float:
    if band is None:
        if accuracy_percent is None:
            return 0.0
        return max(1.0, min(99.0, accuracy_percent))

    lookup = [
        (9.0, 99.0),
        (8.5, 97.0),
        (8.0, 95.0),
        (7.5, 90.0),
        (7.0, 84.0),
        (6.5, 76.0),
        (6.0, 68.0),
        (5.5, 58.0),
        (5.0, 48.0),
        (4.5, 38.0),
        (4.0, 28.0),
        (3.5, 20.0),
        (3.0, 14.0),
        (2.5, 9.0),
        (2.0, 5.0),
        (1.5, 3.0),
        (1.0, 1.0),
    ]
    closest = min(lookup, key=lambda item: abs(item[0] - band))
    return closest[1]


def _build_entry(
    *,
    aggregate: _UserAggregate,
    test_type: str,
    rank: int,
    percentile: float,
    estimated_band_score: float | None,
    reading_score: float | None,
    listening_score: float | None,
    is_current_user: bool,
) -> LeaderboardEntryRead:
    avg_accuracy = fmean(aggregate.relevant_accuracies) if aggregate.relevant_accuracies else None
    return LeaderboardEntryRead(
        rank=rank,
        user_id=aggregate.user_id,
        display_name=aggregate.display_name,
        test_type=test_type,
        percentile=round(percentile, 1),
        estimated_band_score=_round_to_half(estimated_band_score),
        reading_score=round(reading_score, 1) if reading_score is not None else None,
        listening_score=round(listening_score, 1) if listening_score is not None else None,
        total_tests_attempted=aggregate.relevant_attempts,
        avg_accuracy=round(avg_accuracy, 1) if avg_accuracy is not None else None,
        total_time_sec=aggregate.total_time_sec,
        last_active_at=aggregate.last_active_at,
        is_current_user=is_current_user,
        show_on_leaderboard=aggregate.show_on_leaderboard,
    )


@router.get("", response_model=LeaderboardResponse)
async def get_leaderboard(
    test_type: str = Query(default="combined", alias="type"),
    period: str = Query(default="all_time"),
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> LeaderboardResponse:
    if test_type not in LEADERBOARD_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported leaderboard type.")
    if period not in LEADERBOARD_PERIODS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported leaderboard period.")

    cutoff = _period_cutoff(period)
    stmt = (
        select(User, Attempt)
        .join(Attempt, Attempt.user_id == User.id)
        .where(
            User.deleted_at.is_(None),
            Attempt.status.in_([AttemptStatus.completed, AttemptStatus.auto_submitted]),
            Attempt.raw_score.is_not(None),
            Attempt.max_score.is_not(None),
            Attempt.max_score > 0,
        )
    )
    if cutoff is not None:
        stmt = stmt.where(Attempt.submitted_at.is_not(None), Attempt.submitted_at >= cutoff)

    rows = (await session.execute(stmt)).all()

    aggregates: dict[object, _UserAggregate] = {}
    for user, attempt in rows:
        aggregate = aggregates.setdefault(
            user.id,
            _UserAggregate(
                user_id=user.id,
                display_name=_display_name(user),
                show_on_leaderboard=user.show_on_leaderboard,
            ),
        )
        normalized_score = (float(attempt.raw_score) / float(attempt.max_score)) * 40.0
        accuracy_percent = (float(attempt.raw_score) / float(attempt.max_score)) * 100.0
        attempt_band = float(attempt.band_score) if attempt.band_score is not None else None
        attempt_active_at = attempt.submitted_at or attempt.updated_at or attempt.created_at

        if attempt.test_type == TestType.reading:
            aggregate.reading_scores.append(normalized_score)
            if attempt_band is not None:
                aggregate.reading_bands.append(attempt_band)
        elif attempt.test_type == TestType.listening:
            aggregate.listening_scores.append(normalized_score)
            if attempt_band is not None:
                aggregate.listening_bands.append(attempt_band)

        include_for_relevant_scope = (
            test_type == "combined"
            or (test_type == TestType.reading.value and attempt.test_type == TestType.reading)
            or (test_type == TestType.listening.value and attempt.test_type == TestType.listening)
        )
        if include_for_relevant_scope:
            aggregate.relevant_accuracies.append(accuracy_percent)
            aggregate.relevant_attempts += 1
            aggregate.total_time_sec += int((attempt.attempt_metadata or {}).get("time_spent_sec", 0) or 0)
            if attempt_active_at and (aggregate.last_active_at is None or attempt_active_at > aggregate.last_active_at):
                aggregate.last_active_at = attempt_active_at

    candidate_payloads: list[tuple[_UserAggregate, float, float | None, float | None, float | None]] = []

    if test_type == "combined":
        combined_aggregates = [
            aggregate
            for aggregate in aggregates.values()
            if aggregate.reading_scores and aggregate.listening_scores
        ]
        reading_means = [fmean(aggregate.reading_scores) for aggregate in combined_aggregates]
        listening_means = [fmean(aggregate.listening_scores) for aggregate in combined_aggregates]
        reading_mean = fmean(reading_means) if reading_means else 0.0
        listening_mean = fmean(listening_means) if listening_means else 0.0
        reading_std = pstdev(reading_means) if len(reading_means) > 1 else 0.0
        listening_std = pstdev(listening_means) if len(listening_means) > 1 else 0.0

        for aggregate in combined_aggregates:
            reading_score = fmean(aggregate.reading_scores)
            listening_score = fmean(aggregate.listening_scores)
            reading_z = (reading_score - reading_mean) / reading_std if reading_std > 0 else 0.0
            listening_z = (listening_score - listening_mean) / listening_std if listening_std > 0 else 0.0
            final_z = (0.6 * listening_z) + (0.4 * reading_z)
            percentile_value = _normal_cdf(final_z) * 100.0
            estimated_band = None
            if aggregate.reading_bands and aggregate.listening_bands:
                estimated_band = (0.6 * fmean(aggregate.listening_bands)) + (0.4 * fmean(aggregate.reading_bands))
            candidate_payloads.append((aggregate, percentile_value, estimated_band, reading_score, listening_score))
    else:
        target_type = TestType(test_type)
        relevant_aggregates = [
            aggregate
            for aggregate in aggregates.values()
            if (aggregate.reading_scores if target_type == TestType.reading else aggregate.listening_scores)
        ]
        scores = [
            fmean(aggregate.reading_scores if target_type == TestType.reading else aggregate.listening_scores)
            for aggregate in relevant_aggregates
        ]
        score_mean = fmean(scores) if scores else 0.0
        score_std = pstdev(scores) if len(scores) > 1 else 0.0
        for aggregate in relevant_aggregates:
            score_value = fmean(aggregate.reading_scores if target_type == TestType.reading else aggregate.listening_scores)
            z_score = (score_value - score_mean) / score_std if score_std > 0 else 0.0
            percentile_value = _normal_cdf(z_score) * 100.0
            estimated_band = (
                fmean(aggregate.reading_bands) if target_type == TestType.reading and aggregate.reading_bands
                else fmean(aggregate.listening_bands) if target_type == TestType.listening and aggregate.listening_bands
                else None
            )
            candidate_payloads.append((
                aggregate,
                percentile_value,
                estimated_band,
                score_value if target_type == TestType.reading else None,
                score_value if target_type == TestType.listening else None,
            ))

    candidate_payloads.sort(
        key=lambda item: (
            item[1],
            item[2] if item[2] is not None else -1.0,
            item[0].relevant_attempts,
            item[0].last_active_at.timestamp() if item[0].last_active_at else 0.0,
        ),
        reverse=True,
    )

    visible_items: list[LeaderboardEntryRead] = []
    current_user_entry: LeaderboardEntryRead | None = None
    for index, (aggregate, percentile_value, estimated_band, reading_score, listening_score) in enumerate(candidate_payloads, start=1):
        entry = _build_entry(
            aggregate=aggregate,
            test_type=test_type,
            rank=index,
            percentile=percentile_value,
            estimated_band_score=estimated_band,
            reading_score=reading_score,
            listening_score=listening_score,
            is_current_user=aggregate.user_id == current_user.id,
        )
        if aggregate.user_id == current_user.id:
            current_user_entry = entry
        if aggregate.show_on_leaderboard and aggregate.user_id != current_user.id:
            visible_items.append(entry)

    if current_user_entry is None and current_user.show_on_leaderboard:
        current_user_entry = LeaderboardEntryRead(
            rank=0,
            user_id=current_user.id,
            display_name="You",
            test_type=test_type,
            percentile=_percentile_from_band(None, None),
            estimated_band_score=None,
            reading_score=None,
            listening_score=None,
            total_tests_attempted=0,
            avg_accuracy=None,
            total_time_sec=0,
            last_active_at=None,
            is_current_user=True,
            show_on_leaderboard=current_user.show_on_leaderboard,
        )

    return LeaderboardResponse(
        test_type=test_type,
        period=period,
        generated_at=datetime.now(UTC),
        items=visible_items,
        current_user=current_user_entry,
    )
