from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.me_dependencies import *
from app.api.routes.me_part_01 import LISTENING_FOCUS_CATEGORIES
from app.api.routes.me_part_02 import _build_unanswered_average


def _build_time_analysis(attempts, test_type: TestType | None, section_analysis: list[MeSectionAnalysisItemRead]) -> MeSkillTimeAnalysisRead:
    from app.api.routes.me_part_05 import _attempt_scope_value

    scoped_attempts = [
        attempt for attempt in attempts
        if test_type is None or (attempt.test_snapshot if isinstance(attempt.test_snapshot, dict) else {}).get("test_type") == test_type
    ]
    times = [int(getattr(a, "time_spent_sec", 0) or 0) for a in scoped_attempts if int(getattr(a, "time_spent_sec", 0) or 0) > 0]
    avg_time = round(sum(times) / len(times)) if times else None
    recommended = None
    if test_type in {TestType.reading, TestType.listening}:
        full_limits = [
            int(getattr(a, "time_limit_seconds", 0) or 0)
            for a in scoped_attempts
            if _attempt_scope_value(a) == TestScope.full.value and int(getattr(a, "time_limit_seconds", 0) or 0) > 0
        ]
        recommended = round(sum(full_limits) / len(full_limits)) if full_limits else 3600
    elif test_type == TestType.writing:
        recommended = 2400
    elif test_type == TestType.speaking:
        recommended = 840

    if avg_time is None or recommended is None:
        status = "No timing data"
    elif avg_time > recommended * 1.1:
        status = "Needs improvement"
    elif avg_time < recommended * 0.75:
        status = "Fast pace"
    else:
        status = "On track"

    timed_sections = [item for item in section_analysis if item.avg_time_sec is not None]
    slowest = max(timed_sections, key=lambda item: item.avg_time_sec or 0) if timed_sections else None
    fastest = min(timed_sections, key=lambda item: item.avg_time_sec or 0) if timed_sections else None
    return MeSkillTimeAnalysisRead(
        avg_time_per_test_sec=avg_time,
        recommended_time_sec=recommended,
        time_management_status=status,
        slowest_section=slowest,
        fastest_section=fastest,
        unanswered_avg_percent=_build_unanswered_average(scoped_attempts, test_type),
    )


def _build_listening_focus(attempts) -> list[MeSkillFocusItemRead]:
    buckets: dict[str, dict[str, object]] = {
        key: {"label": label, "correct": 0.0, "total": 0}
        for key, label in dict(LISTENING_FOCUS_CATEGORIES.values()).items()
    }
    for attempt in attempts:
        snapshot = attempt.test_snapshot if isinstance(attempt.test_snapshot, dict) else {}
        if snapshot.get("test_type") != TestType.listening:
            continue
        for item in list(getattr(attempt, "scoring_items", []) or []):
            if not isinstance(item, dict):
                continue
            category = LISTENING_FOCUS_CATEGORIES.get(str(item.get("question_type") or ""))
            if category is None:
                continue
            key, label = category
            bucket = buckets.setdefault(key, {"label": label, "correct": 0.0, "total": 0})
            bucket["total"] = int(bucket["total"]) + 1
            bucket["correct"] = float(bucket["correct"]) + float(item.get("awarded_score") or (1 if item.get("is_correct") else 0))

    focus: list[MeSkillFocusItemRead] = []
    for key in ["detail_recognition", "paraphrase_understanding", "distractor_handling", "spelling_accuracy"]:
        bucket = buckets.get(key)
        if not bucket:
            continue
        total = int(bucket["total"])
        value = round((float(bucket["correct"]) / total) * 100, 1) if total else None
        focus.append(
            MeSkillFocusItemRead(
                key=key,
                label=str(bucket["label"]),
                value=value,
                value_label=f"{value:g}%" if value is not None else "No data",
                subtext="Based on matching listening question types" if total else "No answered questions in this category yet",
                status="stable" if value is not None and value >= 70 else "needs_work" if value is not None else "empty",
            )
        )
    return focus


def _build_skill_focus(
    attempts,
    test_type: TestType | None,
    section_analysis: list[MeSectionAnalysisItemRead],
) -> list[MeSkillFocusItemRead]:
    if test_type == TestType.speaking:
        from app.api.routes.me_part_08 import _build_speaking_criteria

        criteria = _build_speaking_criteria(attempts)
        if criteria is None:
            return []
        values = [
            ("fluency", "Fluency & Coherence", criteria.fluency),
            ("lexical_resource", "Lexical Resource", criteria.lexical_resource),
            ("grammar", "Grammar Range & Accuracy", criteria.grammar),
            ("pronunciation", "Pronunciation", criteria.pronunciation),
        ]
        practiced = [(key, label, value) for key, label, value in values if value is not None]
        if not practiced:
            return []
        weakest = min(practiced, key=lambda item: item[2] or 0)
        strongest = max(practiced, key=lambda item: item[2] or 0)
        return [
            MeSkillFocusItemRead(
                key="weakest_criterion",
                label="Weakest Criterion",
                value=weakest[2],
                value_label=weakest[1],
                subtext=f"{weakest[1]} average is Band {weakest[2]:g}",
                status="needs_work",
            ),
            MeSkillFocusItemRead(
                key="best_criterion",
                label="Best Criterion",
                value=strongest[2],
                value_label=strongest[1],
                subtext=f"{strongest[1]} average is Band {strongest[2]:g}",
                status="stable",
            ),
        ]

    focus: list[MeSkillFocusItemRead] = []
    practiced_sections = [item for item in section_analysis if item.worked_count > 0]
    if practiced_sections:
        weakest = min(practiced_sections, key=lambda item: (item.accuracy, -item.worked_count))
        best = max(practiced_sections, key=lambda item: (item.accuracy, item.worked_count))
        focus.append(MeSkillFocusItemRead(
            key="weakest_section",
            label="Weakest Section",
            value=weakest.accuracy,
            value_label=weakest.label,
            subtext=f"{weakest.label} accuracy is {weakest.accuracy:g}%",
            status="needs_work",
        ))
        focus.append(MeSkillFocusItemRead(
            key="best_section",
            label="Best Section",
            value=best.accuracy,
            value_label=best.label,
            subtext=f"{best.label} accuracy is {best.accuracy:g}%",
            status="stable",
        ))

    if test_type == TestType.listening:
        focus[1:1] = _build_listening_focus(attempts)

    return focus


def _build_performance_summary(attempts) -> MePerformanceSummaryRead:
    reading = MePerformanceTestCountBucketRead()
    listening = MePerformanceTestCountBucketRead()
    writing = MePerformanceTestCountBucketRead()
    speaking = MePerformanceTestCountBucketRead()
    study_time = MePerformanceStudyTimeRead()
    seen_test_keys: set[tuple[str, str, str]] = set()

    for attempt in attempts:
        test_type = attempt.test_snapshot.get("test_type")
        scope = attempt.test_snapshot.get("scope") or getattr(attempt, "scope", None)
        bucket = None
        if test_type == TestType.reading:
            bucket = reading
        elif test_type == TestType.listening:
            bucket = listening
        elif test_type == "writing":
            bucket = writing
        elif test_type == "speaking":
            bucket = speaking

        if bucket is None:
            continue

        time_spent_sec = max(0, int(getattr(attempt, "time_spent_sec", 0) or 0))
        study_time.total_time_sec += time_spent_sec
        if test_type == TestType.reading:
            study_time.reading_time_sec += time_spent_sec
        elif test_type == TestType.listening:
            study_time.listening_time_sec += time_spent_sec
        elif test_type == "writing":
            study_time.writing_time_sec += time_spent_sec
        elif test_type == "speaking":
            study_time.speaking_time_sec += time_spent_sec

        sections = list(attempt.test_snapshot.get("sections") or [])
        section_number = 0
        if sections:
            try:
                section_number = int(sections[0].get("section_number") or 0)
            except (TypeError, ValueError):
                section_number = 0

        format_key = str(attempt.test_snapshot.get("format") or "").strip().lower()
        if not format_key:
            if str(scope) == TestScope.full.value:
                format_key = TestScope.full.value
            elif section_number > 0:
                format_key = f"section_{section_number}"
            else:
                format_key = "unknown"

        test_key = (str(getattr(attempt, "test_id", "")), str(test_type), format_key)
        if test_key in seen_test_keys:
            continue
        seen_test_keys.add(test_key)

        if str(scope) == TestScope.full.value or format_key == TestScope.full.value:
            bucket.full_count += 1
        else:
            if section_number == 1:
                bucket.section_1_count += 1
            elif section_number == 2:
                bucket.section_2_count += 1
            elif section_number == 3:
                bucket.section_3_count += 1
            elif section_number == 4:
                bucket.section_4_count += 1

    return MePerformanceSummaryRead(study_time=study_time, reading=reading, listening=listening, writing=writing, speaking=speaking)


def _profile_from_principal(principal: DebugPrincipal) -> MeProfileRead:
    return MeProfileRead(
        id=principal.id,
        first_name=principal.first_name,
        last_name=principal.last_name,
        username=principal.username,
        phone=principal.phone,
        role=principal.role,
        is_premium=principal.is_premium,
        premium_until=principal.premium_until,
        show_on_leaderboard=principal.show_on_leaderboard,
        telegram_id=principal.telegram_id,
        avatar_url=principal.avatar_url,
        language=principal.language,
        created_at=principal.created_at,
    )


def _profile_from_user(user: User) -> MeProfileRead:
    return MeProfileRead(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        username=user.username,
        phone=user.phone,
        is_premium=user.is_premium,
        premium_until=user.premium_until,
        show_on_leaderboard=user.show_on_leaderboard,
        telegram_id=user.telegram_id,
        avatar_url=user.avatar_url,
        language=user.language or "en",
        last_active_at=user.last_active_at,
        created_at=user.created_at,
        total_xp=int(user.total_xp or 0),
        current_level=int(user.current_level or 1),
        current_streak=int(user.current_streak or 0),
        best_streak=int(user.best_streak or 0),
    )
