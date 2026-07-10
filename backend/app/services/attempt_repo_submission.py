from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import TestScope, TestType
from app.models.attempt import Attempt, AttemptEvent
from app.models.enums import AttemptScope as ModelAttemptScope
from app.models.enums import AttemptStatus as ModelAttemptStatus
from app.models.user import User
from app.services.attempt_repo_runtime import load_answers, to_runtime
from app.services.attempt_repo_scoring import score_attempt_snapshot
from app.services.attempt_repo_support import (
    count_non_empty_answer_values,
    db_answer_key,
    normalize_section_time_spent_sec,
    normalized_attempt_time_spent,
    should_grant_premium_bonus,
    snapshot_answer_key,
    snapshot_questions,
    user_can_receive_full_test_premium_bonus,
)
from app.services.attempt_runtime import AttemptRuntime, _band_for_raw_score
from app.services.premium_bonus import grant_premium_bonus
from app.services.snapshots import freeze_test_snapshot
from app.services.xp import award_xp_for_attempt


async def submit_attempt_in_db(
    session: AsyncSession,
    *,
    attempt_id: UUID,
) -> AttemptRuntime:
    attempt = await session.get(Attempt, attempt_id)
    if attempt is None:
        raise KeyError("attempt_not_found")
    if attempt.status in {
        ModelAttemptStatus.COMPLETED,
        ModelAttemptStatus.AUTO_SUBMITTED,
    }:
        answers = await load_answers(session, attempt_id)
        return to_runtime(attempt, answers=answers)

    answers = await load_answers(session, attempt_id)
    answer_map = {
        str(answer.question_id): str(answer.value.get("value") or "")
        for answer in answers
    }
    snapshot = dict(attempt.test_snapshot or {})
    questions = snapshot_questions(snapshot)
    database_answer_key = await db_answer_key(
        session,
        [UUID(question_id) for question_id in questions],
    )
    scoring = score_attempt_snapshot(
        snapshot=snapshot,
        answer_map=answer_map,
        database_answer_key=database_answer_key,
        frozen_answer_key=snapshot_answer_key(snapshot),
    )

    now = datetime.now(timezone.utc)
    time_spent_sec = normalized_attempt_time_spent(
        saved_time_spent_sec=int(
            (attempt.attempt_metadata or {}).get("time_spent_sec", 0) or 0
        ),
        elapsed_fallback_sec=max(
            0,
            int((now - attempt.created_at).total_seconds()),
        ),
        mode=attempt.mode,
        time_limit_seconds=attempt.time_limit_seconds,
    )
    band_score = (
        _band_for_raw_score(
            TestType(str(snapshot["test_type"])),
            scoring.raw_score,
        )
        if TestScope(str(snapshot["scope"])) == TestScope.full
        else None
    )

    metadata = dict(attempt.attempt_metadata or {})
    metadata["answers_count"] = count_non_empty_answer_values(
        list(answer_map.values())
    )
    metadata["score_status"] = "ready"
    metadata["time_spent_sec"] = time_spent_sec
    metadata["section_time_spent_sec"] = normalize_section_time_spent_sec(
        (
            metadata.get("section_time_spent_sec")
            if isinstance(metadata.get("section_time_spent_sec"), dict)
            else None
        ),
        snapshot=snapshot,
        time_limit_seconds=attempt.time_limit_seconds,
    )
    if (
        not metadata["section_time_spent_sec"]
        and attempt.scope == ModelAttemptScope.SECTION
        and attempt.section_id
    ):
        metadata["section_time_spent_sec"] = {
            str(attempt.section_id): time_spent_sec
        }
    metadata["scoring_items"] = freeze_test_snapshot(scoring.scoring_items)
    metadata["section_breakdown"] = freeze_test_snapshot(
        scoring.section_breakdown
    )
    metadata["question_type_breakdown"] = freeze_test_snapshot(
        scoring.question_type_breakdown
    )

    attempt.status = (
        ModelAttemptStatus.AUTO_SUBMITTED
        if metadata.get("auto_submitted")
        else ModelAttemptStatus.COMPLETED
    )
    attempt.submitted_at = now
    attempt.raw_score = scoring.raw_score
    attempt.max_score = int(snapshot.get("total_questions", 0))
    attempt.band_score = float(band_score) if band_score is not None else None

    if should_grant_premium_bonus(attempt=attempt, metadata=metadata):
        user = await session.get(User, attempt.user_id)
        if user_can_receive_full_test_premium_bonus(user):
            bonus_until = await grant_premium_bonus(
                session,
                user=user,
                days=2,
                title="Test bonus activated",
                body=(
                    "You completed a full Reading or Listening test. "
                    "Your +2 premium days are active."
                ),
                telegram_text=(
                    "🎉 <b>Test bonus activated</b>\n\nYou completed a full "
                    "Reading or Listening test. Your +2 premium days are active."
                ),
                now=now,
            )
            user.full_test_premium_bonus_granted_at = now
            metadata["premium_bonus_granted"] = True
            metadata["premium_bonus_days"] = 2
            metadata["premium_bonus_granted_at"] = now.isoformat()
            attempt.attempt_metadata = metadata
            session.add(
                AttemptEvent(
                    attempt_id=attempt_id,
                    event_type="premium_bonus_granted",
                    payload={
                        "days": 2,
                        "premium_until": bonus_until.isoformat(),
                        "test_type": str(attempt.test_type),
                        "scope": str(attempt.scope),
                    },
                    created_at=now,
                )
            )

    xp_result = await award_xp_for_attempt(session, attempt)
    metadata["xp_awarded_total"] = xp_result.total_awarded
    metadata["xp_breakdown"] = xp_result.breakdown
    metadata["xp_level_after"] = xp_result.level_after
    metadata["xp_current_streak"] = xp_result.current_streak
    attempt.attempt_metadata = metadata
    session.add(
        AttemptEvent(
            attempt_id=attempt_id,
            event_type="attempt_submitted",
            payload={
                "raw_score": scoring.raw_score,
                "band_score": (
                    float(band_score) if band_score is not None else None
                ),
                "xp_awarded_total": xp_result.total_awarded,
            },
            created_at=now,
        )
    )
    await session.commit()
    await session.refresh(attempt)
    answers = await load_answers(session, attempt_id)
    return to_runtime(attempt, answers=answers)
