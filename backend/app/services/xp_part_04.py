from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.xp_dependencies import *
from app.services.xp_part_01 import FULL_MOCK_DAILY_CAP, TX_FULL_MOCK_COMPLETION, TX_STREAK_MILESTONE, TX_TEST_COMPLETION, XPActivity, XPAwardResult, _enum_value, calculate_level
from app.services.xp_part_02 import _award_result_from_existing, _ensure_user, _existing_transactions_for_source, calculate_xp_for_activity
from app.services.xp_part_03 import _get_latest_attempt_for_skill, _improvement_bonus_already_awarded, _register_meaningful_activity, create_xp_transaction

async def _get_latest_writing_submission_for_skill(
    session: AsyncSession,
    *,
    user_id: UUID,
    task_type: object,
    exclude_submission_id: UUID,
    before: datetime | None = None,
) -> tuple[WritingSubmission, WritingEvaluation] | None:
    filters = [
        WritingSubmission.user_id == user_id,
        WritingSubmission.id != exclude_submission_id,
        WritingSubmission.task_type == task_type,
    ]
    if before is not None:
        filters.append(WritingSubmission.submitted_at < before)
    rows = (
        await session.execute(
            select(WritingSubmission, WritingEvaluation)
            .join(WritingEvaluation, WritingEvaluation.submission_id == WritingSubmission.id)
            .where(*filters)
            .order_by(WritingSubmission.submitted_at.desc(), WritingSubmission.created_at.desc())
            .limit(1)
        )
    ).all()
    return rows[0] if rows else None

def _score_from_attempt(attempt: Attempt | None) -> float | None:
    if attempt is None:
        return None
    scope = _enum_value(getattr(attempt, "scope", None))
    if attempt.band_score is not None and scope == "full":
        return float(attempt.band_score)
    if attempt.raw_score is None:
        return None
    return float(band_for_raw_score(attempt.test_type, int(attempt.raw_score)))

def _accuracy_from_attempt(attempt: Attempt | None) -> float | None:
    if attempt is None or attempt.raw_score is None or not attempt.max_score:
        return None
    if int(attempt.max_score or 0) <= 0:
        return None
    return round((float(attempt.raw_score) / float(attempt.max_score)) * 100, 1)

def _attempt_answer_fingerprint(attempt: Attempt) -> str | None:
    items = (attempt.attempt_metadata or {}).get("scoring_items") or []
    if not isinstance(items, list) or not items:
        return None
    parts: list[str] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        parts.append(f"{item.get('question_id')}={str(item.get('answer_value') or '').strip()}")
    if not parts:
        return None
    return "|".join(parts)

def _attempt_min_duration_met(attempt: Attempt) -> bool:
    metadata = attempt.attempt_metadata or {}
    time_spent = int(metadata.get("time_spent_sec") or 0)
    time_limit = int(attempt.time_limit_seconds or 0)
    if _enum_value(attempt.test_type) == "reading":
        minimum = max(600, int(time_limit * 0.25) if time_limit else 600)
    else:
        minimum = max(480, int(time_limit * 0.25) if time_limit else 480)
    return time_spent >= minimum

async def award_xp_for_attempt(session: AsyncSession, attempt: Attempt) -> XPAwardResult:
    user = await _ensure_user(session, attempt.user_id)
    level_before = int(user.current_level or calculate_level(int(user.total_xp or 0)))
    occurred_at = attempt.submitted_at or datetime.now(UTC)
    existing_rows = await _existing_transactions_for_source(
        session,
        user_id=attempt.user_id,
        source_type="attempt",
        source_id=attempt.id,
    )
    if existing_rows:
        return _award_result_from_existing(user=user, rows=existing_rows)
    duration_ok = _attempt_min_duration_met(attempt)
    prior_same_test_count = (
        len(
            (
                await session.scalars(
                    select(Attempt.id).where(
                        Attempt.user_id == attempt.user_id,
                        Attempt.test_id == attempt.test_id,
                        Attempt.id != attempt.id,
                        Attempt.submitted_at.is_not(None),
                        Attempt.submitted_at < occurred_at,
                    )
                )
            ).all()
        )
        + 1
    )
    previous_attempt = await _get_latest_attempt_for_skill(
        session,
        user_id=attempt.user_id,
        test_type=attempt.test_type,
        exclude_attempt_id=attempt.id,
        before=occurred_at,
    )
    current_accuracy = _accuracy_from_attempt(attempt)
    previous_accuracy = _accuracy_from_attempt(previous_attempt)
    current_score = _score_from_attempt(attempt)
    previous_score = _score_from_attempt(previous_attempt)
    answer_fingerprint = _attempt_answer_fingerprint(attempt)
    suspicious = False
    if previous_attempt is not None and answer_fingerprint:
        suspicious = answer_fingerprint == _attempt_answer_fingerprint(previous_attempt)

    current_streak = int(user.current_streak or 0)
    best_streak = int(user.best_streak or 0)
    if duration_ok:
        daily_streak_bonus, milestone_bonus, current_streak, best_streak = await _register_meaningful_activity(
            session,
            user_id=attempt.user_id,
            occurred_at=occurred_at,
        )
    else:
        daily_streak_bonus, milestone_bonus = 0, 0
    if await _improvement_bonus_already_awarded(
        session,
        user_id=attempt.user_id,
        occurred_at=occurred_at,
        skill_key=_enum_value(attempt.test_type),
    ):
        improvement_allowed = False
    else:
        improvement_allowed = True

    activity = XPActivity(
        user_id=attempt.user_id,
        activity_type="attempt",
        source_type="attempt",
        source_id=attempt.id,
        skill_key=_enum_value(attempt.test_type),
        test_type=_enum_value(attempt.test_type),
        score=current_score,
        accuracy=current_accuracy,
        duration_seconds=int((attempt.attempt_metadata or {}).get("time_spent_sec") or 0),
        is_full_mock=bool((attempt.attempt_metadata or {}).get("is_full_mock")),
        repeat_ordinal=prior_same_test_count,
        previous_score=previous_score,
        previous_accuracy=previous_accuracy,
        improvement_bonus_allowed=improvement_allowed,
        streak_bonus=daily_streak_bonus,
        streak_milestone_bonus=milestone_bonus,
        minimum_duration_met=duration_ok,
        minimum_content_met=True,
        flagged=suspicious,
        flag_reasons=["same_answer_pattern"] if suspicious else [],
        metadata={
            "test_id": str(attempt.test_id),
            "answer_fingerprint": answer_fingerprint,
        },
    )
    calculation = calculate_xp_for_activity(activity)
    transactions: list[XPTransaction] = []
    daily_cap_override = FULL_MOCK_DAILY_CAP if activity.is_full_mock else None
    for component in calculation.components:
        metadata = {
            **component.metadata,
            **activity.metadata,
            "flagged": activity.flagged,
            "flag_reasons": activity.flag_reasons,
            "repeat_ordinal": activity.repeat_ordinal,
            "repeat_multiplier": calculation.breakdown["repeat_multiplier"],
            "elevates_daily_cap": activity.is_full_mock,
            "counts_toward_leaderboard": not activity.flagged,
            "track_score": component.transaction_type in {TX_TEST_COMPLETION, TX_FULL_MOCK_COMPLETION},
        }
        if component.transaction_type == TX_STREAK_MILESTONE and milestone_bonus > 0:
            metadata["milestone_days"] = current_streak
        transaction = await create_xp_transaction(
            session,
            user_id=attempt.user_id,
            transaction_type=component.transaction_type,
            amount=component.amount,
            source_type="attempt",
            source_id=attempt.id,
            metadata=metadata,
            occurred_at=occurred_at,
            daily_cap_override=daily_cap_override,
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

def _writing_min_content_met(submission: WritingSubmission, task: WritingTask) -> bool:
    minimum_words = max(100, int(task.word_minimum * 0.65))
    return int(submission.word_count or 0) >= minimum_words
