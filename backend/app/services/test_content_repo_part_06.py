from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.test_content_repo_dependencies import *
from app.services.test_content_repo_part_01 import _is_quick_fix_format_compatible, _refresh_in_progress_attempt_snapshots_for_test, _resolve_admin_test_title, _sync_test_slug
from app.services.test_content_repo_part_02 import _serialize_admin_test, _serialize_snapshot_from_test
from app.services.test_content_repo_part_03 import _tests_query, ensure_test_admins_seeded
from app.services.test_content_repo_part_04 import _load_full_test_for_write, _normalize_transcript_question_locations, _normalize_transcript_segments, _reading_time_limit_seconds, _sanitize_group_option_payload

async def quick_fix_published_test_in_db(
    session: AsyncSession,
    *,
    draft: dict[str, object],
    test_id: UUID,
) -> dict[str, object] | None:
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

    test = await _load_full_test_for_write(session, test_id)
    if test is None:
        return None
    if test.status != ModelTestStatus.PUBLISHED:
        raise ValueError("only_published_can_be_quick_fixed")

    requested_type = str(metadata["type"])
    requested_format = str(metadata.get("format", "full"))
    requested_time_limit_seconds = (
        1800
        if requested_type == TestType.listening.value
        else _reading_time_limit_seconds(str(metadata["time_limit_label"]))
    )
    if requested_type != test.type.value:
        raise ValueError("quick_fix_requires_new_version")

    existing_sections = sorted(test.sections, key=lambda item: item.position)
    if not _is_quick_fix_format_compatible(
        test_type=requested_type,
        current_format=test.format.value,
        requested_format=requested_format,
        section_count=len(existing_sections),
    ):
        raise ValueError("quick_fix_requires_new_version")

    if len(sections) != len(existing_sections):
        raise ValueError("quick_fix_requires_new_version")

    existing_section_ids = [str(section.id) for section in existing_sections]
    payload_section_ids = [str(section.get("id") or "") for section in sections]
    if payload_section_ids != existing_section_ids:
        raise ValueError("quick_fix_requires_new_version")

    existing_section_by_id = {str(section.id): section for section in existing_sections}
    existing_group_by_id = {
        str(group.id): group
        for section in existing_sections
        for group in section.question_groups
    }

    payload_group_ids = [str(group.get("id") or "") for group in question_groups]
    if len(payload_group_ids) != len(existing_group_by_id) or set(payload_group_ids) != set(existing_group_by_id):
        raise ValueError("quick_fix_requires_new_version")

    payload_question_ids = [
        str(question.get("id") or "")
        for group in question_groups
        for question in group.get("questions", [])
    ]
    existing_question_by_id = {
        str(question.id): question
        for group in existing_group_by_id.values()
        for question in group.questions
    }
    if len(payload_question_ids) != len(existing_question_by_id) or set(payload_question_ids) != set(existing_question_by_id):
        raise ValueError("quick_fix_requires_new_version")

    resolved_title = await _resolve_admin_test_title(session, metadata=metadata, existing_test=test)
    test.title = resolved_title
    test.format = ModelTestFormat(requested_format)
    test.access_type = ModelAccessType(str(metadata["access_type"]))
    test.source = ModelTestSource(str(metadata["source"]))
    test.source_detail = normalize_test_source_detail(metadata["source"], metadata.get("source_detail"))
    test.description = f"{resolved_title} quick fixed from admin builder."
    test.total_questions = weighted_total_questions
    test.exam_time_limit_seconds = requested_time_limit_seconds
    await _sync_test_slug(session, test)

    for index, section_payload in enumerate(sections, start=1):
        section_id = str(section_payload.get("id") or "")
        section_model = existing_section_by_id.get(section_id)
        if section_model is None:
            raise ValueError("quick_fix_requires_new_version")

        existing_media_kind = str(section_model.content.get("media_kind") or ("audio" if section_model.audio_duration_seconds else "text"))
        next_media_kind = str(section_payload["media_kind"])
        next_marker_count = int(section_payload["marker_count"])
        if existing_media_kind != next_media_kind:
            raise ValueError("quick_fix_requires_new_version")

        section_model.title = str(section_payload["title"])
        section_model.intro = str(section_payload["subtitle"])
        section_model.content = {
            "label": str(section_payload["label"]),
            "subtitle": str(section_payload["subtitle"]),
            "body": str(section_payload["content"]),
            "paragraphs": section_payload.get("paragraphs", []),
            "showLabels": bool(section_payload.get("showLabels", False)),
            "media_kind": next_media_kind,
            "audio_url": normalize_storage_asset_path(section_payload.get("audio_url")),
            "marker_count": next_marker_count,
        }
        section_model.audio_duration_seconds = (
            int(section_payload.get("audio_duration_seconds"))
            if next_media_kind == "audio" and section_payload.get("audio_duration_seconds") is not None
            else (420 if next_media_kind == "audio" else None)
        )
        section_model.transcript = {
            "text": str(section_payload.get("transcript") or ""),
            "segments": _normalize_transcript_segments(section_payload.get("transcript_segments")),
            "question_locations": _normalize_transcript_question_locations(
                section_payload.get("transcript_question_locations")
            ),
        }

    for group_payload in question_groups:
        group_id = str(group_payload.get("id") or "")
        group_model = existing_group_by_id.get(group_id)
        if group_model is None:
            raise ValueError("quick_fix_requires_new_version")

        section_id = str(group_payload["section_id"])
        expected_section = existing_section_by_id.get(section_id)
        if (
            expected_section is None
            or group_model.section_id != expected_section.id
        ):
            raise ValueError("quick_fix_requires_new_version")

        group_model.title = str(group_payload.get("title") or "").strip()
        group_model.instructions = str(group_payload["instructions"])
        secondary_block, options_title, shared_options = _sanitize_group_option_payload(
            str(group_payload["type_id"]),
            secondary_block=group_payload.get("secondary_block"),
            options_title=group_payload.get("options_title"),
            shared_options=group_payload.get("shared_options", []),
        )
        group_model.shared_content = {
            "question_block": str(group_payload.get("question_block") or ""),
            "answer_block": str(group_payload.get("answer_block") or ""),
            "secondary_block": secondary_block,
            "options_title": options_title,
            "diagram_title": str(group_payload.get("diagram_title") or ""),
            "diagram_image_url": normalize_storage_asset_path(group_payload.get("diagram_image_url")),
        }
        group_model.shared_options = shared_options

        group_question_map = {str(question.id): question for question in group_model.questions}
        payload_questions = list(group_payload.get("questions", []))
        payload_group_question_ids = [str(question.get("id") or "") for question in payload_questions]
        if len(payload_group_question_ids) != len(group_question_map) or set(payload_group_question_ids) != set(group_question_map):
            raise ValueError("quick_fix_requires_new_version")

        for question_payload in payload_questions:
            question_id = str(question_payload.get("id") or "")
            question_model = group_question_map.get(question_id)
            if question_model is None:
                raise ValueError("quick_fix_requires_new_version")

            question_model.prompt = str(question_payload["prompt"])
            question_model.question_metadata = {
                "label": str(question_payload.get("label", "")),
                "variants": list(question_payload.get("variants", [])),
                "selection_limit": len(list(question_payload.get("accepted_answers", []))) if "mc_multiple" in str(group_payload["type_id"]) else None,
            }
            question_model.explanation = str(question_payload["explanation"])

            for answer in list(question_model.answer_variants):
                await session.delete(answer)
            await session.flush()

            answers = list(question_payload.get("accepted_answers", [])) or [""]
            for answer_index, answer in enumerate(answers):
                session.add(
                    AnswerVariant(
                        question_id=question_model.id,
                        value=str(answer),
                        is_primary=answer_index == 0,
                    )
                )

    await _refresh_in_progress_attempt_snapshots_for_test(session, test_id=test.id)
    await session.commit()
    fresh = await _load_full_test_for_write(session, test.id)
    if fresh is None:
        raise KeyError("test_not_found")
    return _serialize_admin_test(fresh)

async def publish_test_in_db(session: AsyncSession, *, test_id: UUID) -> dict[str, object] | None:
    test = await session.get(Test, test_id)
    if test is None:
        return None
    if test.status == ModelTestStatus.PUBLISHED:
        refreshed = await _load_full_test_for_write(session, test_id)
        return _serialize_admin_test(refreshed) if refreshed is not None else None

    existing_published_versions = (
        await session.scalars(
            select(Test).where(
                Test.id != test.id,
                Test.status == ModelTestStatus.PUBLISHED,
                Test.type == test.type,
                Test.format == test.format,
                Test.source == test.source,
                Test.title == test.title,
                func.coalesce(Test.source_detail, "") == (test.source_detail or ""),
            )
        )
    ).all()
    for existing in existing_published_versions:
        existing.status = ModelTestStatus.ARCHIVED

    test.status = ModelTestStatus.PUBLISHED
    test.version += 1
    await _sync_test_slug(session, test)

    test.review_status = "approved"

    await session.commit()
    refreshed = await _load_full_test_for_write(session, test_id)
    return _serialize_admin_test(refreshed) if refreshed is not None else None

async def build_test_snapshot_from_db(
    session: AsyncSession,
    *,
    test_id: UUID,
    scope: TestScope,
    mode: TestMode,
    section_id: UUID | None = None,
) -> dict[str, object] | None:
    
    query = _tests_query().where(Test.id == test_id)
    test = (await session.scalars(query)).unique().first()
    if test is None:
        return None
    return _serialize_snapshot_from_test(test, scope=scope, mode=mode, section_id=section_id)
