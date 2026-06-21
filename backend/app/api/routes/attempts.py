from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.enums import TestMode, TestScope, TestType
from app.db.session import get_db_session
from app.models.attempt import AttemptEvent
from app.models.test import Question
from app.schemas.common import DebugPrincipal, MessageResponse
from app.schemas.attempts import (
    AttemptAnswerRequest,
    AttemptAnswerResponse,
    AttemptBreakdownItemRead,
    AttemptDiagramGroupRead,
    AttemptEventCreate,
    AttemptEventRead,
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
from app.services.scoring import mc_multiple_question_weight
from app.services.attempt_runtime import band_for_raw_score
from app.services.test_content_repo import build_test_snapshot_from_db

router = APIRouter()


def _count_answered_values(answers: dict[str, str] | None) -> int:
    if not answers:
        return 0
    return sum(1 for value in answers.values() if str(value or "").strip())


def _count_answered_slots(snapshot: dict[str, object], answers: dict[str, str] | None) -> int:
    if not answers:
        return 0

    answered_slots = 0
    for question in snapshot.get("questions", []):
        if not isinstance(question, dict):
            continue
        question_id = str(question.get("question_id") or "").strip()
        if not question_id:
            continue
        answer_value = str(answers.get(question_id) or "").strip()
        if not answer_value:
            continue

        question_type = str(question.get("question_type") or "")
        if "mc_multiple" in question_type:
            slot_weight = mc_multiple_question_weight(
                question_label=str(question.get("label") or question.get("question_number") or ""),
                accepted_answers=[],
            )
            selected_count = len([part for part in answer_value.split(",") if part.strip()])
            answered_slots += min(slot_weight, max(1, selected_count))
            continue

        answered_slots += 1

    return answered_slots


def _effective_band_score(
    snapshot: dict[str, object],
    raw_score: int | None,
    band_score,
    total_questions: int | None,
):
    test_type = TestType(str(snapshot.get("test_type", TestType.reading)))
    scope = str(snapshot.get("scope") or "")
    if band_score is not None and (scope == TestScope.full.value or test_type == TestType.writing):
        return band_score
    if raw_score is None:
        return None

    _ = total_questions
    return band_for_raw_score(
        test_type,
        int(raw_score),
    )


def _normalize_attempt_snapshot(snapshot: dict[str, object]) -> dict[str, object]:
    normalized_snapshot = dict(snapshot)
    normalized_sections: list[dict[str, object]] = []

    for raw_section in snapshot.get("sections", []):
        if not isinstance(raw_section, dict):
            continue
        normalized_section = dict(raw_section)
        normalized_section["audio_url"] = normalize_storage_asset_path(raw_section.get("audio_url"))
        normalized_section["transcript_segments"] = [
            segment
            for segment in raw_section.get("transcript_segments", [])
            if isinstance(segment, dict)
        ]
        normalized_section["transcript_question_locations"] = [
            location
            for location in raw_section.get("transcript_question_locations", [])
            if isinstance(location, dict)
        ]
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


def _hydrate_snapshot_media_from_live(
    snapshot: dict[str, object],
    live_snapshot: dict[str, object] | None,
) -> dict[str, object]:
    if not live_snapshot:
        return snapshot

    def _segment_max_end(raw_segments: object) -> float:
        if not isinstance(raw_segments, list):
            return 0.0
        max_end = 0.0
        for segment in raw_segments:
            if not isinstance(segment, dict):
                continue
            try:
                max_end = max(max_end, float(segment.get("end_sec") or 0))
            except (TypeError, ValueError):
                continue
        return max_end

    def _location_nonzero_count(raw_locations: object) -> int:
        if not isinstance(raw_locations, list):
            return 0
        count = 0
        for location in raw_locations:
            if not isinstance(location, dict):
                continue
            try:
                if float(location.get("start_sec") or 0) > 0 or float(location.get("end_sec") or 0) > 0:
                    count += 1
            except (TypeError, ValueError):
                continue
        return count

    def _location_quality_score(raw_locations: object) -> float:
        if not isinstance(raw_locations, list) or not raw_locations:
            return 0.0
        score = 0.0
        for location in raw_locations:
            if not isinstance(location, dict):
                continue
            answer_text = str(location.get("answer_text") or "").strip()
            correct_answer = str(location.get("correct_answer") or "").strip()
            if answer_text and len(answer_text) > 2:
                score += 1.0
            elif answer_text:
                score += 0.1
            if correct_answer and len(correct_answer) > 2:
                score += 0.5
            elif correct_answer:
                score += 0.05
        return score

    merged_snapshot = dict(snapshot)
    merged_snapshot["audio_duration_seconds"] = (
        snapshot.get("audio_duration_seconds")
        if snapshot.get("audio_duration_seconds") is not None
        else live_snapshot.get("audio_duration_seconds")
    )

    live_sections_by_id = {
        str(section.get("section_id")): section
        for section in live_snapshot.get("sections", [])
        if isinstance(section, dict) and section.get("section_id")
    }

    merged_sections: list[dict[str, object]] = []
    for raw_section in snapshot.get("sections", []):
        if not isinstance(raw_section, dict):
            continue

        live_section = live_sections_by_id.get(str(raw_section.get("section_id")))
        if live_section is None:
            merged_sections.append(raw_section)
            continue

        merged_section = dict(raw_section)
        if not str(merged_section.get("audio_url") or "").strip():
            merged_section["audio_url"] = live_section.get("audio_url")
        if merged_section.get("audio_duration_seconds") is None:
            merged_section["audio_duration_seconds"] = live_section.get("audio_duration_seconds")
        if not str(merged_section.get("transcript") or "").strip():
            merged_section["transcript"] = live_section.get("transcript")
        if not merged_section.get("transcript_segments"):
            merged_section["transcript_segments"] = live_section.get("transcript_segments", [])
        if not merged_section.get("transcript_question_locations"):
            merged_section["transcript_question_locations"] = live_section.get("transcript_question_locations", [])

        live_segment_end = _segment_max_end(live_section.get("transcript_segments"))
        merged_segment_end = _segment_max_end(merged_section.get("transcript_segments"))
        should_replace_transcript = False
        if live_segment_end > merged_segment_end + 30:
            should_replace_transcript = True
        elif merged_segment_end > max(60.0, live_segment_end + 30):
            should_replace_transcript = True
        elif merged_section.get("audio_duration_seconds") and merged_segment_end > float(merged_section.get("audio_duration_seconds") or 0) * 1.15:
            should_replace_transcript = True

        if should_replace_transcript:
            merged_section["transcript"] = live_section.get("transcript")
            merged_section["transcript_segments"] = live_section.get("transcript_segments", [])
            merged_section["transcript_question_locations"] = live_section.get("transcript_question_locations", [])
        else:
            live_location_count = _location_nonzero_count(live_section.get("transcript_question_locations"))
            merged_location_count = _location_nonzero_count(merged_section.get("transcript_question_locations"))
            live_location_quality = _location_quality_score(live_section.get("transcript_question_locations"))
            merged_location_quality = _location_quality_score(merged_section.get("transcript_question_locations"))
            if (
                live_location_count > merged_location_count
                or live_location_quality > merged_location_quality + 1
            ):
                merged_section["transcript_question_locations"] = live_section.get("transcript_question_locations", [])

        live_groups_by_id = {
            str(group.get("group_id")): group
            for group in live_section.get("question_groups", [])
            if isinstance(group, dict) and group.get("group_id")
        }
        merged_groups: list[dict[str, object]] = []
        for raw_group in merged_section.get("question_groups", []):
            if not isinstance(raw_group, dict):
                continue
            merged_group = dict(raw_group)
            live_group = live_groups_by_id.get(str(raw_group.get("group_id")))
            if live_group is not None:
                if not merged_group.get("shared_options") and live_group.get("shared_options"):
                    merged_group["shared_options"] = live_group.get("shared_options")

                merged_shared_content = dict(raw_group.get("shared_content") or {})
                live_shared_content = live_group.get("shared_content")
                if isinstance(live_shared_content, dict):
                    for key in ("question_block", "answer_block", "secondary_block", "options_title", "diagram_title", "diagram_image_url"):
                        if not str(merged_shared_content.get(key) or "").strip() and str(live_shared_content.get(key) or "").strip():
                            merged_shared_content[key] = live_shared_content.get(key)
                if merged_shared_content:
                    merged_group["shared_content"] = merged_shared_content
            merged_groups.append(merged_group)
        merged_section["question_groups"] = merged_groups
        merged_sections.append(merged_section)

    merged_snapshot["sections"] = merged_sections
    return merged_snapshot


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


@router.get("/{attempt_id}/result", response_model=AttemptResultRead)
async def get_result(
    attempt_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AttemptResultRead:
    attempt = await _require_attempt_owner(attempt_id, current_user, session)
    
    events_result = await session.execute(
        select(AttemptEvent)
        .where(AttemptEvent.attempt_id == attempt_id)
        .where(AttemptEvent.event_type.in_(["violation_exit_fullscreen", "violation_tab_switch", "violation_window_blur", "violation_devtools"]))
        .order_by(AttemptEvent.created_at.asc())
    )
    events = events_result.scalars().all()
    
    snapshot = attempt.test_snapshot
    answered_slots_count = _count_answered_slots(snapshot, attempt.answers)
    diagram_groups = _extract_diagram_groups(snapshot)
    effective_band_score = _effective_band_score(
        snapshot,
        attempt.raw_score,
        attempt.band_score,
        attempt.total_questions,
    )
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
        band_score=effective_band_score,
        answers_count=_count_answered_values(attempt.answers),
        answered_slots_count=answered_slots_count,
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
        events=[
            AttemptEventRead(
                event_type=event.event_type,
                payload=event.payload,
                created_at=event.created_at,
            ) for event in events
        ],
        xp_awarded_total=int(attempt.metadata.get("xp_awarded_total", 0) or 0),
        xp_breakdown=dict(attempt.metadata.get("xp_breakdown") or {}),
        xp_level_after=(
            int(attempt.metadata.get("xp_level_after"))
            if attempt.metadata.get("xp_level_after") is not None
            else None
        ),
        xp_current_streak=(
            int(attempt.metadata.get("xp_current_streak"))
            if attempt.metadata.get("xp_current_streak") is not None
            else None
        ),
    )


@router.get("/{attempt_id}/review", response_model=AttemptReviewRead)
async def get_review(
    attempt_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AttemptReviewRead:
    attempt = await _require_attempt_owner(attempt_id, current_user, session)
    diagram_groups = _extract_diagram_groups(attempt.test_snapshot)
    question_labels = _extract_question_labels(attempt.test_snapshot)
    scoring_items = list(attempt.scoring_items)
    latest_explanations: dict[str, dict[str, object]] = {}
    question_ids = []
    for item in scoring_items:
        try:
            question_ids.append(UUID(str(item["question_id"])))
        except (KeyError, TypeError, ValueError):
            continue
    if question_ids:
        questions = (
            await session.scalars(select(Question).where(Question.id.in_(question_ids)))
        ).all()
        latest_explanations = {
            str(question.id): {
                "explanation": question.explanation or "",
                "explanation_reference": question.explanation_reference or {},
            }
            for question in questions
        }
    items = [
        AttemptReviewItemRead(
            question_id=item["question_id"],
            question_number=item["question_number"],
            question_label=str(item.get("question_label") or question_labels.get(str(item["question_id"])) or ""),
            prompt=str(item["prompt"]),
            section_title=str(item["section_title"]),
            group_title=str(item["group_title"]),
            question_type=str(item["question_type"]),
            options=[str(option) for option in item.get("options", [])],
            answer_value=item["answer_value"],
            is_correct=item["is_correct"],
            correct_answers=list(item["correct_answers"]),
            explanation=(
                latest_explanations.get(str(item["question_id"]), {}).get("explanation")
                or item.get("explanation")
            ) if current_user.is_premium else None,
            explanation_reference=(
                latest_explanations.get(str(item["question_id"]), {}).get("explanation_reference")
                or item.get("explanation_reference")
            ) if current_user.is_premium else None,
        )
        for item in scoring_items
    ]
    return AttemptReviewRead(
        attempt_id=attempt.attempt_id,
        test_title=str(attempt.test_snapshot.get("title")),
        test_type=attempt.test_snapshot.get("test_type"),
        can_show_explanations=current_user.is_premium,
        diagram_groups=diagram_groups,
        items=items,
    )
