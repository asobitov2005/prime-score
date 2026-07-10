from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.test_content_repo_dependencies import *
from app.services.test_content_repo_part_04 import _load_full_test_for_write, _normalize_transcript_question_locations, _normalize_transcript_segments, _rebuild_matching_headings_answer_block, _sanitize_group_option_payload

async def build_admin_draft_state_from_db(
    session: AsyncSession,
    *,
    test_id: UUID,
) -> dict[str, object] | None:
    test = await _load_full_test_for_write(session, test_id)
    if test is None:
        return None
    ordered_sections = sorted(test.sections, key=lambda item: item.position)
    
    question_groups = []
    all_questions_flat = []
    
    for section in ordered_sections:
        for group in sorted(section.question_groups, key=lambda item: (item.question_start, item.question_end)):
            group_questions = []
            for question in sorted(group.questions, key=lambda item: item.number):
                q_row = {
                    "id": question.id,
                    "label": str(question.question_metadata.get("label") or f"Q{question.number}"),
                    "prompt": question.prompt,
                    "accepted_answers": [answer.value for answer in question.answer_variants],
                    "explanation": question.explanation or "",
                    "variants": list(question.question_metadata.get("variants", [])),
                }
                group_questions.append(q_row)
                all_questions_flat.append({**q_row, "section_id": section.id, "type_id": str(group.question_type.value)})
            
            secondary_block, options_title, shared_options = _sanitize_group_option_payload(
                str(group.question_type.value),
                secondary_block=group.shared_content.get("secondary_block"),
                options_title=group.shared_content.get("options_title"),
                shared_options=group.shared_options,
            )
            question_groups.append({
                "id": group.id,
                "section_id": section.id,
                "title": group.title,
                "instructions": group.instructions or "",
                "options_title": options_title,
                "type_id": str(group.question_type.value),
                "question_start": group.question_start,
                "question_end": group.question_end,
                "shared_options": shared_options,
                "question_block": str(group.shared_content.get("question_block") or ""),
                "answer_block": str(
                    group.shared_content.get("answer_block")
                    or (
                        _rebuild_matching_headings_answer_block(group)
                        if str(group.question_type.value) == ModelQuestionType.READING_MATCHING_HEADINGS.value
                        else ""
                    )
                ),
                "secondary_block": secondary_block,
                "diagram_title": str(group.shared_content.get("diagram_title") or ""),
                "diagram_image_url": normalize_storage_asset_path(group.shared_content.get("diagram_image_url")),
                "questions": group_questions
            })

    return {
        "metadata": {
            "title": test.title,
            "type": str(test.type.value),
            "format": str(test.format.value) if hasattr(test, "format") and test.format else "full",
            "source": str(test.source.value),
            "source_detail": str(test.source_detail or ""),
            "access_type": str(test.access_type.value),
            "status": str(test.status.value),
            "version": int(test.version),
            "time_limit_label": (
                "Audio duration + 2 minutes"
                if str(test.type.value) == TestType.listening.value
                else f"{int((test.exam_time_limit_seconds or 3600) / 60)} minutes"
            ),
        },
        "content": {
            "sections": [
                {
                    "id": section.id,
                    "label": str(section.content.get("label") or section.title),
                    "title": section.title,
                    "subtitle": str(section.content.get("subtitle") or section.intro or "Structured content block"),
                    "content": str(section.content.get("body") or section.intro or ""),
                    "paragraphs": list(section.content.get("paragraphs", [])),
                    "showLabels": bool(section.content.get("showLabels", False)),
                    "media_kind": "audio" if str(test.type.value) == ModelTestType.LISTENING.value else "text",
                    "audio_url": normalize_storage_asset_path(section.content.get("audio_url")),
                    "audio_duration_seconds": section.audio_duration_seconds,
                    "transcript": str(section.transcript.get("text") or ""),
                    "transcript_segments": _normalize_transcript_segments(section.transcript.get("segments")),
                    "transcript_question_locations": _normalize_transcript_question_locations(
                        section.transcript.get("question_locations")
                    ),
                    "marker_count": sum(len(group.questions) for group in section.question_groups),
                }
                for section in ordered_sections
            ]
        },
        "questionGroups": question_groups,
        "questions": all_questions_flat, # Keep for safety
        "review": {
            "checklist": [
                {
                    "id": "metadata",
                    "label": "Metadata is locked",
                    "status": "ready",
                    "detail": "Type, access, source, and timing policy are present in the structured draft.",
                },
                {
                    "id": "content",
                    "label": "Section content prepared",
                    "status": "ready",
                    "detail": f"{len(ordered_sections)} sections are attached directly to this versioned test draft.",
                },
                {
                    "id": "questions",
                    "label": "Question inventory attached",
                    "status": "ready",
                    "detail": f"{len(all_questions_flat)} questions keep their accepted answers and explanations inside the draft.",
                },
            ],
            "notes": [
                "Reusable question bank remains out of scope for this product version.",
                "Payment stays paused in the implementation sequence, but subscription structures remain reserved.",
                "Published edits must create a new version so old attempt snapshots remain stable.",
            ],
        },
        "decisions": {
            "question_bank": {
                "label": "Reusable Question Bank",
                "state": "not_supported",
                "detail": "Every question stays unique to its parent test. Reuse and shared bank workflows are intentionally excluded.",
            },
            "payment": {
                "label": "Payment activation",
                "state": "paused",
                "detail": "Checkout remains paused while the core Reading and Listening platform is being finalized.",
            },
            "listening_timer": {
                "label": "Listening exam timer",
                "state": "audio_duration_plus_2_minutes",
                "detail": "Full Listening exam attempts freeze uploaded audio duration plus two minutes into the attempt snapshot.",
            },
        },
    }

async def db_test_content_available(session: AsyncSession) -> bool:
    try:
        
        return True
    except SQLAlchemyError:
        await session.rollback()
        return False
