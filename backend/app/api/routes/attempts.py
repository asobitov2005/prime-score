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
    AttemptDiagramGroupRead,
    AttemptProgressRequest,
    AttemptProgressResponse,
    AttemptRead,
    AttemptResultRead,
    AttemptReviewItemRead,
    AttemptReviewRead,
    AttemptSubmitRequest,
    AttemptSubmitResponse,
    AttemptUiStateRead,
    AttemptTextHighlightRead,
)
from app.schemas.tests import TestSnapshotRead
from app.services.attempt_repo import get_attempt_from_db, save_answer_in_db, save_progress_in_db, submit_attempt_in_db
from app.services.object_storage import normalize_storage_asset_path
from app.services.runtime_store import get_attempt, save_answer, save_progress, submit_attempt

router = APIRouter()


def _count_answered_values(answers: dict[str, str] | None) -> int:
    if not answers:
        return 0
    return sum(1 for value in answers.values() if str(value or "").strip())


def _normalize_attempt_snapshot(snapshot: dict[str, object]) -> dict[str, object]:
    normalized_snapshot = dict(snapshot)
    normalized_sections: list[dict[str, object]] = []

    for raw_section in snapshot.get("sections", []):
        if not isinstance(raw_section, dict):
            continue
        normalized_section = dict(raw_section)
        normalized_groups: list[dict[str, object]] = []
        for raw_group in raw_section.get("question_groups", []):
            if not isinstance(raw_group, dict):
                continue
            normalized_group = dict(raw_group)
            shared_content = raw_group.get("shared_content")
            if isinstance(shared_content, dict):
                normalized_shared_content = dict(shared_content)
                normalized_shared_content["diagram_image_url"] = normalize_storage_asset_path(
                    shared_content.get("diagram_image_url")
                )
                normalized_group["shared_content"] = normalized_shared_content
            normalized_groups.append(normalized_group)
        normalized_section["question_groups"] = normalized_groups
        normalized_sections.append(normalized_section)

    normalized_snapshot["sections"] = normalized_sections
    return normalized_snapshot


def _extract_diagram_groups(snapshot: dict[str, object]) -> list[AttemptDiagramGroupRead]:
    diagram_groups: list[AttemptDiagramGroupRead] = []
    for section in snapshot.get("sections", []):
        if not isinstance(section, dict):
            continue
        section_title = str(section.get("title") or section.get("label") or "Section")
        for group in section.get("question_groups", []):
            if not isinstance(group, dict):
                continue
            if "diagram" not in str(group.get("question_type") or ""):
                continue
            shared_content = group.get("shared_content")
            if not isinstance(shared_content, dict):
                continue
            diagram_image_url = normalize_storage_asset_path(shared_content.get("diagram_image_url"))
            if not diagram_image_url:
                continue
            diagram_groups.append(
                AttemptDiagramGroupRead(
                    group_id=group["group_id"],
                    section_title=section_title,
                    group_title=str(group.get("group_title") or ""),
                    question_start=int(group.get("question_start") or 0),
                    question_end=int(group.get("question_end") or 0),
                    diagram_title=str(shared_content.get("diagram_title") or "") or None,
                    diagram_image_url=diagram_image_url,
                )
            )
    return diagram_groups


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
    normalized_snapshot = _normalize_attempt_snapshot(attempt.test_snapshot)
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
        answers_count=_count_answered_values(attempt.answers),
        raw_score=attempt.raw_score,
        band_score=attempt.band_score,
        score_status=str(attempt.metadata.get("score_status", "queued")),
        time_limit_seconds=int(attempt.test_snapshot.get("time_limit_seconds", 0)),
        last_answered_question_number=attempt.metadata.get("last_answered_question_number"),
        answers=attempt.answers,
        active_question_id=str(attempt.metadata.get("active_question_id")) if attempt.metadata.get("active_question_id") else None,
        text_highlights={
            str(block_key): [AttemptTextHighlightRead(**item) for item in items if isinstance(item, dict)]
            for block_key, items in dict(attempt.metadata.get("text_highlights") or {}).items()
            if isinstance(items, list)
        },
        ui_state=(
            AttemptUiStateRead(**ui_state)
            if isinstance((ui_state := attempt.metadata.get("ui_state")), dict)
            else None
        ),
        test_snapshot=TestSnapshotRead(**normalized_snapshot),
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


@router.patch("/{attempt_id}/progress", response_model=AttemptProgressResponse)
async def save_attempt_progress(
    attempt_id: UUID,
    payload: AttemptProgressRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AttemptProgressResponse:
    _ = await _require_attempt_owner(attempt_id, current_user, session)
    try:
        attempt = await save_progress_in_db(
            session,
            attempt_id=attempt_id,
            time_spent_sec=payload.time_spent_sec,
            active_question_id=payload.active_question_id,
            text_highlights=(
                {
                    block_key: [item.model_dump() for item in items]
                    for block_key, items in payload.text_highlights.items()
                }
                if payload.text_highlights is not None
                else None
            ),
            ui_state=payload.ui_state.model_dump(exclude_none=True) if payload.ui_state is not None else None,
        )
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass
        attempt = save_progress(
            attempt_id,
            time_spent_sec=payload.time_spent_sec,
            active_question_id=payload.active_question_id,
            text_highlights=(
                {
                    block_key: [item.model_dump() for item in items]
                    for block_key, items in payload.text_highlights.items()
                }
                if payload.text_highlights is not None
                else None
            ),
            ui_state=payload.ui_state.model_dump(exclude_none=True) if payload.ui_state is not None else None,
        )
    return AttemptProgressResponse(
        attempt_id=attempt.attempt_id,
        saved_at=datetime.now(timezone.utc),
        time_spent_sec=attempt.time_spent_sec,
    )


@router.post("/{attempt_id}/submit", response_model=AttemptSubmitResponse)
async def submit_attempt_view(
    attempt_id: UUID,
    payload: AttemptSubmitRequest | None = None,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AttemptSubmitResponse:
    if payload is None or not payload.confirm:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Submit confirmation is required.")

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
        answers_count=_count_answered_values(attempt.answers),
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
    diagram_groups = _extract_diagram_groups(snapshot)
    return AttemptResultRead(
        attempt_id=attempt.attempt_id,
        status=attempt.status,
        test_id=attempt.test_id,
        test_type=snapshot.get("test_type", TestType.reading),
        test_format=str(snapshot.get("format") or "full"),
        source=snapshot.get("source"),
        source_detail=(str(snapshot.get("source_detail")) if snapshot.get("source_detail") is not None else None),
        test_title=str(snapshot.get("title")),
        raw_score=attempt.raw_score,
        band_score=attempt.band_score,
        answers_count=_count_answered_values(attempt.answers),
        total_questions=attempt.total_questions,
        time_spent_sec=attempt.time_spent_sec,
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
        diagram_groups=diagram_groups,
    )


@router.get("/{attempt_id}/review", response_model=AttemptReviewRead)
async def get_review(
    attempt_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AttemptReviewRead:
    attempt = await _require_attempt_owner(attempt_id, current_user, session)
    diagram_groups = _extract_diagram_groups(attempt.test_snapshot)
    items = [
        AttemptReviewItemRead(
            question_id=item["question_id"],
            question_number=item["question_number"],
            prompt=str(item["prompt"]),
            section_title=str(item["section_title"]),
            group_title=str(item["group_title"]),
            question_type=str(item["question_type"]),
            options=[str(option) for option in item.get("options", [])],
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
        diagram_groups=diagram_groups,
        items=items,
    )
