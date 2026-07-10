from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.xp_dependencies import *
from app.services.xp_part_01 import TX_STREAK_MILESTONE, TX_TEST_COMPLETION, XPActivity, XPAwardResult, _enum_value, calculate_level
from app.services.xp_part_02 import _award_result_from_existing, _ensure_user, _existing_transactions_for_source, calculate_xp_for_activity
from app.services.xp_part_03 import _improvement_bonus_already_awarded, _register_meaningful_activity, create_xp_transaction
from app.services.xp_part_04 import _get_latest_writing_submission_for_skill, _writing_min_content_met

async def award_xp_for_writing_submission(
    session: AsyncSession,
    submission: WritingSubmission,
    evaluation: WritingEvaluation,
    task: WritingTask,
) -> XPAwardResult:
    user = await _ensure_user(session, submission.user_id)
    level_before = int(user.current_level or calculate_level(int(user.total_xp or 0)))
    occurred_at = submission.submitted_at or evaluation.graded_at or datetime.now(UTC)
    existing_rows = await _existing_transactions_for_source(
        session,
        user_id=submission.user_id,
        source_type="writing_submission",
        source_id=submission.id,
    )
    if existing_rows:
        return _award_result_from_existing(user=user, rows=existing_rows)
    content_ok = _writing_min_content_met(submission, task)
    duration_ok = int(submission.time_spent_seconds or 0) >= 600
    prior_same_task_count = (
        len(
            (
                await session.scalars(
                    select(WritingSubmission.id).where(
                        WritingSubmission.user_id == submission.user_id,
                        WritingSubmission.task_id == submission.task_id,
                        WritingSubmission.id != submission.id,
                        WritingSubmission.submitted_at < occurred_at,
                    )
                )
            ).all()
        )
        + 1
    )
    previous_pair = await _get_latest_writing_submission_for_skill(
        session,
        user_id=submission.user_id,
        task_type=submission.task_type,
        exclude_submission_id=submission.id,
        before=occurred_at,
    )
    previous_score = float(previous_pair[1].overall_band) if previous_pair else None
    current_streak = int(user.current_streak or 0)
    best_streak = int(user.best_streak or 0)
    if duration_ok and content_ok:
        daily_streak_bonus, milestone_bonus, current_streak, best_streak = await _register_meaningful_activity(
            session,
            user_id=submission.user_id,
            occurred_at=occurred_at,
        )
    else:
        daily_streak_bonus, milestone_bonus = 0, 0
    improvement_allowed = not await _improvement_bonus_already_awarded(
        session,
        user_id=submission.user_id,
        occurred_at=occurred_at,
        skill_key=_enum_value(submission.task_type),
    )
    suspicious = bool(previous_pair and previous_pair[0].essay_hash == submission.essay_hash)
    activity = XPActivity(
        user_id=submission.user_id,
        activity_type="writing_submission",
        source_type="writing_submission",
        source_id=submission.id,
        skill_key=_enum_value(submission.task_type),
        test_type="writing",
        score=float(evaluation.overall_band),
        accuracy=None,
        duration_seconds=int(submission.time_spent_seconds or 0),
        repeat_ordinal=prior_same_task_count,
        previous_score=previous_score,
        improvement_bonus_allowed=improvement_allowed,
        streak_bonus=daily_streak_bonus,
        streak_milestone_bonus=milestone_bonus,
        minimum_duration_met=duration_ok,
        minimum_content_met=content_ok,
        flagged=suspicious,
        flag_reasons=["same_essay_hash"] if suspicious else [],
        metadata={
            "task_id": str(submission.task_id),
            "essay_hash": submission.essay_hash,
        },
    )
    calculation = calculate_xp_for_activity(activity)
    transactions: list[XPTransaction] = []
    for component in calculation.components:
        metadata = {
            **component.metadata,
            **activity.metadata,
            "flagged": activity.flagged,
            "flag_reasons": activity.flag_reasons,
            "repeat_ordinal": activity.repeat_ordinal,
            "repeat_multiplier": calculation.breakdown["repeat_multiplier"],
            "counts_toward_leaderboard": not activity.flagged,
            "track_score": component.transaction_type == TX_TEST_COMPLETION,
        }
        if component.transaction_type == TX_STREAK_MILESTONE and milestone_bonus > 0:
            metadata["milestone_days"] = current_streak
        transaction = await create_xp_transaction(
            session,
            user_id=submission.user_id,
            transaction_type=component.transaction_type,
            amount=component.amount,
            source_type="writing_submission",
            source_id=submission.id,
            metadata=metadata,
            occurred_at=occurred_at,
        )
        transactions.append(transaction)

    await session.flush()
    return XPAwardResult(
        total_awarded=sum(int(item.xp_amount or 0) for item in transactions),
        breakdown=calculation.breakdown,
        transactions=transactions,
        level_before=level_before,
        level_after=int(user.current_level or level_before),
        current_streak=current_streak,
        best_streak=best_streak,
    )

async def award_xp_for_speaking_session(
    session: AsyncSession,
    speaking_session: SpeakingSession,
    evaluation: SpeakingEvaluation,
    speaking_test: SpeakingTest | None = None,
) -> XPAwardResult:
    user = await _ensure_user(session, speaking_session.user_id)
    level_before = int(user.current_level or calculate_level(int(user.total_xp or 0)))
    prior_same_test_count = (
        len(
            (
                await session.scalars(
                    select(SpeakingSession.id).where(
                        SpeakingSession.user_id == speaking_session.user_id,
                        SpeakingSession.speaking_test_id == speaking_session.speaking_test_id,
                        SpeakingSession.id != speaking_session.id,
                        SpeakingSession.graded_at.is_not(None),
                    )
                )
            ).all()
        )
        + 1
    )
    improvement_allowed = not await _improvement_bonus_already_awarded(
        session,
        user_id=speaking_session.user_id,
        occurred_at=speaking_session.graded_at or speaking_session.ended_at or datetime.now(UTC),
        skill_key="speaking",
    )
    duration_seconds = 0
    if speaking_session.started_at and speaking_session.ended_at:
        duration_seconds = max(0, int((speaking_session.ended_at - speaking_session.started_at).total_seconds()))

    current_streak = int(user.current_streak or 0)
    best_streak = int(user.best_streak or 0)
    if duration_seconds >= 180:
        daily_streak_bonus, milestone_bonus, current_streak, best_streak = await _register_meaningful_activity(
            session,
            user_id=speaking_session.user_id,
            occurred_at=speaking_session.graded_at or speaking_session.ended_at or datetime.now(UTC),
        )
    else:
        daily_streak_bonus, milestone_bonus = 0, 0

    activity = XPActivity(
        user_id=speaking_session.user_id,
        activity_type="speaking_session",
        source_type="speaking_session",
        source_id=speaking_session.id,
        skill_key="speaking",
        test_type="speaking",
        score=float(evaluation.overall_band) if evaluation.overall_band is not None else None,
        duration_seconds=duration_seconds,
        repeat_ordinal=prior_same_test_count,
        previous_score=None,
        improvement_bonus_allowed=improvement_allowed,
        streak_bonus=daily_streak_bonus,
        streak_milestone_bonus=milestone_bonus,
        minimum_duration_met=duration_seconds >= 180,
        minimum_content_met=True,
        flagged=bool(evaluation.integrity_penalty_applied),
        flag_reasons=[str(evaluation.integrity_penalty_reason)] if evaluation.integrity_penalty_reason else [],
        metadata={
            "speaking_test_id": str(speaking_session.speaking_test_id),
            "speaking_test_title": getattr(speaking_test, "title", None),
        },
    )
    calculation = calculate_xp_for_activity(activity)
    transactions: list[XPTransaction] = []
    occurred_at = speaking_session.graded_at or speaking_session.ended_at or datetime.now(UTC)
    for component in calculation.components:
        metadata = {
            **component.metadata,
            **activity.metadata,
            "flagged": activity.flagged,
            "flag_reasons": activity.flag_reasons,
            "repeat_ordinal": activity.repeat_ordinal,
            "repeat_multiplier": calculation.breakdown["repeat_multiplier"],
            "counts_toward_leaderboard": not activity.flagged,
            "track_score": component.transaction_type == TX_TEST_COMPLETION,
        }
        if component.transaction_type == TX_STREAK_MILESTONE and milestone_bonus > 0:
            metadata["milestone_days"] = current_streak
        transaction = await create_xp_transaction(
            session,
            user_id=speaking_session.user_id,
            transaction_type=component.transaction_type,
            amount=component.amount,
            source_type="speaking_session",
            source_id=speaking_session.id,
            metadata=metadata,
            occurred_at=occurred_at,
        )
        transactions.append(transaction)

    await session.flush()
    return XPAwardResult(
        total_awarded=sum(int(item.xp_amount or 0) for item in transactions),
        breakdown=calculation.breakdown,
        transactions=transactions,
        level_before=level_before,
        level_after=int(user.current_level or level_before),
        current_streak=current_streak,
        best_streak=best_streak,
    )

async def list_user_xp_transactions(
    session: AsyncSession,
    *,
    user_id: UUID,
    limit: int = 50,
) -> list[XPTransaction]:
    rows = await session.scalars(
        select(XPTransaction)
        .where(XPTransaction.user_id == user_id)
        .order_by(XPTransaction.created_at.desc(), XPTransaction.updated_at.desc())
        .limit(limit)
    )
    return list(rows.all())
