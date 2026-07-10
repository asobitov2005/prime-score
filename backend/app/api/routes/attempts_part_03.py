from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.attempts_dependencies import *
from app.api.routes.attempts_part_01 import _count_answered_slots, _count_answered_values, _effective_band_score, _extract_diagram_groups
from app.api.routes.attempts_part_02 import _extract_question_labels, _require_attempt_owner

router = APIRouter()

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
