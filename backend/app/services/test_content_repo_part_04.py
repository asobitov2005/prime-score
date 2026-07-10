from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.test_content_repo_dependencies import *
from app.services.test_content_repo_part_02 import _serialize_catalog_item
from app.services.test_content_repo_part_03 import _tests_query, get_test_from_db

async def get_test_by_identifier_from_db(session: AsyncSession, identifier: str) -> dict[str, object] | None:
    try:
        return await get_test_from_db(session, UUID(identifier))
    except ValueError:
        pass

    normalized_identifier = identifier.strip().lower()
    if not normalized_identifier:
        return None

    query = _tests_query().where(Test.slug == normalized_identifier)
    test = (await session.scalars(query)).unique().first()
    if test is not None and test.id != LISTENING_TEST_ID:
        return _serialize_catalog_item(test)

    redirect_test_id = await session.scalar(
        select(TestSlugRedirect.test_id).where(TestSlugRedirect.slug == normalized_identifier)
    )
    if redirect_test_id is None:
        return None
    return await get_test_from_db(session, redirect_test_id)

def _question_number(label: str, fallback: int) -> int:
    match = re.search(r"\d+", label)
    return int(match.group(0)) if match else fallback

def _group_type_uses_option_bank(type_id: str) -> bool:
    type_str = str(type_id).lower()
    if "matching_information" in type_str or "plan_map_labeling" in type_str:
        return False
    if "wordbank" in type_str:
        return True
    if "listening_matching" in type_str:
        return True
    if "matching_headings" in type_str:
        return True
    if "matching_features" in type_str:
        return True
    if "matching_sentence_endings" in type_str:
        return True
    if "matching" in type_str:
        return True
    return False

def _sanitize_group_option_payload(
    type_id: str,
    *,
    secondary_block: object,
    options_title: object,
    shared_options: object,
) -> tuple[str, str, list[str]]:
    normalized_shared_options = (
        [str(option) for option in shared_options]
        if isinstance(shared_options, list)
        else []
    )
    type_str = str(type_id).lower()

    if _group_type_uses_option_bank(type_id):
        return (
            str(secondary_block or ""),
            str(options_title or ""),
            normalized_shared_options,
        )

    cleared_secondary = ""
    cleared_title = ""
    if "matching_information" in type_str or "plan_map_labeling" in type_str:
        return cleared_secondary, cleared_title, normalized_shared_options

    return cleared_secondary, cleared_title, []

def _matching_option_value(option: str) -> str:
    stripped = option.strip()
    prefix_match = stripped.split(".", 1)
    if len(prefix_match) == 2 and prefix_match[0].strip():
        return prefix_match[0].strip()
    return stripped

def _extract_paragraph_label(prompt: str) -> str | None:
    cleaned = prompt.strip()
    if not cleaned:
        return None
    if cleaned.lower().startswith("paragraph "):
        suffix = cleaned[10:].strip()
        return suffix[:1].upper() if suffix else None
    return cleaned[:1].upper()

def _normalize_transcript_segments(raw_segments: object) -> list[dict[str, object]]:
    normalized: list[dict[str, object]] = []
    if not isinstance(raw_segments, list):
        return normalized
    for index, raw_segment in enumerate(raw_segments, start=1):
        if not isinstance(raw_segment, dict):
            continue
        text = str(raw_segment.get("text") or "").strip()
        if not text:
            continue
        start_sec = max(0.0, float(raw_segment.get("start_sec") or 0))
        end_sec = max(start_sec, float(raw_segment.get("end_sec") or start_sec))
        item: dict[str, object] = {
            "id": str(raw_segment.get("id") or f"segment-{index}"),
            "start_sec": round(start_sec, 2),
            "end_sec": round(end_sec, 2),
            "text": text,
        }
        speaker = str(raw_segment.get("speaker") or "").strip()
        if speaker:
            item["speaker"] = speaker
        if raw_segment.get("confidence") is not None:
            item["confidence"] = round(float(raw_segment.get("confidence") or 0), 4)
        if raw_segment.get("drift_start_sec") is not None:
            item["drift_start_sec"] = round(abs(float(raw_segment.get("drift_start_sec") or 0)), 2)
        if raw_segment.get("drift_end_sec") is not None:
            item["drift_end_sec"] = round(abs(float(raw_segment.get("drift_end_sec") or 0)), 2)
        if raw_segment.get("needs_review") is not None:
            item["needs_review"] = bool(raw_segment.get("needs_review"))
        normalized.append(item)
    return normalized

def _normalize_transcript_question_locations(raw_locations: object) -> list[dict[str, object]]:
    normalized: list[dict[str, object]] = []
    if not isinstance(raw_locations, list):
        return normalized
    for raw_location in raw_locations:
        if not isinstance(raw_location, dict):
            continue
        question_label = str(raw_location.get("question_label") or "").strip()
        if not question_label:
            continue
        start_sec = max(0.0, float(raw_location.get("start_sec") or 0))
        end_sec = max(start_sec, float(raw_location.get("end_sec") or start_sec))
        normalized.append(
            {
                "question_id": raw_location.get("question_id"),
                "question_label": question_label,
                "question_prompt": str(raw_location.get("question_prompt") or "").strip(),
                "start_sec": round(start_sec, 2),
                "end_sec": round(end_sec, 2),
                "answer_text": str(raw_location.get("answer_text") or "").strip(),
                "correct_answer": str(raw_location.get("correct_answer") or "").strip(),
            }
        )
    return normalized

def _rebuild_matching_headings_answer_block(group: QuestionGroup) -> str:
    question_by_answer: dict[str, str] = {}
    for question in sorted(group.questions, key=lambda item: item.number):
        label = _extract_paragraph_label(question.prompt)
        if not label:
            continue
        for answer in question.answer_variants:
            value = answer.value.strip()
            if value:
                question_by_answer[value] = label
    answer_lines = []
    for option in group.shared_options:
        option_value = _matching_option_value(str(option))
        if option_value in question_by_answer:
            answer_lines.append(question_by_answer[option_value])
    return "\n".join(answer_lines)

def _reading_time_limit_seconds(label: str) -> int:
    digits = "".join(char for char in label if char.isdigit())
    minutes = int(digits) if digits else 60
    return minutes * 60

async def _load_full_test_for_write(session: AsyncSession, test_id: UUID) -> Test | None:
    query = (
        select(Test)
        .options(
            selectinload(Test.sections)
            .selectinload(TestSection.question_groups)
            .selectinload(QuestionGroup.questions)
            .selectinload(Question.answer_variants)
        )
        .where(Test.id == test_id)
    )
    return (await session.scalars(query)).unique().first()

async def _test_has_attempt_history(session: AsyncSession, test: Test) -> bool:
    linked_attempts = await session.scalar(
        select(func.count())
        .select_from(Attempt)
        .where(Attempt.test_id == test.id)
    )
    return bool(linked_attempts and linked_attempts > 0)

async def _test_has_answer_history(session: AsyncSession, test: Test) -> bool:
    question_ids = [
        question.id
        for section in test.sections
        for group in section.question_groups
        for question in group.questions
    ]
    if not question_ids:
        return False

    linked_answers = await session.scalar(
        select(func.count())
        .select_from(UserAnswer)
        .where(UserAnswer.question_id.in_(question_ids))
    )
    return bool(linked_answers and linked_answers > 0)

async def delete_draft_test_from_db(session: AsyncSession, *, test_id: UUID) -> str | None:
    test = await _load_full_test_for_write(session, test_id)
    if test is None:
        return None

    if test.status != ModelTestStatus.DRAFT:
        raise ValueError("only_draft_can_be_deleted")

    attempt_count = await session.scalar(
        select(func.count())
        .select_from(Attempt)
        .where(Attempt.test_id == test_id)
    )
    if attempt_count and attempt_count > 0:
        test.status = ModelTestStatus.ARCHIVED
        await session.commit()
        return "archived"

    for section in test.sections:
        for group in section.question_groups:
            for question in group.questions:
                for answer in question.answer_variants:
                    await session.delete(answer)
                await session.delete(question)
            await session.delete(group)
        await session.delete(section)

    await session.flush()
    await session.delete(test)
    await session.commit()
    return "deleted"
