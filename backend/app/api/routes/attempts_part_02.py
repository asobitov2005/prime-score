from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.attempts_dependencies import *
from app.api.routes.attempts_part_01 import _count_answered_values, _effective_band_score, _hydrate_snapshot_media_from_live, _normalize_attempt_snapshot

router = APIRouter()

def _extract_question_labels(snapshot: dict[str, object]) -> dict[str, str]:
    labels: dict[str, str] = {}
    for section in snapshot.get("sections", []):
        if not isinstance(section, dict):
            continue
        for group in section.get("question_groups", []):
            if not isinstance(group, dict):
                continue
            for question in group.get("questions", []):
                if not isinstance(question, dict):
                    continue
                question_id = str(question.get("question_id") or "").strip()
                if not question_id:
                    continue
                label = str(question.get("label") or "").strip()
                if label:
                    labels[question_id] = label
    return labels

async def _require_attempt_owner(
    attempt_id: UUID,
    current_user: DebugPrincipal,
    session: AsyncSession,
):
    try:
        attempt = await get_attempt_from_db(session, attempt_id=attempt_id, user_id=current_user.id)
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load attempt.",
        ) from exc
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found.")
    return attempt

@router.get("/{attempt_id}", response_model=AttemptRead)
async def get_attempt_view(
    attempt_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AttemptRead:
    attempt = await _require_attempt_owner(attempt_id, current_user, session)
    normalized_snapshot = _normalize_attempt_snapshot(attempt.test_snapshot)
    if str(normalized_snapshot.get("test_type") or "") == TestType.listening.value:
        live_snapshot = await build_test_snapshot_from_db(
            session,
            test_id=attempt.test_id,
            scope=TestScope(attempt.scope.value),
            mode=TestMode(attempt.mode.value),
            section_id=attempt.section_id,
        )
        normalized_snapshot = _hydrate_snapshot_media_from_live(normalized_snapshot, live_snapshot)
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
        section_time_spent_sec={
            str(section_id): max(0, int(seconds or 0))
            for section_id, seconds in dict(attempt.metadata.get("section_time_spent_sec") or {}).items()
        },
        total_questions=attempt.total_questions,
        answers_count=_count_answered_values(attempt.answers),
        raw_score=attempt.raw_score,
        band_score=_effective_band_score(
            attempt.test_snapshot,
            attempt.raw_score,
            attempt.band_score,
            attempt.total_questions,
        ),
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
    except KeyError as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.") from exc
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save answer.",
        ) from exc
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
            section_time_spent_sec=payload.section_time_spent_sec,
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
    except KeyError as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found.") from exc
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save progress.",
        ) from exc
    return AttemptProgressResponse(
        attempt_id=attempt.attempt_id,
        saved_at=datetime.now(timezone.utc),
        time_spent_sec=attempt.time_spent_sec,
    )

@router.post("/{attempt_id}/events", response_model=AttemptEventRead)
async def record_attempt_event(
    attempt_id: UUID,
    payload: AttemptEventCreate,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AttemptEventRead:
    _ = await _require_attempt_owner(attempt_id, current_user, session)
    
    event = AttemptEvent(
        attempt_id=attempt_id,
        event_type=payload.event_type,
        payload=payload.payload or {},
        created_at=datetime.now(timezone.utc),
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)
    
    return AttemptEventRead(
        event_type=event.event_type,
        payload=event.payload,
        created_at=event.created_at,
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
    except KeyError as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found.") from exc
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit attempt.",
        ) from exc
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
        band_score=_effective_band_score(
            attempt.test_snapshot,
            attempt.raw_score,
            attempt.band_score,
            attempt.total_questions,
        ),
        score_status=str(attempt.metadata.get("score_status", "queued")),
        time_limit_seconds=int(attempt.test_snapshot.get("time_limit_seconds", 0)),
        last_answered_question_number=attempt.metadata.get("last_answered_question_number"),
        submitted_at=attempt.completed_at,
    )
