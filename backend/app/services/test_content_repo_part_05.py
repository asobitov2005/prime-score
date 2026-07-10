from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.test_content_repo_dependencies import *
from app.services.test_content_repo_part_01 import _build_unique_test_slug, _is_forbidden_test_guard_title, _resolve_admin_test_title, _sync_test_slug
from app.services.test_content_repo_part_02 import _serialize_admin_test
from app.services.test_content_repo_part_03 import ensure_test_admins_seeded
from app.services.test_content_repo_part_04 import _load_full_test_for_write, _normalize_transcript_question_locations, _normalize_transcript_segments, _question_number, _reading_time_limit_seconds, _sanitize_group_option_payload, _test_has_answer_history, _test_has_attempt_history

async def save_test_draft_to_db(
    session: AsyncSession,
    *,
    draft: dict[str, object],
    test_id: UUID | None = None,
    allow_new_version: bool = False,
) -> dict[str, object]:
    await ensure_test_admins_seeded(session)
    

    metadata = draft["metadata"]
    content = draft.get("content", [])
    if isinstance(content, dict):
        sections = list(content.get("sections", []))
    else:
        sections = list(content)

    raw_question_groups = draft.get("question_groups", draft.get("questionGroups", []))
    question_groups = list(raw_question_groups) if isinstance(raw_question_groups, list) else []

    weighted_total_questions = sum(
        mc_multiple_question_weight(
            question_label=str(question.get("label") or ""),
            accepted_answers=[str(answer) for answer in question.get("accepted_answers", [])],
        )
        if "mc_multiple" in str(group.get("type_id", ""))
        else 1
        for group in question_groups
        for question in group.get("questions", [])
    ) or 1
    
    test = await _load_full_test_for_write(session, test_id) if test_id is not None else None
    existing_test_for_title = test
    next_version = 1
    preserve_existing_version = False
    if test is not None:
        next_version = int(test.version)
        preserve_existing_version = (
            test.status != ModelTestStatus.DRAFT
            or await _test_has_attempt_history(session, test)
            or await _test_has_answer_history(session, test)
        )
        if preserve_existing_version:
            if not allow_new_version:
                raise ValueError("new_version_required")
            next_version = int(test.version) + 1
            test = None

    source_detail = normalize_test_source_detail(metadata["source"], metadata.get("source_detail"))
    resolved_title = await _resolve_admin_test_title(session, metadata=metadata, existing_test=existing_test_for_title)
    if _is_forbidden_test_guard_title(resolved_title):
        raise ValueError("test_guard_title_forbidden")

    if test is None:
        new_test_id = uuid4() if preserve_existing_version else (test_id or uuid4())
        new_test_type = ModelTestType(str(metadata["type"]))
        test = Test(
            id=new_test_id,
            slug=await _build_unique_test_slug(
                session,
                title=resolved_title,
                test_type=new_test_type,
                test_id=new_test_id,
            ),
            title=resolved_title,
            type=new_test_type,
            format=ModelTestFormat(str(metadata.get("format", "full"))),
            access_type=ModelAccessType(str(metadata["access_type"])),
            status=ModelTestStatus.DRAFT,
            source=ModelTestSource(str(metadata["source"])),
            source_detail=source_detail,
            description=f"{resolved_title} draft created from admin builder.",
            exam_time_limit_seconds=(
                1800 if str(metadata["type"]) == TestType.listening.value else _reading_time_limit_seconds(str(metadata["time_limit_label"]))
            ),
            total_questions=weighted_total_questions,
            version=next_version,
            payments_paused=True,
            review_status="needs_review",
        )
        session.add(test)
        await session.flush()
    else:
        test.title = resolved_title
        test.type = ModelTestType(str(metadata["type"]))
        test.format = ModelTestFormat(str(metadata.get("format", "full")))
        test.access_type = ModelAccessType(str(metadata["access_type"]))
        test.source = ModelTestSource(str(metadata["source"]))
        test.source_detail = source_detail
        test.description = f"{resolved_title} draft updated from admin builder."
        test.exam_time_limit_seconds = (
            1800 if str(metadata["type"]) == TestType.listening.value else _reading_time_limit_seconds(str(metadata["time_limit_label"]))
        )
        test.total_questions = weighted_total_questions
        test.status = ModelTestStatus.DRAFT
        test.review_status = "needs_review"
        await _sync_test_slug(session, test)

        for section in test.sections:
            for group in section.question_groups:
                for question in group.questions:
                    for answer in question.answer_variants:
                        await session.delete(answer)
                    await session.delete(question)
                await session.delete(group)
            await session.delete(section)
        await session.flush()

    section_id_map: dict[str, UUID] = {}

    for index, section in enumerate(sections, start=1):
        raw_section_id = str(section.get("id") or uuid4())
        section_id = (
            uuid4()
            if preserve_existing_version
            else (UUID(raw_section_id) if section.get("id") else uuid4())
        )
        section_id_map[raw_section_id] = section_id
        section_model = TestSection(
            id=section_id,
            test_id=test.id,
            position=index,
            title=str(section["title"]),
            intro=str(section["subtitle"]),
            content={
                "label": str(section["label"]),
                "subtitle": str(section["subtitle"]),
                "body": str(section["content"]),
                "paragraphs": section.get("paragraphs", []),
                "showLabels": bool(section.get("showLabels", False)),
                "media_kind": str(section["media_kind"]),
                "audio_url": normalize_storage_asset_path(section.get("audio_url")),
                "marker_count": int(section["marker_count"]),
            },
            audio_duration_seconds=(
                int(section["audio_duration_seconds"])
                if str(section["media_kind"]) == "audio" and section.get("audio_duration_seconds") is not None
                else (420 if str(section["media_kind"]) == "audio" else None)
            ),
            transcript={
                "text": str(section.get("transcript") or ""),
                "segments": _normalize_transcript_segments(section.get("transcript_segments")),
                "question_locations": _normalize_transcript_question_locations(
                    section.get("transcript_question_locations")
                ),
            },
        )
        session.add(section_model)
        await session.flush()

    for group in question_groups:
        raw_section_id = str(group["section_id"])
        section_id = section_id_map.get(raw_section_id)
        if section_id is None:
            raise KeyError("section_not_found_for_group")
        group_id = (
            uuid4()
            if preserve_existing_version
            else (UUID(str(group["id"])) if group.get("id") else uuid4())
        )
        secondary_block, options_title, shared_options = _sanitize_group_option_payload(
            str(group["type_id"]),
            secondary_block=group.get("secondary_block"),
            options_title=group.get("options_title"),
            shared_options=group.get("shared_options", []),
        )
        group_model = QuestionGroup(
            id=group_id,
            section_id=section_id,
            title=str(group.get("title") or "").strip(),
            instructions=str(group["instructions"]),
            question_type=ModelQuestionType(str(group["type_id"])),
            question_start=int(group["question_start"]),
            question_end=int(group["question_end"]),
            shared_content={
                "question_block": str(group.get("question_block") or ""),
                "answer_block": str(group.get("answer_block") or ""),
                "secondary_block": secondary_block,
                "options_title": options_title,
                "diagram_title": str(group.get("diagram_title") or ""),
                "diagram_image_url": normalize_storage_asset_path(group.get("diagram_image_url")),
            },
            shared_options=shared_options,
        )
        session.add(group_model)
        await session.flush()

        for question in group.get("questions", []):
            question_number = _question_number(str(question.get("label", "")), group_model.question_start)
            question_model = Question(
                id=(
                    uuid4()
                    if preserve_existing_version
                    else (UUID(str(question["id"])) if question.get("id") else uuid4())
                ),
                question_group_id=group_model.id,
                number=question_number,
                prompt=str(question["prompt"]),
                question_metadata={
                    "label": str(question.get("label", "")),
                    "variants": list(question.get("variants", [])),
                    "selection_limit": len(list(question.get("accepted_answers", []))) if "mc_multiple" in str(group["type_id"]) else None,
                },
                explanation=str(question["explanation"]),
                explanation_reference={},
                word_limit=None,
            )
            session.add(question_model)
            await session.flush()

            answers = list(question["accepted_answers"]) or [""]
            for answer_index, answer in enumerate(answers):
                session.add(
                    AnswerVariant(
                        question_id=question_model.id,
                        value=str(answer),
                        is_primary=answer_index == 0,
                    )
                )

    await session.commit()
    fresh = await _load_full_test_for_write(session, test.id)
    if fresh is None:
        raise KeyError("test_not_found")
    return _serialize_admin_test(fresh)
