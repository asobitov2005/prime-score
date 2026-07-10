from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.attempts_dependencies import *

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
