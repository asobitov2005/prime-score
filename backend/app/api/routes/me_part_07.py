from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.me_dependencies import *
from app.api.routes.me_part_01 import _count_answered_slots
from app.api.routes.me_part_05 import _load_attempts
from app.api.routes.me_part_06 import _activity_date_for_timezone, _effective_attempt_band_score
from app.core.config import get_settings
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

router = APIRouter()

@router.get("/attempts", response_model=list[MeAttemptSummaryRead])
async def get_attempts(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[MeAttemptSummaryRead]:
    attempts = await _load_attempts(current_user, session)
    test_ids = {attempt.test_id for attempt in attempts}
    attempt_ids = {attempt.attempt_id for attempt in attempts}
    
    source_by_test_id: dict[UUID, str] = {}
    format_by_test_id: dict[UUID, str] = {}
    if test_ids:
        rows = await session.execute(select(Test.id, Test.source, Test.format).where(Test.id.in_(test_ids)))
        for test_id, source, test_format in rows.all():
            source_by_test_id[test_id] = str(source.value if hasattr(source, "value") else source)
            format_by_test_id[test_id] = str(test_format.value if hasattr(test_format, "value") else test_format)
            
    violations_by_attempt_id: dict[UUID, int] = {}
    if attempt_ids:
        from app.models.attempt import AttemptEvent
        violation_events = await session.execute(
            select(AttemptEvent.attempt_id, func.count(AttemptEvent.id))
            .where(AttemptEvent.attempt_id.in_(attempt_ids))
            .where(AttemptEvent.event_type.in_(["violation_exit_fullscreen", "violation_tab_switch", "violation_window_blur", "violation_devtools"]))
            .group_by(AttemptEvent.attempt_id)
        )
        violations_by_attempt_id = {row[0]: row[1] for row in violation_events.all()}

    items: list[MeAttemptSummaryRead] = []
    for attempt in attempts:
        snapshot = attempt.test_snapshot
        snapshot_source = snapshot.get("source")
        if snapshot_source is None and isinstance(snapshot.get("metadata"), dict):
            snapshot_source = snapshot["metadata"].get("source")
        total_questions = max(0, int(getattr(attempt, "total_questions", 0) or 0))
        answered_count = _count_answered_slots(snapshot, getattr(attempt, "answers", None))
        progress_percent = round((answered_count / total_questions) * 100) if total_questions > 0 else 0
        items.append(
            MeAttemptSummaryRead(
                attempt_id=attempt.attempt_id,
                test_id=attempt.test_id,
                test_title=str(snapshot.get("title", "Untitled")),
                test_type=snapshot.get("test_type"),
                test_format=str(snapshot.get("format") or format_by_test_id.get(attempt.test_id) or "full"),
                mode=attempt.mode,
                status=attempt.status,
                access_type=snapshot.get("access_type"),
                source=snapshot_source or source_by_test_id.get(attempt.test_id),
                raw_score=attempt.raw_score,
                band_score=_effective_attempt_band_score(attempt),
                total_questions=total_questions,
                time_spent_sec=max(0, int(getattr(attempt, "time_spent_sec", 0) or 0)),
                answered_count=answered_count,
                progress_percent=max(0, min(progress_percent, 100)),
                time_limit_seconds=max(0, int(snapshot.get("time_limit_seconds", 0) or 0)),
                last_answered_question_number=(
                    int(attempt.metadata.get("last_answered_question_number"))
                    if attempt.metadata.get("last_answered_question_number") is not None
                    else None
                ),
                started_at=attempt.started_at,
                completed_at=getattr(attempt, "completed_at", None),
                updated_at=getattr(attempt, "updated_at", None) or attempt.started_at,
                violation_count=violations_by_attempt_id.get(attempt.attempt_id, 0),
            )
        )
    return items

def _build_accuracy_trend(attempts) -> list[MeAccuracyTrendPointRead]:
    scored = sorted(
        [
            a for a in attempts
            if (a.raw_score is not None and getattr(a, "total_questions", 0))
            or (
                (a.test_snapshot if isinstance(a.test_snapshot, dict) else {}).get("test_type") == TestType.speaking
                and _effective_attempt_band_score(a) is not None
            )
        ],
        key=lambda a: a.completed_at or a.started_at,
    )
    items: list[MeAccuracyTrendPointRead] = []
    for attempt in scored[-20:]:
        band_score = _effective_attempt_band_score(attempt)
        if attempt.raw_score is not None and getattr(attempt, "total_questions", 0):
            total_q = max(1, int(getattr(attempt, "total_questions", 0) or 1))
            accuracy = round((int(attempt.raw_score) / total_q) * 100, 1)
        elif band_score is not None:
            accuracy = round((float(band_score) / 9.0) * 100, 1)
        else:
            continue
        occurred = attempt.completed_at or attempt.started_at
        items.append(MeAccuracyTrendPointRead(
            date=occurred.strftime("%d %b"),
            accuracy=accuracy,
            band=float(band_score) if band_score is not None else None,
            test_type=attempt.test_snapshot.get("test_type"),
        ))
    return items

def _build_weekly_activity(attempts, now: datetime | None = None) -> list[MeWeeklyActivityPointRead]:
    timezone_name = get_settings().timezone
    try:
        timezone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        timezone = UTC
    current_date = (now or datetime.now(UTC)).astimezone(timezone).date()
    current_week_start = current_date - timedelta(days=current_date.weekday())
    attempt_dates = [
        (attempt, _activity_date_for_timezone(attempt.started_at, timezone_name))
        for attempt in attempts
        if attempt.started_at
    ]
    items: list[MeWeeklyActivityPointRead] = []
    for week_offset in range(11, -1, -1):
        week_start = current_week_start - timedelta(weeks=week_offset)
        week_end = week_start + timedelta(days=7)
        week_attempts = [(attempt, attempt_date) for attempt, attempt_date in attempt_dates if week_start <= attempt_date < week_end]
        total_time = sum(max(0, int(getattr(a, "time_spent_sec", 0) or 0)) for a, _ in week_attempts)
        label = week_start.strftime("%d %b")
        items.append(MeWeeklyActivityPointRead(
            week_label=label,
            attempts_count=len(week_attempts),
            time_spent_min=total_time // 60,
        ))
    return items

def _build_score_distribution(attempts) -> MeScoreDistributionRead:
    dist = MeScoreDistributionRead()
    for attempt in attempts:
        band = _effective_attempt_band_score(attempt)
        if band is None:
            continue
        b = float(band)
        if b < 3.5:
            dist.band_1_to_3 += 1
        elif b < 5.0:
            dist.band_3_5_to_5 += 1
        elif b < 6.5:
            dist.band_5_to_6_5 += 1
        elif b < 7.5:
            dist.band_6_5_to_7_5 += 1
        else:
            dist.band_7_5_to_9 += 1
    return dist

def _build_personal_bests(
    all_attempts,
    completed_attempts,
    now: datetime | None = None,
) -> MePersonalBestsRead:
    bands = [
        float(band)
        for attempt in completed_attempts
        if (band := _effective_attempt_band_score(attempt)) is not None
    ]
    accuracies = [
        round((int(a.raw_score) / max(1, int(getattr(a, "total_questions", 0) or 1))) * 100, 1)
        for a in completed_attempts if a.raw_score is not None
    ]

    # Streak calculation
    timezone_name = get_settings().timezone
    dates_set: set[date] = set()
    for a in all_attempts:
        if a.started_at:
            dates_set.add(_activity_date_for_timezone(a.started_at, timezone_name))

    try:
        timezone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        timezone = UTC
    today = (now or datetime.now(UTC)).astimezone(timezone).date()
    current_streak = 0
    longest_streak = 0
    streak = 0
    check_date = today if today in dates_set else today - timedelta(days=1)
    while True:
        if check_date in dates_set:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break
    current_streak = streak

    # Longest streak from all dates
    if dates_set:
        sorted_dates = sorted(dates_set)
        streak = 1
        for i in range(1, len(sorted_dates)):
            prev = sorted_dates[i - 1]
            curr = sorted_dates[i]
            if (curr - prev).days == 1:
                streak += 1
            else:
                longest_streak = max(longest_streak, streak)
                streak = 1
        longest_streak = max(longest_streak, streak)

    # Fastest full test
    full_times = [
        int(getattr(a, "time_spent_sec", 0) or 0)
        for a in completed_attempts
        if (a.test_snapshot.get("scope") or "") == "full" and int(getattr(a, "time_spent_sec", 0) or 0) > 0
    ]

    return MePersonalBestsRead(
        best_band=max(bands) if bands else None,
        best_accuracy=max(accuracies) if accuracies else None,
        longest_streak=longest_streak,
        current_streak=current_streak,
        fastest_full_test_sec=min(full_times) if full_times else None,
    )

def _build_speed_metrics(completed_attempts) -> MeSpeedMetricsRead:
    reading_times: list[float] = []
    listening_times: list[float] = []
    all_times: list[float] = []

    for a in completed_attempts:
        time_sec = max(0, int(getattr(a, "time_spent_sec", 0) or 0))
        total_q = int(getattr(a, "total_questions", 0) or 0)
        if time_sec <= 0 or total_q <= 0:
            continue
        tpq = time_sec / total_q
        all_times.append(tpq)
        test_type = a.test_snapshot.get("test_type")
        if test_type == TestType.reading:
            reading_times.append(tpq)
        elif test_type == TestType.listening:
            listening_times.append(tpq)

    return MeSpeedMetricsRead(
        avg_time_per_question_sec=round(sum(all_times) / len(all_times), 1) if all_times else None,
        reading_avg_sec_per_question=round(sum(reading_times) / len(reading_times), 1) if reading_times else None,
        listening_avg_sec_per_question=round(sum(listening_times) / len(listening_times), 1) if listening_times else None,
    )

def _build_improvement_rate(completed_attempts) -> MeImprovementRateRead:
    banded = sorted(
        [a for a in completed_attempts if _effective_attempt_band_score(a) is not None],
        key=lambda a: a.completed_at or a.started_at,
    )
    if len(banded) < 2:
        return MeImprovementRateRead()

    last_5 = banded[-5:]
    prev_start = max(0, len(banded) - 10)
    prev_end = max(0, len(banded) - 5)
    prev_5 = banded[prev_start:prev_end] if prev_end > prev_start else []

    last_avg = sum(float(_effective_attempt_band_score(a) or 0) for a in last_5) / len(last_5)
    if not prev_5:
        return MeImprovementRateRead(last_5_avg_band=round(last_avg, 2))

    prev_avg = sum(float(_effective_attempt_band_score(a) or 0) for a in prev_5) / len(prev_5)
    delta = round(last_avg - prev_avg, 2)
    pct = round((delta / prev_avg) * 100, 1) if prev_avg > 0 else 0.0

    return MeImprovementRateRead(
        last_5_avg_band=round(last_avg, 2),
        prev_5_avg_band=round(prev_avg, 2),
        delta=delta,
        percent_change=pct,
    )
