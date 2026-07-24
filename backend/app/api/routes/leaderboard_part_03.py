from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.leaderboard_dependencies import *
from app.api.routes.leaderboard_part_01 import _attempt_accuracy, _attempt_type, _badge_image, _badge_rarity, _badge_tagline, _build_achievement_catalog, _display_name, _table_exists, _unlocked_achievements_from_catalog
from app.api.routes.leaderboard_part_02 import _cached_board_entries

router = APIRouter()

@router.get("/users/{user_id}", response_model=LeaderboardUserProfileRead)
async def get_leaderboard_user_profile(
    user_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> LeaderboardUserProfileRead:
    user = await session.get(User, user_id)
    if user is None or user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.id != current_user.id and not bool(user.show_on_leaderboard):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    all_entries = await _cached_board_entries(session, period_type=PERIOD_ALL_TIME)
    rank = next((entry.rank for entry in all_entries if entry.user_id == user.id), 0)
    leaderboard_size = len(all_entries)
    weekly_entries = await _cached_board_entries(session, period_type=PERIOD_WEEKLY)
    weekly_rank = next((entry.rank for entry in weekly_entries if entry.user_id == user.id), None)

    completed_statuses = {AttemptStatus.COMPLETED, AttemptStatus.AUTO_SUBMITTED}
    attempts = list(
        (
            await session.scalars(
                select(Attempt)
                .where(Attempt.user_id == user.id, Attempt.status.in_(completed_statuses))
                .order_by(Attempt.submitted_at.desc().nullslast(), Attempt.created_at.desc())
            )
        ).all()
    )
    writing_submissions = list(
        (
            await session.scalars(
                select(WritingSubmission)
                .where(WritingSubmission.user_id == user.id)
                .order_by(WritingSubmission.submitted_at.desc(), WritingSubmission.created_at.desc())
            )
        ).all()
    ) if await _table_exists(session, WritingSubmission.__tablename__) else []
    writing_submission_ids = [submission.id for submission in writing_submissions]
    writing_evaluations = list(
        (
            await session.scalars(
                select(WritingEvaluation)
                .where(WritingEvaluation.submission_id.in_(writing_submission_ids))
            )
        ).all()
    ) if writing_submission_ids and await _table_exists(session, WritingEvaluation.__tablename__) else []
    speaking_sessions = list(
        (
            await session.scalars(
                select(SpeakingSession)
                .where(SpeakingSession.user_id == user.id, SpeakingSession.graded_at.is_not(None))
                .order_by(SpeakingSession.graded_at.desc().nullslast(), SpeakingSession.created_at.desc())
            )
        ).all()
    ) if await _table_exists(session, SpeakingSession.__tablename__) else []

    total_time_seconds = sum(
        max(0, int((attempt.attempt_metadata or {}).get("time_spent_sec", 0) or 0))
        for attempt in attempts
    )
    scored_attempts = [attempt for attempt in attempts if attempt.band_score is not None]
    highest_band = max((float(attempt.band_score or 0) for attempt in scored_attempts), default=None)
    accuracy_values = [
        (int(attempt.raw_score or 0) / max(1, int(attempt.max_score or 0))) * 100
        for attempt in attempts
        if attempt.raw_score is not None and int(attempt.max_score or 0) > 0
    ]
    accuracy = round(sum(accuracy_values) / len(accuracy_values), 1) if accuracy_values else None
    total_mock_tests = sum(
        1
        for attempt in attempts
        if attempt.scope == AttemptScope.FULL or bool((attempt.attempt_metadata or {}).get("is_full_mock"))
    )
    reading_attempts = [attempt for attempt in attempts if _attempt_type(attempt) == "reading"]
    listening_attempts = [attempt for attempt in attempts if _attempt_type(attempt) == "listening"]
    reading_accuracies = [accuracy for attempt in reading_attempts if (accuracy := _attempt_accuracy(attempt)) is not None]
    reading_average_accuracy = round(sum(reading_accuracies) / len(reading_accuracies), 1) if reading_accuracies else None
    listening_perfect_score_reached = any(
        attempt.raw_score is not None
        and int(attempt.max_score or 0) >= 40
        and int(attempt.raw_score or 0) >= int(attempt.max_score or 0)
        for attempt in listening_attempts
    )
    listening_best_score = max((int(attempt.raw_score or 0) for attempt in listening_attempts if attempt.raw_score is not None), default=0)
    listening_best_target = max((int(attempt.max_score or 0) for attempt in listening_attempts), default=40 if listening_best_score > 0 else 0)
    writing_best_band = max((float(evaluation.overall_band or 0) for evaluation in writing_evaluations), default=0.0) or None
    full_mock_accuracies = [
        accuracy
        for attempt in attempts
        if attempt.scope == AttemptScope.FULL or bool((attempt.attempt_metadata or {}).get("is_full_mock"))
        if (accuracy := _attempt_accuracy(attempt)) is not None
    ]
    recent_full_mock_accuracies = full_mock_accuracies[-5:]
    recent_full_mock_accuracy = (
        round(sum(recent_full_mock_accuracies) / len(recent_full_mock_accuracies), 1)
        if recent_full_mock_accuracies
        else None
    )
    activity_timestamps = [
        attempt.created_at
        for attempt in attempts
        if attempt.created_at is not None
    ] + [
        submission.submitted_at
        for submission in writing_submissions
        if submission.submitted_at is not None
    ] + [
        speaking_session.graded_at
        for speaking_session in speaking_sessions
        if speaking_session.graded_at is not None
    ]
    weekend_day_count = len({timestamp.date() for timestamp in activity_timestamps if timestamp.weekday() in {5, 6}})
    early_session_count = sum(1 for timestamp in activity_timestamps if timestamp.astimezone(UTC).hour < 8)
    late_session_count = sum(1 for timestamp in activity_timestamps if timestamp.astimezone(UTC).hour >= 22)

    equipped_badge_title = badge_for_user(
        level=int(user.current_level or 1),
        current_streak=int(user.current_streak or 0),
        full_mock_completions=total_mock_tests,
    )
    equipped_badge = (
        LeaderboardUserBadgeRead(
            title=equipped_badge_title,
            rarity=_badge_rarity(equipped_badge_title),
            tagline=_badge_tagline(equipped_badge_title),
            image=_badge_image(equipped_badge_title),
        )
        if equipped_badge_title
        else None
    )
    achievement_catalog = _build_achievement_catalog(
        user=user,
        reading_attempt_count=len(reading_attempts),
        reading_average_accuracy=reading_average_accuracy,
        listening_perfect_score_reached=listening_perfect_score_reached,
        listening_best_score=listening_best_score,
        listening_best_target=listening_best_target,
        writing_submission_count=len(writing_submissions),
        writing_best_band=writing_best_band,
        speaking_completed_count=len(speaking_sessions),
        recent_full_mock_accuracy=recent_full_mock_accuracy,
        recent_full_mock_count=len(recent_full_mock_accuracies),
        full_mock_completions=total_mock_tests,
        weekend_day_count=weekend_day_count,
        early_session_count=early_session_count,
        late_session_count=late_session_count,
        rank=rank,
        weekly_rank=weekly_rank,
        leaderboard_size=leaderboard_size,
    )
    achievements = _unlocked_achievements_from_catalog(achievement_catalog)

    return LeaderboardUserProfileRead(
        user_id=user.id,
        avatar_url=user.avatar_url,
        display_name=_display_name(user),
        level=int(user.current_level or 1),
        total_xp=int(user.total_xp or 0),
        rank=rank,
        is_online=bool(user.last_active_at and user.last_active_at >= datetime.now(UTC) - timedelta(minutes=5)),
        is_premium=bool(user.is_premium),
        current_streak=int(user.current_streak or 0),
        equipped_badge=equipped_badge,
        active_titles=[equipped_badge_title] if equipped_badge_title else [],
        stats=LeaderboardUserStatsRead(
            longest_streak=int(user.best_streak or user.current_streak or 0),
            highest_band=round(highest_band, 1) if highest_band is not None else None,
            total_mock_tests=total_mock_tests,
            total_study_hours=total_time_seconds // 3600,
            accuracy=accuracy,
            achievements_unlocked=len(achievements),
        ),
        achievements=achievements,
        achievement_catalog=achievement_catalog,
    )
