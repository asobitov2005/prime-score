from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.runtime_store_dependencies import *
from app.services.runtime_store_part_01 import _count_answered_values, _normalized_attempt_time_spent, _snapshot_group_shared_options
from app.services.runtime_store_part_02 import _backend, get_attempt

def submit_attempt(attempt_id: UUID) -> AttemptRuntime:
    attempt = get_attempt(attempt_id)
    if attempt is None:
        raise KeyError("attempt_not_found")

    now = datetime.now(timezone.utc)
    attempt.completed_at = now
    attempt.updated_at = now
    attempt.time_spent_sec = _normalized_attempt_time_spent(
        saved_time_spent_sec=attempt.time_spent_sec,
        elapsed_fallback_sec=max(0, int((now - attempt.started_at).total_seconds())),
        mode=attempt.mode,
        time_limit_seconds=int(attempt.test_snapshot.get("time_limit_seconds", 0) or 0),
    )
    attempt.status = AttemptStatus.completed

    snapshot_questions = list(attempt.test_snapshot.get("questions", []))
    snapshot_group_shared_options = _snapshot_group_shared_options(attempt.test_snapshot)
    scoring_items: list[dict[str, object]] = []
    section_counts: dict[str, dict[str, object]] = {}
    type_counts: dict[str, dict[str, object]] = {}
    raw_score = 0

    for snapshot_question in snapshot_questions:
        question_id = UUID(str(snapshot_question["question_id"]))
        fixture = get_question_fixture(attempt.test_id, question_id)
        if fixture is None:
            continue
        answer_value = attempt.answers.get(str(question_id))
        answer_score = score_answer(
            answer_value,
            list(fixture["accepted_answers"]),
            question_type=str(fixture["question_type"]),
            question_label=str(snapshot_question.get("label") or fixture["question_number"]),
        )
        is_correct = answer_score.is_correct
        question_weight = answer_score.max_score
        awarded_score = answer_score.awarded_score
        raw_score += awarded_score

        scoring_item = {
            "question_id": str(question_id),
            "question_number": fixture["question_number"],
            "section_id": str(fixture["section_id"]),
            "section_title": fixture["section_title"],
            "group_title": fixture["group_title"],
            "question_type": str(fixture["question_type"]),
            "prompt": fixture["prompt"],
            "options": (
                [str(option) for option in snapshot_question.get("options", [])]
                or snapshot_group_shared_options.get(str(snapshot_question.get("group_id", "")), [])
            ),
            "answer_value": answer_value,
            "is_correct": is_correct,
            "awarded_score": awarded_score,
            "correct_answers": list(fixture.get("accepted_answers", [])),
            "explanation": fixture.get("explanation"),
            "explanation_reference": fixture.get("explanation_reference", {}),
        }
        scoring_items.append(scoring_item)

        section_key = str(fixture["section_id"])
        section_state = section_counts.setdefault(
            section_key,
            {"title": fixture["section_title"], "correct": 0, "total": 0},
        )
        section_state["total"] += question_weight
        section_state["correct"] += awarded_score

        type_key = str(fixture["question_type"])
        type_state = type_counts.setdefault(
            type_key,
            {"question_type": str(fixture["question_type"]), "correct": 0, "total": 0},
        )
        type_state["total"] += question_weight
        type_state["correct"] += awarded_score

    attempt.scoring_items = sorted(scoring_items, key=lambda item: item["question_number"])
    attempt.section_breakdown = list(section_counts.values())
    attempt.question_type_breakdown = list(type_counts.values())
    attempt.raw_score = raw_score
    attempt.band_score = (
        _band_for_raw_score(TestType(str(attempt.test_snapshot["test_type"])), raw_score)
        if TestScope(str(attempt.test_snapshot["scope"])) == TestScope.full
        else None
    )
    attempt.metadata["answers_count"] = _count_answered_values(attempt.answers)
    attempt.metadata["score_status"] = "ready"
    _backend().save_attempt(attempt)
    return attempt
