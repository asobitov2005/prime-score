from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from pydantic import BaseModel
from sqlalchemy import select

from app.core.deps import get_current_user
from app.core.enums import AttemptStatus, TestScope, TestType
from app.db.session import get_db_session
from app.models.ops import Notification
from app.models.test import Test
from app.schemas.common import DebugPrincipal, MessageResponse
from app.schemas.me import (
    FavoriteTestRead,
    MeActivityPointRead,
    MeAttemptSummaryRead,
    MeBandProgressPointRead,
    MeDashboardAnalyticsRead,
    MeErrorDistributionItemRead,
    MePerformanceStudyTimeRead,
    MePerformanceTestCountBucketRead,
    MePerformanceSummaryRead,
    MeProfileRead,
    MeProfileUpdateRequest,
    MeQuestionTypeAnalysisItemRead,
    MeQuestionTypeComparisonItemRead,
    MeQuestionTypeComparisonRead,
    MeQuestionTypeComparisonTestRead,
    MeStatsRead,
)
from app.services.attempt_repo import iter_user_attempts_from_db
from app.services.runtime_store import iter_user_attempts

router = APIRouter()

READING_QUESTION_TYPE_LABELS = {
    "reading_mc_single": "Multiple Choice (Single)",
    "reading_mc_multiple": "Multiple Choice (Multiple)",
    "reading_true_false_not_given": "True / False / Not Given",
    "reading_yes_no_not_given": "Yes / No / Not Given",
    "reading_matching_information": "Matching Information",
    "reading_matching_headings": "Matching Headings",
    "reading_matching_features": "Matching Features",
    "reading_matching_sentence_endings": "Matching Sentence Endings",
    "reading_sentence_completion": "Sentence Completion",
    "reading_summary_completion_wordbank": "Summary Completion (Word Bank)",
    "reading_summary_completion_freetext": "Summary Completion (Free Text)",
    "reading_note_completion": "Note Completion",
    "reading_table_completion": "Table Completion",
    "reading_flowchart_completion": "Flow-chart Completion",
    "reading_diagram_labeling": "Diagram Labeling",
    "reading_short_answer": "Short Answer",
}

LISTENING_QUESTION_TYPE_LABELS = {
    "listening_mc_single": "Multiple Choice (Single)",
    "listening_mc_multiple": "Multiple Choice (Multiple)",
    "listening_matching": "Matching",
    "listening_plan_map_labeling": "Plan / Map Labeling",
    "listening_form_completion": "Form Completion",
    "listening_note_completion": "Note Completion",
    "listening_table_completion": "Table Completion",
    "listening_flowchart_completion": "Flow-chart Completion",
    "listening_summary_completion": "Summary Completion",
    "listening_sentence_completion": "Sentence Completion",
    "listening_short_answer": "Short Answer",
}


def _question_type_label(question_type: str, include_module_prefix: bool = False) -> str:
    if question_type in READING_QUESTION_TYPE_LABELS:
        label = READING_QUESTION_TYPE_LABELS[question_type]
        return f"Reading - {label}" if include_module_prefix else label
    if question_type in LISTENING_QUESTION_TYPE_LABELS:
        label = LISTENING_QUESTION_TYPE_LABELS[question_type]
        return f"Listening - {label}" if include_module_prefix else label
    cleaned = question_type.removeprefix("reading_").removeprefix("listening_").replace("_", " ")
    return cleaned.title()


def _question_type_catalog(test_type: TestType | None) -> list[tuple[str, str]]:
    if test_type == TestType.reading:
        return list(READING_QUESTION_TYPE_LABELS.items())
    if test_type == TestType.listening:
        return list(LISTENING_QUESTION_TYPE_LABELS.items())
    return [
        *((key, f"Reading - {label}") for key, label in READING_QUESTION_TYPE_LABELS.items()),
        *((key, f"Listening - {label}") for key, label in LISTENING_QUESTION_TYPE_LABELS.items()),
    ]


def _safe_accuracy(correct_count: int, worked_count: int) -> float:
    if worked_count <= 0:
        return 0.0
    return round((correct_count / worked_count) * 100, 1)


def _attempt_type_stats(attempt, include_module_prefix: bool = False) -> dict[str, dict[str, int]]:
    stats: dict[str, dict[str, int]] = {}
    for item in attempt.scoring_items or []:
        label = _question_type_label(str(item.get("question_type", "")), include_module_prefix=include_module_prefix)
        answer_value = item.get("answer_value")
        worked = 1 if answer_value is not None and str(answer_value).strip() else 0
        correct = 1 if worked and bool(item.get("is_correct")) else 0
        bucket = stats.setdefault(label, {"worked_count": 0, "correct_count": 0, "error_count": 0})
        bucket["worked_count"] += worked
        bucket["correct_count"] += correct
        bucket["error_count"] += max(0, worked - correct)
    return stats


def _build_progress_series(attempts) -> list[MeBandProgressPointRead]:
    grouped: dict[object, MeBandProgressPointRead] = {}
    scored_attempts = sorted(
        [attempt for attempt in attempts if attempt.band_score is not None],
        key=lambda attempt: attempt.completed_at or attempt.started_at,
    )

    for attempt in scored_attempts:
        occurred_at = attempt.completed_at or attempt.started_at
        key = occurred_at.date()
        point = grouped.setdefault(
            key,
            MeBandProgressPointRead(
                label=occurred_at.strftime("%d %b"),
                occurred_at=occurred_at,
                reading=None,
                listening=None,
            ),
        )
        point.occurred_at = occurred_at
        band_value = float(attempt.band_score)
        test_type = attempt.test_snapshot.get("test_type")
        if test_type == TestType.reading:
            point.reading = band_value
        elif test_type == TestType.listening:
            point.listening = band_value

    return sorted(grouped.values(), key=lambda item: item.occurred_at)


def _build_question_type_analysis(attempts, test_type: TestType | None) -> list[MeQuestionTypeAnalysisItemRead]:
    aggregate: dict[str, dict[str, int]] = {
        label: {"worked_count": 0, "correct_count": 0, "error_count": 0}
        for _, label in _question_type_catalog(test_type)
    }
    include_module_prefix = test_type is None
    for attempt in attempts:
        for label, values in _attempt_type_stats(attempt, include_module_prefix=include_module_prefix).items():
            bucket = aggregate.setdefault(label, {"worked_count": 0, "correct_count": 0, "error_count": 0})
            bucket["worked_count"] += values["worked_count"]
            bucket["correct_count"] += values["correct_count"]
            bucket["error_count"] += values["error_count"]

    items = [
        MeQuestionTypeAnalysisItemRead(
            label=label,
            worked_count=values["worked_count"],
            correct_count=values["correct_count"],
            accuracy=_safe_accuracy(values["correct_count"], values["worked_count"]),
            error_count=values["error_count"],
        )
        for label, values in aggregate.items()
    ]
    return sorted(items, key=lambda item: (-item.worked_count, item.label))


def _build_comparison(attempts, test_type: TestType | None) -> MeQuestionTypeComparisonRead:
    completed_attempts = sorted(
        attempts,
        key=lambda attempt: attempt.completed_at or attempt.started_at,
        reverse=True,
    )
    if len(completed_attempts) < 2:
        return MeQuestionTypeComparisonRead()

    attempts_for_comparison = list(reversed(completed_attempts[:4]))
    if len(attempts_for_comparison) < 2:
        return MeQuestionTypeComparisonRead()

    include_module_prefix = test_type is None
    attempt_stats = [_attempt_type_stats(attempt, include_module_prefix=include_module_prefix) for attempt in attempts_for_comparison]
    labels = [label for _, label in _question_type_catalog(test_type)]

    items = [
        MeQuestionTypeComparisonItemRead(
            label=label,
            accuracies=[
                (
                    _safe_accuracy(stats[label]["correct_count"], stats[label]["worked_count"])
                    if label in stats and stats[label]["worked_count"] > 0
                    else None
                )
                for stats in attempt_stats
            ],
        )
        for label in labels
    ]

    for item in items:
        previous_values = [value for value in item.accuracies[:-1] if value is not None]
        item.previous_accuracy = round(sum(previous_values) / len(previous_values), 1) if previous_values else None
        item.current_accuracy = item.accuracies[-1] if item.accuracies else None
        item.delta = (
            round(item.current_accuracy - item.previous_accuracy, 1)
            if item.current_accuracy is not None and item.previous_accuracy is not None
            else None
        )

    items.sort(
        key=lambda item: (
            -(abs(item.delta) if item.delta is not None else -1),
            item.label,
        )
    )

    current_attempt = attempts_for_comparison[-1]
    previous_attempt = attempts_for_comparison[-2]

    return MeQuestionTypeComparisonRead(
        previous_test_title=str(previous_attempt.test_snapshot.get("title", "Previous test")),
        previous_test_date=previous_attempt.completed_at or previous_attempt.started_at,
        current_test_title=str(current_attempt.test_snapshot.get("title", "Current test")),
        current_test_date=current_attempt.completed_at or current_attempt.started_at,
        tests=[
            MeQuestionTypeComparisonTestRead(
                test_title=str(attempt.test_snapshot.get("title", "Test")),
                test_date=attempt.completed_at or attempt.started_at,
            )
            for attempt in attempts_for_comparison
        ],
        items=items,
    )


def _build_error_distribution(analysis: list[MeQuestionTypeAnalysisItemRead]) -> list[MeErrorDistributionItemRead]:
    total_errors = sum(item.error_count for item in analysis)
    if total_errors <= 0:
        return []
    items = [
        MeErrorDistributionItemRead(
            label=item.label,
            error_count=item.error_count,
            share=round((item.error_count / total_errors) * 100, 1),
        )
        for item in analysis
        if item.error_count > 0
    ]
    return sorted(items, key=lambda item: (-item.error_count, item.label))


def _build_performance_summary(attempts) -> MePerformanceSummaryRead:
    reading = MePerformanceTestCountBucketRead()
    listening = MePerformanceTestCountBucketRead()
    study_time = MePerformanceStudyTimeRead()

    for attempt in attempts:
        test_type = attempt.test_snapshot.get("test_type")
        scope = attempt.test_snapshot.get("scope") or getattr(attempt, "scope", None)
        bucket = reading if test_type == TestType.reading else listening if test_type == TestType.listening else None
        if bucket is None:
            continue

        time_spent_sec = max(0, int(getattr(attempt, "time_spent_sec", 0) or 0))
        study_time.total_time_sec += time_spent_sec
        if test_type == TestType.reading:
            study_time.reading_time_sec += time_spent_sec
        elif test_type == TestType.listening:
            study_time.listening_time_sec += time_spent_sec

        if str(scope) == TestScope.full.value:
            bucket.full_count += 1
        else:
            sections = list(attempt.test_snapshot.get("sections") or [])
            section_number = 0
            if sections:
                try:
                    section_number = int(sections[0].get("section_number") or 0)
                except (TypeError, ValueError):
                    section_number = 0
            if section_number == 1:
                bucket.section_1_count += 1
            elif section_number == 2:
                bucket.section_2_count += 1
            elif section_number == 3:
                bucket.section_3_count += 1
            elif section_number == 4:
                bucket.section_4_count += 1

    return MePerformanceSummaryRead(study_time=study_time, reading=reading, listening=listening)


def _profile_from_principal(principal: DebugPrincipal) -> MeProfileRead:
    return MeProfileRead(
        id=principal.id,
        first_name=principal.first_name,
        last_name=principal.last_name,
        username=principal.username,
        role=principal.role,
        is_premium=principal.is_premium,
        show_on_leaderboard=principal.show_on_leaderboard,
        telegram_id=principal.telegram_id,
    )


@router.get("", response_model=MeProfileRead)
async def get_me(current_user: DebugPrincipal = Depends(get_current_user)) -> MeProfileRead:
    return _profile_from_principal(current_user)


@router.patch("", response_model=MeProfileRead)
async def update_me(
    payload: MeProfileUpdateRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
) -> MeProfileRead:
    data = _profile_from_principal(current_user).model_dump()
    updates = payload.model_dump(exclude_unset=True)
    data.update(updates)
    return MeProfileRead(**data)


async def _load_attempts(current_user: DebugPrincipal, session: AsyncSession):
    try:
        attempts = await iter_user_attempts_from_db(session, user_id=current_user.id)
        if attempts:
            return attempts
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass
    return iter_user_attempts(current_user.id)


def _filter_attempts_by_type(attempts, test_type: TestType | None):
    if test_type is None:
        return attempts
    return [
        attempt
        for attempt in attempts
        if attempt.test_snapshot.get("test_type") == test_type
    ]


@router.get("/stats", response_model=MeStatsRead)
async def get_stats(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeStatsRead:
    attempts = await _load_attempts(current_user, session)
    completed = [attempt for attempt in attempts if attempt.status == AttemptStatus.completed]
    banded = [attempt.band_score for attempt in completed if attempt.band_score is not None]
    reading_bands = [
        attempt.band_score
        for attempt in completed
        if attempt.band_score is not None and attempt.test_snapshot.get("test_type") == TestType.reading
    ]
    listening_bands = [
        attempt.band_score
        for attempt in completed
        if attempt.band_score is not None and attempt.test_snapshot.get("test_type") == TestType.listening
    ]
    average_band = (
        sum(banded, start=banded[0].__class__("0")) / len(banded)
        if banded
        else None
    )
    return MeStatsRead(
        attempts_total=len(attempts),
        average_band=average_band,
        reading_band=max(reading_bands) if reading_bands else None,
        listening_band=max(listening_bands) if listening_bands else None,
        leaderboard_rank=3 if current_user.show_on_leaderboard else None,
        active_sessions=2,
    )


@router.get("/activity", response_model=list[MeActivityPointRead])
async def get_activity(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[MeActivityPointRead]:
    attempts = await _load_attempts(current_user, session)
    grouped: dict[object, dict[str, int]] = {}
    for attempt in attempts:
        key = attempt.started_at.date()
        entry = grouped.setdefault(key, {"attempts_count": 0, "time_spent_sec": 0})
        entry["attempts_count"] += 1
        entry["time_spent_sec"] += attempt.time_spent_sec
    return [
        MeActivityPointRead(activity_date=activity_date, **values)
        for activity_date, values in sorted(grouped.items(), reverse=True)
    ]


@router.get("/attempts", response_model=list[MeAttemptSummaryRead])
async def get_attempts(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[MeAttemptSummaryRead]:
    attempts = await _load_attempts(current_user, session)
    test_ids = {attempt.test_id for attempt in attempts}
    source_by_test_id: dict[UUID, str] = {}
    if test_ids:
        rows = await session.execute(select(Test.id, Test.source).where(Test.id.in_(test_ids)))
        source_by_test_id = {
            test_id: str(source.value if hasattr(source, "value") else source)
            for test_id, source in rows.all()
        }
    items: list[MeAttemptSummaryRead] = []
    for attempt in attempts:
        snapshot = attempt.test_snapshot
        snapshot_source = snapshot.get("source")
        if snapshot_source is None and isinstance(snapshot.get("metadata"), dict):
            snapshot_source = snapshot["metadata"].get("source")
        items.append(
            MeAttemptSummaryRead(
                attempt_id=attempt.attempt_id,
                test_id=attempt.test_id,
                test_title=str(snapshot.get("title", "Untitled")),
                test_type=snapshot.get("test_type"),
                mode=attempt.mode,
                status=attempt.status,
                access_type=snapshot.get("access_type"),
                source=snapshot_source or source_by_test_id.get(attempt.test_id),
                raw_score=attempt.raw_score,
                band_score=attempt.band_score,
                time_spent_sec=max(0, int(getattr(attempt, "time_spent_sec", 0) or 0)),
                started_at=attempt.started_at,
                updated_at=getattr(attempt, "updated_at", None) or attempt.started_at,
            )
        )
    return items


@router.get("/analytics", response_model=MeDashboardAnalyticsRead)
async def get_dashboard_analytics(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    test_type: TestType | None = Query(default=None),
) -> MeDashboardAnalyticsRead:
    attempts = await _load_attempts(current_user, session)
    completed = [
        attempt
        for attempt in attempts
        if attempt.status in {AttemptStatus.completed, AttemptStatus.auto_submitted}
    ]
    completed = _filter_attempts_by_type(completed, test_type)
    analysis = _build_question_type_analysis(completed, test_type)
    return MeDashboardAnalyticsRead(
        performance_summary=_build_performance_summary(completed),
        question_type_analysis=analysis,
        comparison=_build_comparison(completed, test_type),
        error_distribution=_build_error_distribution(analysis),
        progress_series=_build_progress_series(completed),
    )


@router.get("/favorites", response_model=list[FavoriteTestRead])
async def get_favorites(current_user: DebugPrincipal = Depends(get_current_user)) -> list[FavoriteTestRead]:
    _ = current_user
    return []


@router.post("/favorites/{test_id}", response_model=MessageResponse)
async def add_favorite(test_id: UUID, current_user: DebugPrincipal = Depends(get_current_user)) -> MessageResponse:
    _ = (test_id, current_user)
    return MessageResponse(message="Favorite added.")


@router.delete("/favorites/{test_id}", response_model=MessageResponse)
async def remove_favorite(test_id: UUID, current_user: DebugPrincipal = Depends(get_current_user)) -> MessageResponse:
    _ = (test_id, current_user)
    return MessageResponse(message="Favorite removed.")


class NotificationRead(BaseModel):
    id: UUID
    type: str
    title: str
    body: str
    is_read: bool
    created_at: str


@router.get("/notifications", response_model=list[NotificationRead])
async def list_notifications(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[NotificationRead]:
    try:
        result = await session.scalars(
            select(Notification)
            .where(Notification.user_id == current_user.id)
            .order_by(Notification.created_at.desc())
            .limit(50)
        )
        notifications = list(result.all())
        return [
            NotificationRead(
                id=n.id,
                type=n.type.value if hasattr(n.type, "value") else str(n.type),
                title=n.title,
                body=n.body,
                is_read=n.is_read,
                created_at=n.created_at.isoformat() if n.created_at else "",
            )
            for n in notifications
        ]
    except Exception:
        return []


@router.patch("/notifications/{notification_id}/read", response_model=MessageResponse)
async def mark_notification_read(
    notification_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    n = await session.get(Notification, notification_id)
    if n and n.user_id == current_user.id:
        n.is_read = True
        await session.commit()
    return MessageResponse(message="Marked as read.")


@router.patch("/notifications/read-all", response_model=MessageResponse)
async def mark_all_read(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    result = await session.scalars(
        select(Notification).where(Notification.user_id == current_user.id, Notification.is_read == False)
    )
    for n in result.all():
        n.is_read = True
    await session.commit()
    return MessageResponse(message="All marked as read.")
