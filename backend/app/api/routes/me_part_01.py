from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.me_dependencies import *

MAX_AVATAR_IMAGE_BYTES = 5 * 1024 * 1024

READING_QUESTION_TYPE_LABELS = {
    "reading_mc_single": "Multiple Choice (Single)",
    "reading_mc_multiple": "Multiple Choice (Multiple)",
    "reading_true_false_not_given": "True / False / Not Given",
    "reading_yes_no_not_given": "Yes / No / Not Given",
    "reading_matching_information": "Matching Information",
    "reading_matching_headings": "Matching Headings",
    "reading_matching_features": "Matching Features",
    "reading_matching_sentence_endings": "Matching Sentence Endings",
    "reading_sentence_completion": "Sentence Completion",
    "reading_summary_completion_wordbank": "Summary Completion (Word Bank)",
    "reading_summary_completion_freetext": "Summary Completion (Free Text)",
    "reading_note_completion": "Note Completion",
    "reading_table_completion": "Table Completion",
    "reading_flowchart_completion": "Flow-chart Completion",
    "reading_diagram_labeling": "Diagram Labeling",
    "reading_short_answer": "Short Answer",
}

LISTENING_QUESTION_TYPE_LABELS = {
    "listening_mc_single": "Multiple Choice (Single)",
    "listening_mc_multiple": "Multiple Choice (Multiple)",
    "listening_matching": "Matching",
    "listening_plan_map_labeling": "Plan / Map Labeling",
    "listening_form_completion": "Form Completion",
    "listening_note_completion": "Note Completion",
    "listening_table_completion": "Table Completion",
    "listening_flowchart_completion": "Flow-chart Completion",
    "listening_summary_completion": "Summary Completion",
    "listening_sentence_completion": "Sentence Completion",
    "listening_short_answer": "Short Answer",
}

LISTENING_FOCUS_CATEGORIES = {
    "listening_mc_single": ("paraphrase_understanding", "Paraphrase Understanding"),
    "listening_mc_multiple": ("distractor_handling", "Distractor Handling"),
    "listening_matching": ("distractor_handling", "Distractor Handling"),
    "listening_plan_map_labeling": ("detail_recognition", "Detail Recognition"),
    "listening_plan_map_diagram_labeling": ("detail_recognition", "Detail Recognition"),
    "listening_form_completion": ("spelling_accuracy", "Spelling Accuracy"),
    "listening_note_completion": ("spelling_accuracy", "Spelling Accuracy"),
    "listening_table_completion": ("spelling_accuracy", "Spelling Accuracy"),
    "listening_flowchart_completion": ("spelling_accuracy", "Spelling Accuracy"),
    "listening_summary_completion": ("spelling_accuracy", "Spelling Accuracy"),
    "listening_sentence_completion": ("spelling_accuracy", "Spelling Accuracy"),
    "listening_short_answer": ("spelling_accuracy", "Spelling Accuracy"),
}


def _question_type_label(question_type: str, include_module_prefix: bool = False) -> str:
    if question_type in READING_QUESTION_TYPE_LABELS:
        label = READING_QUESTION_TYPE_LABELS[question_type]
        return f"Reading - {label}" if include_module_prefix else label
    if question_type in LISTENING_QUESTION_TYPE_LABELS:
        label = LISTENING_QUESTION_TYPE_LABELS[question_type]
        return f"Listening - {label}" if include_module_prefix else label
    cleaned = question_type.removeprefix("reading_").removeprefix("listening_").replace("_", " ")
    return cleaned.title()


def _question_type_catalog(test_type: TestType | None) -> list[tuple[str, str]]:
    if test_type == TestType.reading:
        return list(READING_QUESTION_TYPE_LABELS.items())
    if test_type == TestType.listening:
        return list(LISTENING_QUESTION_TYPE_LABELS.items())
    if test_type in {TestType.writing, TestType.speaking}:
        return []
    return [
        *((key, f"Reading - {label}") for key, label in READING_QUESTION_TYPE_LABELS.items()),
        *((key, f"Listening - {label}") for key, label in LISTENING_QUESTION_TYPE_LABELS.items()),
    ]


def _safe_accuracy(correct_count: int, worked_count: int) -> float:
    if worked_count <= 0:
        return 0.0
    return round((correct_count / worked_count) * 100, 1)


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


def _attempt_type_stats(attempt, include_module_prefix: bool = False) -> dict[str, dict[str, int]]:
    stats: dict[str, dict[str, int]] = {}
    for item in attempt.scoring_items or []:
        label = _question_type_label(str(item.get("question_type", "")), include_module_prefix=include_module_prefix)
        answer_value = item.get("answer_value")
        worked = 1 if answer_value is not None and str(answer_value).strip() else 0
        correct = 1 if worked and bool(item.get("is_correct")) else 0
        bucket = stats.setdefault(label, {"worked_count": 0, "correct_count": 0, "error_count": 0})
        bucket["worked_count"] += worked
        bucket["correct_count"] += correct
        bucket["error_count"] += max(0, worked - correct)
    return stats


def _build_progress_series(attempts) -> list[MeBandProgressPointRead]:
    from app.api.routes.me_part_06 import _effective_attempt_band_score

    grouped: dict[object, dict[str, object]] = {}
    scored_attempts = sorted(
        [attempt for attempt in attempts if _effective_attempt_band_score(attempt) is not None],
        key=lambda attempt: attempt.completed_at or attempt.started_at,
    )

    for attempt in scored_attempts:
        occurred_at = attempt.completed_at or attempt.started_at
        key = occurred_at.date()
        point = grouped.setdefault(
            key,
            {
                "label": occurred_at.strftime("%d %b"),
                "occurred_at": occurred_at,
                "reading": [],
                "listening": [],
                "writing": [],
                "speaking": [],
            },
        )
        if occurred_at > point["occurred_at"]:
            point["occurred_at"] = occurred_at
        band_score = _effective_attempt_band_score(attempt)
        if band_score is None:
            continue
        band_value = float(band_score)
        test_type = str(attempt.test_snapshot.get("test_type"))
        if test_type == TestType.reading:
            point["reading"].append(band_value)
        elif test_type == TestType.listening:
            point["listening"].append(band_value)
        elif test_type == TestType.writing:
            point["writing"].append(band_value)
        elif test_type == TestType.speaking:
            point["speaking"].append(band_value)

    def _average(values: list[float]) -> float | None:
        if not values:
            return None
        return round(sum(values) / len(values), 2)

    return sorted(
        [
            MeBandProgressPointRead(
                label=str(point["label"]),
                occurred_at=point["occurred_at"],
                reading=_average(point["reading"]),
                listening=_average(point["listening"]),
                writing=_average(point["writing"]),
                speaking=_average(point["speaking"]),
            )
            for point in grouped.values()
        ],
        key=lambda item: item.occurred_at,
    )


def _build_question_type_analysis(attempts, test_type: TestType | None) -> list[MeQuestionTypeAnalysisItemRead]:
    aggregate: dict[str, dict[str, int]] = {
        label: {"worked_count": 0, "correct_count": 0, "error_count": 0}
        for _, label in _question_type_catalog(test_type)
    }
    include_module_prefix = test_type is None
    for attempt in attempts:
        for label, values in _attempt_type_stats(attempt, include_module_prefix=include_module_prefix).items():
            bucket = aggregate.setdefault(label, {"worked_count": 0, "correct_count": 0, "error_count": 0})
            bucket["worked_count"] += values["worked_count"]
            bucket["correct_count"] += values["correct_count"]
            bucket["error_count"] += values["error_count"]

    items = [
        MeQuestionTypeAnalysisItemRead(
            label=label,
            worked_count=values["worked_count"],
            correct_count=values["correct_count"],
            accuracy=_safe_accuracy(values["correct_count"], values["worked_count"]),
            error_count=values["error_count"],
        )
        for label, values in aggregate.items()
    ]
    return sorted(items, key=lambda item: (-item.worked_count, item.label))
