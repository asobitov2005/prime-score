from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.services.attempt_repo_support import snapshot_group_shared_options
from app.services.scoring import score_answer


@dataclass(slots=True)
class AttemptScoringSummary:
    raw_score: int
    scoring_items: list[dict[str, object]]
    section_breakdown: list[dict[str, object]]
    question_type_breakdown: list[dict[str, object]]


def score_attempt_snapshot(
    *,
    snapshot: dict[str, object],
    answer_map: dict[str, str],
    database_answer_key: dict[str, dict[str, object]],
    frozen_answer_key: dict[str, dict[str, object]],
) -> AttemptScoringSummary:
    shared_options = snapshot_group_shared_options(snapshot)
    scoring_items: list[dict[str, object]] = []
    section_counts: dict[str, dict[str, object]] = {}
    type_counts: dict[str, dict[str, object]] = {}
    raw_score = 0

    for raw_question in snapshot.get("questions", []):
        if not isinstance(raw_question, dict):
            continue
        question_id = UUID(str(raw_question["question_id"]))
        question_payload = {
            "question_number": int(raw_question["question_number"]),
            "section_id": str(raw_question["section_id"]),
            "section_title": str(raw_question["section_title"]),
            "group_title": str(raw_question["group_title"]),
            "question_type": str(raw_question["question_type"]),
            "prompt": str(raw_question["prompt"]),
            "options": (
                [str(option) for option in raw_question.get("options", [])]
                or shared_options.get(str(raw_question.get("group_id", "")), [])
            ),
        }
        answer_key = database_answer_key.get(str(question_id)) or frozen_answer_key.get(
            str(question_id)
        )
        if answer_key is None:
            continue

        answer_value = answer_map.get(str(question_id))
        accepted_answers = [
            str(item) for item in answer_key.get("accepted_answers", [])
        ]
        answer_score = score_answer(
            answer_value,
            accepted_answers,
            question_type=str(question_payload["question_type"]),
            question_label=str(
                raw_question.get("label")
                or question_payload["question_number"]
            ),
        )
        raw_score += answer_score.awarded_score
        scoring_items.append(
            {
                "question_id": str(question_id),
                "question_number": question_payload["question_number"],
                "section_id": question_payload["section_id"],
                "section_title": question_payload["section_title"],
                "group_title": question_payload["group_title"],
                "question_type": question_payload["question_type"],
                "prompt": question_payload["prompt"],
                "options": question_payload["options"],
                "answer_value": answer_value,
                "is_correct": answer_score.is_correct,
                "awarded_score": answer_score.awarded_score,
                "correct_answers": accepted_answers,
                "explanation": str(answer_key.get("explanation") or ""),
                "explanation_reference": answer_key.get(
                    "explanation_reference"
                )
                or {},
            }
        )

        section_key = str(question_payload["section_id"])
        section_state = section_counts.setdefault(
            section_key,
            {
                "title": question_payload["section_title"],
                "correct": 0,
                "total": 0,
            },
        )
        section_state["total"] += answer_score.max_score
        section_state["correct"] += answer_score.awarded_score

        type_key = str(question_payload["question_type"])
        type_state = type_counts.setdefault(
            type_key,
            {
                "question_type": question_payload["question_type"],
                "correct": 0,
                "total": 0,
            },
        )
        type_state["total"] += answer_score.max_score
        type_state["correct"] += answer_score.awarded_score

    return AttemptScoringSummary(
        raw_score=raw_score,
        scoring_items=sorted(
            scoring_items,
            key=lambda item: int(item["question_number"]),
        ),
        section_breakdown=list(section_counts.values()),
        question_type_breakdown=list(type_counts.values()),
    )
