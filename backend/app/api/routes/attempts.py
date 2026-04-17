from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.enums import TestType
from app.db.session import get_db_session
from app.schemas.common import DebugPrincipal, MessageResponse
from app.schemas.attempts import (
    AttemptAnswerRequest,
    AttemptAnswerResponse,
    AttemptBreakdownItemRead,
    AttemptRead,
    AttemptResultRead,
    AttemptReviewItemRead,
    AttemptReviewRead,
    AttemptSubmitResponse,
)
from app.schemas.tests import TestSnapshotRead
from app.services.attempt_repo import get_attempt_from_db, save_answer_in_db, submit_attempt_in_db
from app.services.runtime_store import get_attempt, save_answer, submit_attempt

router = APIRouter()


async def _require_attempt_owner(
    attempt_id: UUID,
    current_user: DebugPrincipal,
    session: AsyncSession,
):
    try:
        attempt = await get_attempt_from_db(session, attempt_id=attempt_id, user_id=current_user.id)
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass
        attempt = None
    if attempt is None:
        attempt = get_attempt(attempt_id)
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found.")
    if attempt.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Attempt does not belong to user.")
    return attempt


@router.get("/{attempt_id}", response_model=AttemptRead)
async def get_attempt_view(
    attempt_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AttemptRead:
    attempt = await _require_attempt_owner(attempt_id, current_user, session)
    return AttemptRead(
        attempt_id=attempt.attempt_id,
        test_id=attempt.test_id,
        test_title=str(attempt.test_snapshot.get("title")),
        test_type=attempt.test_snapshot.get("test_type"),
        test_version=attempt.test_version,
        scope=attempt.scope,
        section_id=attempt.section_id,
        mode=attempt.mode,
        status=attempt.status,
        started_at=attempt.started_at,
        completed_at=attempt.completed_at,
        time_spent_sec=attempt.time_spent_sec,
        total_questions=attempt.total_questions,
        answers_count=len(attempt.answers),
        raw_score=attempt.raw_score,
        band_score=attempt.band_score,
        score_status=str(attempt.metadata.get("score_status", "queued")),
        time_limit_seconds=int(attempt.test_snapshot.get("time_limit_seconds", 0)),
        last_answered_question_number=attempt.metadata.get("last_answered_question_number"),
        test_snapshot=TestSnapshotRead(**attempt.test_snapshot),
    )


@router.patch("/{attempt_id}/answer", response_model=AttemptAnswerResponse)
async def save_attempt_answer(
    attempt_id: UUID,
    payload: AttemptAnswerRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AttemptAnswerResponse:
    _ = await _require_attempt_owner(attempt_id, current_user, session)
    try:
        attempt, question_number = await save_answer_in_db(
            session,
            attempt_id=attempt_id,
            question_id=payload.question_id,
            value=payload.value,
        )
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass
        attempt, question_number = save_answer(attempt_id, payload.question_id, payload.value)
    return AttemptAnswerResponse(
        attempt_id=attempt.attempt_id,
        question_id=payload.question_id,
        question_number=question_number,
        value=payload.value,
        saved_at=datetime.now(timezone.utc),
        score_status=str(attempt.metadata.get("score_status", "draft")),
    )


@router.post("/{attempt_id}/submit", response_model=AttemptSubmitResponse)
async def submit_attempt_view(
    attempt_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AttemptSubmitResponse:
    _ = await _require_attempt_owner(attempt_id, current_user, session)
    try:
        attempt = await submit_attempt_in_db(session, attempt_id=attempt_id)
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass
        attempt = submit_attempt(attempt_id)
    return AttemptSubmitResponse(
        attempt_id=attempt.attempt_id,
        test_id=attempt.test_id,
        test_title=str(attempt.test_snapshot.get("title")),
        test_type=attempt.test_snapshot.get("test_type"),
        test_version=attempt.test_version,
        scope=attempt.scope,
        section_id=attempt.section_id,
        mode=attempt.mode,
        status=attempt.status,
        started_at=attempt.started_at,
        completed_at=attempt.completed_at,
        time_spent_sec=attempt.time_spent_sec,
        total_questions=attempt.total_questions,
        answers_count=len(attempt.answers),
        raw_score=attempt.raw_score,
        band_score=attempt.band_score,
        score_status=str(attempt.metadata.get("score_status", "queued")),
        time_limit_seconds=int(attempt.test_snapshot.get("time_limit_seconds", 0)),
        last_answered_question_number=attempt.metadata.get("last_answered_question_number"),
        submitted_at=attempt.completed_at,
    )


@router.get("/{attempt_id}/result", response_model=AttemptResultRead)
async def get_result(
    attempt_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AttemptResultRead:
    attempt = await _require_attempt_owner(attempt_id, current_user, session)
    snapshot = attempt.test_snapshot
    return AttemptResultRead(
        attempt_id=attempt.attempt_id,
        status=attempt.status,
        test_id=attempt.test_id,
        test_type=snapshot.get("test_type", TestType.reading),
        test_title=str(snapshot.get("title")),
        raw_score=attempt.raw_score,
        band_score=attempt.band_score,
        answers_count=len(attempt.answers),
        total_questions=attempt.total_questions,
        score_status=str(attempt.metadata.get("score_status", "queued")),
        completed_at=attempt.completed_at,
        section_breakdown=[
            AttemptBreakdownItemRead(label=item["title"], correct=item["correct"], total=item["total"])
            for item in attempt.section_breakdown
        ],
        question_type_breakdown=[
            AttemptBreakdownItemRead(
                label=str(item["question_type"]),
                correct=item["correct"],
                total=item["total"],
            )
            for item in attempt.question_type_breakdown
        ],
    )


@router.get("/{attempt_id}/review", response_model=AttemptReviewRead)
async def get_review(
    attempt_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AttemptReviewRead:
    attempt = await _require_attempt_owner(attempt_id, current_user, session)
    items = [
        AttemptReviewItemRead(
            question_id=item["question_id"],
            question_number=item["question_number"],
            prompt=str(item["prompt"]),
            section_title=str(item["section_title"]),
            group_title=str(item["group_title"]),
            question_type=str(item["question_type"]),
            answer_value=item["answer_value"],
            is_correct=item["is_correct"],
            correct_answers=list(item["correct_answers"]),
            explanation=item["explanation"] if current_user.is_premium else None,
        )
        for item in attempt.scoring_items
    ]
    return AttemptReviewRead(
        attempt_id=attempt.attempt_id,
        test_title=str(attempt.test_snapshot.get("title")),
        test_type=attempt.test_snapshot.get("test_type"),
        can_show_explanations=current_user.is_premium,
        items=items,
    )
