from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import TestMode, TestScope
from app.models.attempt import Attempt, AttemptEvent, UserAnswer
from app.models.enums import AttemptMode as ModelAttemptMode
from app.models.enums import AttemptScope as ModelAttemptScope
from app.models.enums import AttemptStatus as ModelAttemptStatus
from app.models.enums import TestType as ModelTestType
from app.schemas.common import DebugPrincipal
from app.services.attempt_repo_runtime import (
    load_answers,
    load_existing_in_progress_attempt,
    to_runtime,
)
from app.services.attempt_repo_support import (
    count_non_empty_answer_values,
    ensure_debug_user,
    snapshot_questions,
)
from app.services.attempt_runtime import AttemptRuntime
from app.services.snapshots import freeze_test_snapshot
from app.services.test_content_repo import build_test_snapshot_from_db


async def start_attempt_in_db(
    session: AsyncSession,
    *,
    principal: DebugPrincipal,
    test_id: UUID,
    scope: TestScope,
    section_id: UUID | None,
    mode: TestMode,
    force_new: bool = False,
) -> AttemptRuntime:
    await ensure_debug_user(session, principal)
    existing_attempt = (
        None
        if force_new
        else await load_existing_in_progress_attempt(
            session,
            user_id=principal.id,
            test_id=test_id,
            scope=scope,
            section_id=section_id,
            mode=mode,
        )
    )
    if existing_attempt is not None:
        return existing_attempt

    snapshot = await build_test_snapshot_from_db(
        session,
        test_id=test_id,
        scope=scope,
        mode=mode,
        section_id=section_id,
    )
    if snapshot is None:
        raise KeyError("test_not_found")

    frozen_snapshot = freeze_test_snapshot(snapshot)
    attempt = Attempt(
        user_id=principal.id,
        test_id=test_id,
        test_type=ModelTestType(str(frozen_snapshot["test_type"])),
        mode=ModelAttemptMode(mode.value),
        scope=ModelAttemptScope(scope.value),
        status=ModelAttemptStatus.IN_PROGRESS,
        section_id=section_id,
        test_snapshot=frozen_snapshot,
        raw_score=None,
        max_score=int(frozen_snapshot["total_questions"]),
        band_score=None,
        time_limit_seconds=int(frozen_snapshot["time_limit_seconds"]),
        attempt_metadata={
            "score_status": "draft",
            "payment_paused": True,
            "question_bank_enabled": False,
            "answers_count": 0,
            "time_spent_sec": 0,
            "scoring_items": [],
            "section_breakdown": [],
            "question_type_breakdown": [],
        },
    )
    session.add(attempt)
    await session.flush()
    session.add(
        AttemptEvent(
            attempt_id=attempt.id,
            event_type="attempt_started",
            payload={"mode": mode.value, "scope": scope.value},
            created_at=datetime.now(timezone.utc),
        )
    )
    await session.commit()
    await session.refresh(attempt)
    return to_runtime(attempt, answers=[])


async def save_answer_in_db(
    session: AsyncSession,
    *,
    attempt_id: UUID,
    question_id: UUID,
    value: str | None,
) -> tuple[AttemptRuntime, int]:
    attempt = await session.get(Attempt, attempt_id)
    if attempt is None:
        raise KeyError("attempt_not_found")

    snapshot = dict(attempt.test_snapshot or {})
    snapshot_question = snapshot_questions(snapshot).get(str(question_id))
    if snapshot_question is None:
        raise KeyError("question_not_found")

    existing_answers = list(
        (
            await session.scalars(
                select(UserAnswer)
                .where(
                    UserAnswer.attempt_id == attempt_id,
                    UserAnswer.question_id == question_id,
                )
                .order_by(
                    UserAnswer.updated_at.desc(),
                    UserAnswer.created_at.desc(),
                )
            )
        ).all()
    )
    existing = existing_answers[0] if existing_answers else None
    if existing is None:
        existing = UserAnswer(
            attempt_id=attempt_id,
            question_id=question_id,
            value={"value": value or ""},
        )
        session.add(existing)
    else:
        existing.value = {"value": value or ""}
        for duplicate in existing_answers[1:]:
            await session.delete(duplicate)

    question_number = int(snapshot_question["question_number"])
    await session.flush()
    persisted_answers = list(
        (
            await session.scalars(
                select(UserAnswer).where(UserAnswer.attempt_id == attempt_id)
            )
        ).all()
    )
    answers_count = count_non_empty_answer_values(
        [str(answer.value.get("value") or "") for answer in persisted_answers]
    )
    metadata = dict(attempt.attempt_metadata or {})
    metadata["last_answered_question_id"] = str(question_id)
    metadata["last_answered_question_number"] = question_number
    metadata["answers_count"] = answers_count
    metadata["score_status"] = "draft"
    attempt.attempt_metadata = metadata
    session.add(
        AttemptEvent(
            attempt_id=attempt_id,
            event_type="answer_saved",
            payload={
                "question_id": str(question_id),
                "question_number": question_number,
            },
            created_at=datetime.now(timezone.utc),
        )
    )
    await session.commit()
    await session.refresh(attempt)
    answers = await load_answers(session, attempt_id)
    return to_runtime(attempt, answers=answers), question_number
