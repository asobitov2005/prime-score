from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import AttemptStatus, TestMode, TestScope
from app.models.attempt import Attempt, UserAnswer
from app.models.enums import AttemptMode as ModelAttemptMode
from app.models.enums import AttemptScope as ModelAttemptScope
from app.models.enums import AttemptStatus as ModelAttemptStatus
from app.services.attempt_repo_support import (
    elapsed_attempt_seconds,
    normalized_attempt_time_spent,
)
from app.services.attempt_runtime import AttemptRuntime


def attempt_query() -> Select[tuple[Attempt]]:
    return select(Attempt).order_by(
        func.coalesce(
            Attempt.submitted_at,
            Attempt.updated_at,
            Attempt.created_at,
        ).desc(),
        Attempt.created_at.desc(),
    )


def to_runtime(
    attempt: Attempt,
    *,
    answers: list[UserAnswer],
    elapsed_fallback_sec: int = 0,
) -> AttemptRuntime:
    snapshot = dict(attempt.test_snapshot or {})
    metadata = dict(attempt.attempt_metadata or {})
    answer_map: dict[str, str] = {}
    answer_numbers: dict[str, int] = {}
    questions_by_id = {
        str(item["question_id"]): item
        for item in snapshot.get("questions", [])
        if isinstance(item, dict) and item.get("question_id")
    }

    latest_answers: dict[str, UserAnswer] = {}
    for answer in answers:
        question_key = str(answer.question_id)
        previous = latest_answers.get(question_key)
        if previous is None or answer.updated_at > previous.updated_at:
            latest_answers[question_key] = answer

    for question_id, answer in latest_answers.items():
        value = answer.value.get("value")
        answer_map[question_id] = "" if value is None else str(value)
        question = questions_by_id.get(question_id)
        if question is not None:
            answer_numbers[question_id] = int(question["question_number"])

    return AttemptRuntime(
        attempt_id=attempt.id,
        user_id=attempt.user_id,
        test_id=attempt.test_id,
        test_version=int(snapshot.get("version", 1)),
        scope=TestScope(attempt.scope.value),
        section_id=attempt.section_id,
        mode=TestMode(attempt.mode.value),
        status=AttemptStatus(attempt.status.value),
        started_at=attempt.created_at,
        completed_at=attempt.submitted_at,
        updated_at=attempt.updated_at or attempt.created_at,
        time_spent_sec=normalized_attempt_time_spent(
            saved_time_spent_sec=int(metadata.get("time_spent_sec", 0) or 0),
            elapsed_fallback_sec=elapsed_fallback_sec,
            mode=attempt.mode,
            time_limit_seconds=attempt.time_limit_seconds,
        ),
        raw_score=attempt.raw_score,
        total_questions=int(snapshot.get("total_questions", attempt.max_score or 0)),
        band_score=(
            Decimal(str(attempt.band_score))
            if attempt.band_score is not None
            else None
        ),
        test_snapshot=snapshot,
        metadata=metadata,
        answers=answer_map,
        answer_numbers=answer_numbers,
        scoring_items=list(metadata.get("scoring_items", [])),
        section_breakdown=list(metadata.get("section_breakdown", [])),
        question_type_breakdown=list(
            metadata.get("question_type_breakdown", [])
        ),
    )


async def load_answers(
    session: AsyncSession,
    attempt_id: UUID,
) -> list[UserAnswer]:
    result = await session.scalars(
        select(UserAnswer)
        .where(UserAnswer.attempt_id == attempt_id)
        .order_by(UserAnswer.created_at.asc())
    )
    return list(result.all())


async def load_existing_in_progress_attempt(
    session: AsyncSession,
    *,
    user_id: UUID,
    test_id: UUID,
    scope: TestScope,
    section_id: UUID | None,
    mode: TestMode,
) -> AttemptRuntime | None:
    query = attempt_query().where(
        Attempt.user_id == user_id,
        Attempt.test_id == test_id,
        Attempt.scope == ModelAttemptScope(scope.value),
        Attempt.mode == ModelAttemptMode(mode.value),
        Attempt.status == ModelAttemptStatus.IN_PROGRESS,
    )
    if section_id is None:
        query = query.where(Attempt.section_id.is_(None))
    else:
        query = query.where(Attempt.section_id == section_id)

    attempts = list((await session.scalars(query)).all())
    if not attempts:
        return None

    best_runtime: AttemptRuntime | None = None
    best_score: tuple[int, int, float, float] | None = None
    for attempt in attempts:
        answers = await load_answers(session, attempt.id)
        runtime = to_runtime(attempt, answers=answers)
        highlights_count = sum(
            len(items)
            for items in dict(runtime.metadata.get("text_highlights") or {}).values()
            if isinstance(items, list)
        )
        has_answers_or_highlights = int(
            any(value.strip() for value in runtime.answers.values())
            or bool(highlights_count)
        )
        has_time_progress = int(int(runtime.time_spent_sec or 0) > 0)
        updated_ts = (attempt.updated_at or attempt.created_at).timestamp()
        created_ts = attempt.created_at.timestamp()
        progress_score = (
            has_answers_or_highlights,
            has_time_progress,
            updated_ts,
            created_ts,
        )
        if best_score is None or progress_score > best_score:
            best_score = progress_score
            best_runtime = runtime

    return best_runtime


async def get_attempt_from_db(
    session: AsyncSession,
    *,
    attempt_id: UUID,
    user_id: UUID | None = None,
) -> AttemptRuntime | None:
    query = attempt_query().where(Attempt.id == attempt_id)
    if user_id is not None:
        query = query.where(Attempt.user_id == user_id)
    attempt = (await session.scalars(query)).first()
    if attempt is None:
        return None
    answers = await load_answers(session, attempt.id)
    return to_runtime(
        attempt,
        answers=answers,
        elapsed_fallback_sec=elapsed_attempt_seconds(attempt),
    )


async def iter_user_attempts_from_db(
    session: AsyncSession,
    *,
    user_id: UUID,
) -> list[AttemptRuntime]:
    attempts = (
        await session.scalars(
            attempt_query().where(Attempt.user_id == user_id)
        )
    ).all()
    if not attempts:
        return []

    answer_rows = (
        await session.scalars(
            select(UserAnswer).where(
                UserAnswer.attempt_id.in_([attempt.id for attempt in attempts])
            )
        )
    ).all()
    grouped_answers: dict[UUID, list[UserAnswer]] = {}
    for answer in answer_rows:
        grouped_answers.setdefault(answer.attempt_id, []).append(answer)

    return [
        to_runtime(attempt, answers=grouped_answers.get(attempt.id, []))
        for attempt in attempts
    ]
