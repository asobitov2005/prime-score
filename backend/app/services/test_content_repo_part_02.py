from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.test_content_repo_dependencies import *


def _serialize_catalog_item(test: Test) -> dict[str, object]:
    def _clean_section_title(value: str | None) -> str | None:
        if not value:
            return None
        cleaned = re.sub(r"^(Passage|Part)\s+\d+\s*[:.-]?\s*", "", value, flags=re.IGNORECASE).strip()
        return cleaned or value.strip()

    section_title: str | None = None
    if hasattr(test, "format") and test.format and test.format.value != "full":
        format_match = re.search(r"_(\d+)$", test.format.value)
        section_number = int(format_match.group(1)) if format_match else None
        if section_number is not None:
            matching_section = next((section for section in test.sections if section.position == section_number), None)
            if matching_section and matching_section.title:
                section_title = _clean_section_title(matching_section.title)
        if section_title is None and len(test.sections) == 1:
            section_title = _clean_section_title(test.sections[0].title)

    return {
        "id": test.id,
        "slug": test.slug,
        "title": test.title,
        "test_type": test.type.value,
        "format": test.format.value if hasattr(test, "format") and test.format else "full",
        "access_type": test.access_type.value,
        "status": test.status.value,
        "source": test.source.value,
        "source_detail": test.source_detail,
        "description": test.description,
        "exam_time_limit_min": int((test.exam_time_limit_seconds or 0) / 60),
        "total_questions": sum(
            mc_multiple_question_weight(
                question_label=str(question.question_metadata.get("label") or question.number),
                accepted_answers=[answer.value for answer in question.answer_variants],
            )
            if group.question_type.value.endswith("mc_multiple")
            else 1
            for section in test.sections
            for group in section.question_groups
            for question in group.questions
        ) or test.total_questions,
        "section_title": section_title,
        "version": test.version,
        "review_status": str(getattr(test, "review_status", "needs_review") or "needs_review"),
        "section_count": len(test.sections),
        "created_at": test.created_at,
        "updated_at": test.updated_at,
    }


def _serialize_admin_test(test: Test) -> dict[str, object]:
    return _serialize_catalog_item(test)


def _serialize_group(group: QuestionGroup, *, section_id: UUID, section_title: str) -> dict[str, object]:
    from app.services.test_content_repo_part_04 import _sanitize_group_option_payload

    questions = sorted(group.questions, key=lambda item: item.number)
    type_id = str(group.question_type.value)
    secondary_block, options_title, shared_options = _sanitize_group_option_payload(
        type_id,
        secondary_block=group.shared_content.get("secondary_block"),
        options_title=group.shared_content.get("options_title"),
        shared_options=group.shared_options,
    )
    return {
        "group_id": group.id,
        "group_title": group.title,
        "question_type": group.question_type.value,
        "question_start": group.question_start,
        "question_end": group.question_end,
        "shared_options": shared_options,
        "shared_content": {
            "question_block": str(group.shared_content.get("question_block") or ""),
            "answer_block": str(group.shared_content.get("answer_block") or ""),
            "secondary_block": secondary_block,
            "options_title": options_title,
            "diagram_title": str(group.shared_content.get("diagram_title") or ""),
            "diagram_image_url": normalize_storage_asset_path(group.shared_content.get("diagram_image_url")),
        },
        "questions": [
            {
                "question_id": question.id,
                "question_number": question.number,
                "section_id": section_id,
                "section_title": section_title,
                "group_id": group.id,
                "group_title": group.title,
                "question_type": group.question_type.value,
                "prompt": question.prompt,
                "instructions": group.instructions or group.title,
                "label": str(question.question_metadata.get("label") or f"Q{question.number}"),
                "options": list(question.question_metadata.get("variants", [])) or list(shared_options),
                "selection_limit": question.question_metadata.get("selection_limit"),
                "word_limit": question.word_limit,
            }
            for question in questions
        ],
    }


def _extract_paragraph_text(item: object) -> str:
    if isinstance(item, dict):
        text = item.get("text")
        if text is not None:
            return str(text)
    return str(item)


def _serialize_paragraph_item(item: object) -> object:
    if isinstance(item, dict):
        payload: dict[str, object] = {"text": _extract_paragraph_text(item)}
        item_id = item.get("id")
        if item_id is not None:
            payload["id"] = str(item_id)
        if "label" in item:
            label = item.get("label")
            payload["label"] = "" if label is None else str(label)
        return payload
    return _extract_paragraph_text(item)


def _serialize_snapshot_from_test(
    test: Test,
    *,
    scope: TestScope,
    mode: TestMode,
    section_id: UUID | None = None,
) -> dict[str, object]:
    from app.services.test_content_repo_part_04 import (
        _normalize_transcript_question_locations,
        _normalize_transcript_segments,
        _sanitize_group_option_payload,
    )

    ordered_sections = sorted(test.sections, key=lambda item: item.position)
    selected_sections = ordered_sections
    if scope == TestScope.section:
        selected_sections = [item for item in ordered_sections if item.id == section_id] or ordered_sections[:1]

    selected_groups = [
        group
        for section in selected_sections
        for group in sorted(section.question_groups, key=lambda item: (item.question_start, item.question_end))
    ]
    total_questions = sum(
        mc_multiple_question_weight(
            question_label=str(question.question_metadata.get("label") or question.number),
            accepted_answers=[answer.value for answer in question.answer_variants],
        )
        if group.question_type.value.endswith("mc_multiple")
        else 1
        for group in selected_groups
        for question in group.questions
    )
    audio_duration_seconds = None
    if test.type.value == TestType.listening.value:
        audio_duration_seconds = sum(section.audio_duration_seconds or 0 for section in selected_sections)

    time_limit_seconds = (
        60 * 60
        if test.type.value == TestType.reading.value
        else listening_exam_seconds(audio_duration_seconds or 0)
    )
    if scope == TestScope.section:
        time_limit_seconds = max(300, total_questions * 120)

    answer_key = {
        str(question.id): {
            "accepted_answers": [answer.value for answer in question.answer_variants],
            "explanation": question.explanation or "",
            "explanation_reference": question.explanation_reference or {},
        }
        for section in selected_sections
        for group in sorted(section.question_groups, key=lambda item: (item.question_start, item.question_end))
        for question in sorted(group.questions, key=lambda item: item.number)
    }

    return {
        "test_id": test.id,
        "title": test.title,
        "test_type": test.type.value,
        "format": test.format.value if hasattr(test, "format") and test.format else "full",
        "source": test.source.value if hasattr(test, "source") and test.source else None,
        "source_detail": test.source_detail,
        "access_type": test.access_type.value,
        "status": test.status.value,
        "version": test.version,
        "scope": scope,
        "mode": mode,
        "section_id": section_id,
        "exam_time_limit_min": int((test.exam_time_limit_seconds or 0) / 60),
        "time_limit_seconds": time_limit_seconds,
        "total_questions": total_questions,
        "audio_duration_seconds": audio_duration_seconds,
        "payment_paused": bool(test.payments_paused),
        "question_bank_enabled": False,
        "sections": [
            {
                "section_id": section.id,
                "section_number": section.position,
                "label": str(section.content.get("label") or section.title),
                "title": section.title,
                "subtitle": str(section.content.get("subtitle") or section.intro or ""),
                "intro": section.intro,
                "content": str(section.content.get("body") or section.intro or ""),
                "paragraphs": [
                    _serialize_paragraph_item(item)
                    for item in (
                        section.content.get("paragraphs")
                        or str(section.content.get("body") or section.intro or "").split("\n\n")
                    )
                    if _extract_paragraph_text(item).strip()
                ],
                "show_labels": bool(section.content.get("showLabels", False)),
                "question_count": sum(
                    mc_multiple_question_weight(
                        question_label=str(question.question_metadata.get("label") or question.number),
                        accepted_answers=[answer.value for answer in question.answer_variants],
                    )
                    if group.question_type.value.endswith("mc_multiple")
                    else 1
                    for group in section.question_groups
                    for question in group.questions
                ),
                "audio_url": normalize_storage_asset_path(section.content.get("audio_url")),
                "audio_duration_seconds": section.audio_duration_seconds,
                "transcript": str(section.transcript.get("text") or ""),
                "transcript_segments": _normalize_transcript_segments(section.transcript.get("segments")),
                "transcript_question_locations": _normalize_transcript_question_locations(
                    section.transcript.get("question_locations")
                ),
                "question_groups": [
                    _serialize_group(group, section_id=section.id, section_title=section.title)
                    for group in sorted(section.question_groups, key=lambda item: (item.question_start, item.question_end))
                ],
            }
            for section in selected_sections
        ],
        "answer_key": answer_key,
        "questions": [
            {
                "question_id": question.id,
                "question_number": question.number,
                "section_id": section.id,
                "section_title": section.title,
                "group_id": group.id,
                "group_title": group.title,
                "question_type": group.question_type.value,
                "prompt": question.prompt,
                "instructions": group.instructions or group.title,
                "label": str(question.question_metadata.get("label") or f"Q{question.number}"),
                "options": list(question.question_metadata.get("variants", [])) or list(
                    _sanitize_group_option_payload(
                        str(group.question_type.value),
                        secondary_block=group.shared_content.get("secondary_block"),
                        options_title=group.shared_content.get("options_title"),
                        shared_options=group.shared_options,
                    )[2]
                ),
                "selection_limit": question.question_metadata.get("selection_limit"),
                "word_limit": question.word_limit,
            }
            for section in selected_sections
            for group in sorted(section.question_groups, key=lambda item: (item.question_start, item.question_end))
            for question in sorted(group.questions, key=lambda item: item.number)
        ],
        "snapshot_at": test.updated_at,
    }
