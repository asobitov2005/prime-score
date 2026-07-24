from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.me_dependencies import *
from app.api.routes.me_part_01 import _attempt_type_stats, _question_type_catalog, _safe_accuracy


def _build_comparison(attempts, test_type: TestType | None) -> MeQuestionTypeComparisonRead:
    completed_attempts = sorted(
        attempts,
        key=lambda attempt: attempt.completed_at or attempt.started_at,
        reverse=True,
    )
    if len(completed_attempts) < 2:
        return MeQuestionTypeComparisonRead()

    attempts_for_comparison = list(reversed(completed_attempts[:4]))
    if len(attempts_for_comparison) < 2:
        return MeQuestionTypeComparisonRead()

    include_module_prefix = test_type is None
    attempt_stats = [_attempt_type_stats(attempt, include_module_prefix=include_module_prefix) for attempt in attempts_for_comparison]
    labels = [label for _, label in _question_type_catalog(test_type)]
    current_stats = attempt_stats[-1]

    items = [
        MeQuestionTypeComparisonItemRead(
            label=label,
            accuracies=[
                (
                    _safe_accuracy(stats[label]["correct_count"], stats[label]["worked_count"])
                    if label in stats and stats[label]["worked_count"] > 0
                    else None
                )
                for stats in attempt_stats
            ],
            current_worked_count=current_stats.get(label, {}).get("worked_count", 0),
            current_error_count=current_stats.get(label, {}).get("error_count", 0),
        )
        for label in labels
    ]

    for item in items:
        previous_values = [value for value in item.accuracies[:-1] if value is not None]
        item.previous_accuracy = round(sum(previous_values) / len(previous_values), 1) if previous_values else None
        item.current_accuracy = item.accuracies[-1] if item.accuracies else None
        item.delta = (
            round(item.current_accuracy - item.previous_accuracy, 1)
            if item.current_accuracy is not None and item.previous_accuracy is not None
            else None
        )

    items.sort(
        key=lambda item: (
            -(abs(item.delta) if item.delta is not None else -1),
            item.label,
        )
    )

    current_attempt = attempts_for_comparison[-1]
    previous_attempt = attempts_for_comparison[-2]

    return MeQuestionTypeComparisonRead(
        previous_test_title=str(previous_attempt.test_snapshot.get("title", "Previous test")),
        previous_test_date=previous_attempt.completed_at or previous_attempt.started_at,
        current_test_title=str(current_attempt.test_snapshot.get("title", "Current test")),
        current_test_date=current_attempt.completed_at or current_attempt.started_at,
        tests=[
            MeQuestionTypeComparisonTestRead(
                test_title=str(attempt.test_snapshot.get("title", "Test")),
                test_date=attempt.completed_at or attempt.started_at,
            )
            for attempt in attempts_for_comparison
        ],
        items=items,
    )


def _build_error_distribution(analysis: list[MeQuestionTypeAnalysisItemRead]) -> list[MeErrorDistributionItemRead]:
    total_errors = sum(item.error_count for item in analysis)
    if total_errors <= 0:
        return []
    items = [
        MeErrorDistributionItemRead(
            label=item.label,
            error_count=item.error_count,
            share=round((item.error_count / total_errors) * 100, 1),
        )
        for item in analysis
        if item.error_count > 0
    ]
    return sorted(items, key=lambda item: (-item.error_count, item.label))


def _section_label(test_type: TestType | None, section_number: int) -> str:
    if test_type == TestType.reading:
        return f"Passage {section_number}"
    if test_type == TestType.listening:
        return f"Part {section_number}"
    if test_type == TestType.writing:
        return f"Task {section_number}"
    return f"Section {section_number}"


def _section_number_from_title(title: str) -> int | None:
    match = re.search(r"\b(?:passage|part|section|task)\s*(\d)\b", title, re.I)
    if not match:
        return None
    try:
        return int(match.group(1))
    except ValueError:
        return None


def _section_map(snapshot: dict[str, object]) -> dict[str, int]:
    mapped: dict[str, int] = {}
    for index, section in enumerate(snapshot.get("sections", []), start=1):
        if not isinstance(section, dict):
            continue
        section_id = str(section.get("section_id") or section.get("id") or "").strip()
        title = str(section.get("title") or section.get("label") or "")
        number = None
        try:
            number = int(section.get("section_number") or section.get("number") or 0)
        except (TypeError, ValueError):
            number = None
        number = number or _section_number_from_title(title) or index
        if section_id:
            mapped[section_id] = number
    return mapped


def _section_number_for_item(attempt, item: dict[str, object]) -> int:
    snapshot = attempt.test_snapshot if isinstance(attempt.test_snapshot, dict) else {}
    section_id = str(item.get("section_id") or "").strip()
    mapped = _section_map(snapshot)
    if section_id and section_id in mapped:
        return mapped[section_id]

    title = str(item.get("section_title") or "")
    title_number = _section_number_from_title(title)
    if title_number:
        return title_number

    try:
        question_number = int(item.get("question_number") or 0)
    except (TypeError, ValueError):
        question_number = 0

    test_type = snapshot.get("test_type")
    if test_type == TestType.reading:
        return max(1, min(3, ((max(question_number, 1) - 1) // 13) + 1))
    if test_type == TestType.listening:
        return max(1, min(4, ((max(question_number, 1) - 1) // 10) + 1))
    return 1


def _is_answered(value: object) -> bool:
    return value is not None and str(value).strip() != ""


def _build_section_analysis(attempts, test_type: TestType | None) -> list[MeSectionAnalysisItemRead]:
    from app.api.routes.me_part_05 import _attempt_scope_value

    if test_type not in {TestType.reading, TestType.listening, TestType.writing}:
        return []

    sections: dict[int, dict[str, float | int]] = {}
    section_attempt_times: dict[int, list[int]] = {}

    for attempt in attempts:
        snapshot = attempt.test_snapshot if isinstance(attempt.test_snapshot, dict) else {}
        if snapshot.get("test_type") != test_type:
            continue

        scoring_items = list(getattr(attempt, "scoring_items", []) or [])
        seen_sections: set[int] = set()
        for item in scoring_items:
            if not isinstance(item, dict):
                continue
            section_number = _section_number_for_item(attempt, item)
            state = sections.setdefault(section_number, {"worked": 0, "correct": 0.0, "total": 0, "attempts": 0})
            answered = _is_answered(item.get("answer_value"))
            if answered:
                state["worked"] = int(state["worked"]) + 1
            state["total"] = int(state["total"]) + 1
            state["correct"] = float(state["correct"]) + float(item.get("awarded_score") or (1 if item.get("is_correct") else 0))
            seen_sections.add(section_number)

        for section_number in seen_sections:
            sections.setdefault(section_number, {"worked": 0, "correct": 0.0, "total": 0, "attempts": 0})
            sections[section_number]["attempts"] = int(sections[section_number]["attempts"]) + 1

        section_numbers_by_id = _section_map(snapshot)
        section_time_map = getattr(attempt, "metadata", {}).get("section_time_spent_sec") if isinstance(getattr(attempt, "metadata", {}), dict) else None
        if isinstance(section_time_map, dict):
            for section_id, seconds in section_time_map.items():
                section_number = section_numbers_by_id.get(str(section_id).strip())
                if section_number is None:
                    continue
                try:
                    time_spent = int(seconds or 0)
                except (TypeError, ValueError):
                    continue
                if time_spent > 0:
                    section_attempt_times.setdefault(section_number, []).append(time_spent)

        scope = _attempt_scope_value(attempt)
        if scope == TestScope.section.value:
            snapshot_sections = list(snapshot.get("sections") or [])
            section_number = None
            if snapshot_sections and isinstance(snapshot_sections[0], dict):
                try:
                    section_number = int(snapshot_sections[0].get("section_number") or 0)
                except (TypeError, ValueError):
                    section_number = None
            section_number = section_number or next(iter(seen_sections), None)
            time_spent = int(getattr(attempt, "time_spent_sec", 0) or 0)
            if section_number and time_spent > 0 and not (isinstance(section_time_map, dict) and section_time_map):
                section_attempt_times.setdefault(section_number, []).append(time_spent)

    items: list[MeSectionAnalysisItemRead] = []
    for section_number in sorted(sections):
        state = sections[section_number]
        total = int(state["total"])
        correct = float(state["correct"])
        times = section_attempt_times.get(section_number, [])
        items.append(
            MeSectionAnalysisItemRead(
                section_number=section_number,
                label=_section_label(test_type, section_number),
                worked_count=int(state["worked"]),
                correct_count=round(correct, 1),
                accuracy=round((correct / total) * 100, 1) if total > 0 else 0.0,
                attempts_count=int(state["attempts"]),
                avg_time_sec=round(sum(times) / len(times)) if times else None,
            )
        )
    return items


def _build_unanswered_average(attempts, test_type: TestType | None) -> float | None:
    percentages: list[float] = []
    for attempt in attempts:
        snapshot = attempt.test_snapshot if isinstance(attempt.test_snapshot, dict) else {}
        if test_type is not None and snapshot.get("test_type") != test_type:
            continue
        scoring_items = [item for item in list(getattr(attempt, "scoring_items", []) or []) if isinstance(item, dict)]
        if not scoring_items:
            continue
        unanswered = sum(1 for item in scoring_items if not _is_answered(item.get("answer_value")))
        percentages.append((unanswered / len(scoring_items)) * 100)
    if not percentages:
        return None
    return round(sum(percentages) / len(percentages), 1)
