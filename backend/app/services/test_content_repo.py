from __future__ import annotations

from collections import defaultdict
import logging
import re
import unicodedata
from uuid import UUID, uuid4

from sqlalchemy import Select, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import AccessType, TestMode, TestScope, TestStatus, TestType
from app.core.security import hash_password
from app.models.admin import Admin
from app.models.enums import AdminRole
from app.models.enums import AttemptStatus as ModelAttemptStatus
from app.models.enums import AccessType as ModelAccessType
from app.models.enums import QuestionType as ModelQuestionType
from app.models.enums import TestFormat as ModelTestFormat
from app.models.enums import TestSource as ModelTestSource
from app.models.enums import TestStatus as ModelTestStatus
from app.models.enums import TestType as ModelTestType
from app.models.attempt import Attempt, UserAnswer
from app.models.test import AnswerVariant, Question, QuestionGroup, Test, TestSection, TestSlugRedirect
from app.services.admin_example_reading_seed import (
    ADMIN_EXAMPLE_READING_TEST_ID,
    build_admin_example_reading_draft,
)
from app.services.fixtures import (
    LISTENING_TEST_ID,
    TEST_CATALOG_FIXTURES,
    get_question_fixture,
    get_test_questions,
    get_test_sections,
)
from app.services.object_storage import normalize_storage_asset_path
from app.services.scoring import listening_exam_seconds, mc_multiple_question_weight
from app.services.snapshots import freeze_test_snapshot
from app.services.test_source import normalize_test_source_detail

logger = logging.getLogger(__name__)


def _model_test_type(value: TestType) -> ModelTestType:
    return ModelTestType(value.value)


def _model_access_type(value: AccessType) -> ModelAccessType:
    return ModelAccessType(value.value)


def _model_test_status(value: TestStatus) -> ModelTestStatus:
    return ModelTestStatus(value.value)


_EXAM_PRACTICE_TITLE_RE = re.compile(r"^Exam Practice Test (\d+)$", re.IGNORECASE)
_EXAM_PRACTICE_PLACEHOLDER_RE = re.compile(r"^Exam Practice Test$", re.IGNORECASE)
_CUSTOM_TEST_SUFFIX_RE = re.compile(r"^(?P<base>.+?)\s+-\s+Test\s+(?P<number>\d+)$", re.IGNORECASE)
_SLUG_SEPARATOR_RE = re.compile(r"[^a-z0-9]+")


def _slugify_test_title(title: str | None, *, fallback: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(title or ""))
    ascii_title = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = _SLUG_SEPARATOR_RE.sub("-", ascii_title).strip("-")
    return slug or fallback


async def _is_test_slug_available(session: AsyncSession, *, slug: str, test_id: UUID) -> bool:
    existing_test_id = await session.scalar(select(Test.id).where(Test.slug == slug))
    if existing_test_id is not None and existing_test_id != test_id:
        return False

    existing_redirect_test_id = await session.scalar(select(TestSlugRedirect.test_id).where(TestSlugRedirect.slug == slug))
    if existing_redirect_test_id is not None and existing_redirect_test_id != test_id:
        return False

    return True


async def _build_unique_test_slug(
    session: AsyncSession,
    *,
    title: str,
    test_type: ModelTestType | str,
    test_id: UUID,
) -> str:
    raw_type = test_type.value if hasattr(test_type, "value") else str(test_type)
    base = _slugify_test_title(title, fallback=f"{raw_type or 'test'}-test")[:300].strip("-")
    base = base or "test"

    candidate = base
    suffix = 2
    while not await _is_test_slug_available(session, slug=candidate, test_id=test_id):
        suffix_text = f"-{suffix}"
        candidate = f"{base[:320 - len(suffix_text)]}{suffix_text}".strip("-")
        suffix += 1
    return candidate


async def _sync_test_slug(session: AsyncSession, test: Test) -> None:
    next_slug = await _build_unique_test_slug(
        session,
        title=test.title,
        test_type=test.type,
        test_id=test.id,
    )
    current_slug = str(getattr(test, "slug", "") or "").strip()
    if current_slug == next_slug:
        return

    if current_slug:
        existing_redirect = await session.scalar(
            select(TestSlugRedirect).where(TestSlugRedirect.slug == current_slug)
        )
        if existing_redirect is None:
            session.add(TestSlugRedirect(slug=current_slug, test_id=test.id))
        elif existing_redirect.test_id != test.id:
            logger.warning("Slug redirect collision for %s while updating test %s", current_slug, test.id)

    test.slug = next_slug


def _is_exam_practice_auto_title(value: str | None) -> bool:
    if not value:
        return False
    return _EXAM_PRACTICE_TITLE_RE.fullmatch(value.strip()) is not None


def _is_exam_practice_placeholder_title(value: str | None) -> bool:
    if not value:
        return False
    stripped = value.strip()
    return _EXAM_PRACTICE_PLACEHOLDER_RE.fullmatch(stripped) is not None or _is_exam_practice_auto_title(stripped)


def _extract_custom_test_number(value: str | None) -> int | None:
    if not value:
        return None
    stripped = value.strip()
    exam_practice_match = _EXAM_PRACTICE_TITLE_RE.fullmatch(stripped)
    if exam_practice_match:
        return int(exam_practice_match.group(1))
    custom_suffix_match = _CUSTOM_TEST_SUFFIX_RE.fullmatch(stripped)
    if custom_suffix_match:
        return int(custom_suffix_match.group("number"))
    return None


def _title_number_parts(value: str | None, *, limit: int = 4) -> tuple[int, ...]:
    parts = [int(match) for match in re.findall(r"\d+", str(value or ""))]
    trimmed = parts[:limit]
    if len(trimmed) < limit:
        trimmed.extend([-1] * (limit - len(trimmed)))
    return tuple(trimmed)


def _is_quick_fix_format_compatible(
    *,
    test_type: str,
    current_format: str,
    requested_format: str,
    section_count: int,
) -> bool:
    if requested_format == current_format:
        return True

    if section_count != 1:
        return False

    allowed_formats = (
        {"full", "passage_1", "passage_2", "passage_3"}
        if test_type == TestType.reading.value
        else {"full", "part_1", "part_2", "part_3", "part_4"}
    )
    return current_format in allowed_formats and requested_format in allowed_formats


async def _refresh_in_progress_attempt_snapshots_for_test(
    session: AsyncSession,
    *,
    test_id: UUID,
) -> None:
    attempts = list(
        (
            await session.scalars(
                select(Attempt).where(
                    Attempt.test_id == test_id,
                    Attempt.status == ModelAttemptStatus.IN_PROGRESS,
                )
            )
        ).all()
    )
    if not attempts:
        return

    for attempt in attempts:
        snapshot = await build_test_snapshot_from_db(
            session,
            test_id=test_id,
            scope=TestScope(attempt.scope.value),
            mode=TestMode(attempt.mode.value),
            section_id=attempt.section_id,
        )
        if snapshot is None:
            continue

        frozen_snapshot = freeze_test_snapshot(snapshot)
        attempt.test_snapshot = frozen_snapshot
        attempt.max_score = int(frozen_snapshot.get("total_questions", attempt.max_score or 0))
        attempt.time_limit_seconds = int(frozen_snapshot.get("time_limit_seconds", attempt.time_limit_seconds or 0))


def _strip_custom_test_suffix(value: str | None) -> str:
    if not value:
        return ""
    stripped = value.strip()
    custom_suffix_match = _CUSTOM_TEST_SUFFIX_RE.fullmatch(stripped)
    if custom_suffix_match:
        return custom_suffix_match.group("base").strip()
    return stripped


async def _build_next_exam_practice_title(session: AsyncSession, *, test_type: ModelTestType) -> str:
    titles = list(
        (
            await session.scalars(
                select(Test.title).where(
                    Test.source == ModelTestSource.CUSTOM,
                    Test.type == test_type,
                )
            )
        ).all()
    )
    max_number = 0
    for title in titles:
        number = _extract_custom_test_number(str(title or "").strip())
        if number is not None:
            max_number = max(max_number, number)
    return f"Exam Practice Test {max_number + 1}"


async def _resolve_admin_test_title(
    session: AsyncSession,
    *,
    metadata: dict[str, object],
    existing_test: Test | None = None,
) -> str:
    explicit_title = str(metadata.get("title") or "").strip()
    source = ModelTestSource(str(metadata["source"]))
    test_type = ModelTestType(str(metadata["type"]))
    if source != ModelTestSource.CUSTOM:
        return explicit_title

    if explicit_title and not _is_exam_practice_placeholder_title(explicit_title):
        explicit_base_title = _strip_custom_test_suffix(explicit_title)
        if existing_test is not None and existing_test.source == ModelTestSource.CUSTOM:
            existing_number = _extract_custom_test_number(existing_test.title)
            if existing_number is not None:
                return f"{explicit_base_title} - Test {existing_number}"
        next_number = _extract_custom_test_number(await _build_next_exam_practice_title(session, test_type=test_type))
        if next_number is not None:
            return f"{explicit_base_title} - Test {next_number}"
        return explicit_base_title

    existing_title = ""
    if existing_test is not None and existing_test.source == ModelTestSource.CUSTOM:
        existing_title = str(existing_test.title or "").strip()

    if existing_title:
        return existing_title

    return await _build_next_exam_practice_title(session, test_type=test_type)


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
    questions = sorted(group.questions, key=lambda item: item.number)
    return {
        "group_id": group.id,
        "group_title": group.title,
        "question_type": group.question_type.value,
        "question_start": group.question_start,
        "question_end": group.question_end,
        "shared_options": list(group.shared_options),
        "shared_content": {
            "question_block": str(group.shared_content.get("question_block") or ""),
            "answer_block": str(group.shared_content.get("answer_block") or ""),
            "secondary_block": str(group.shared_content.get("secondary_block") or ""),
            "options_title": str(group.shared_content.get("options_title") or ""),
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
                "options": list(question.question_metadata.get("variants", [])) or list(group.shared_options),
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
                "options": list(question.question_metadata.get("variants", [])) or list(group.shared_options),
                "selection_limit": question.question_metadata.get("selection_limit"),
                "word_limit": question.word_limit,
            }
            for section in selected_sections
            for group in sorted(section.question_groups, key=lambda item: (item.question_start, item.question_end))
            for question in sorted(group.questions, key=lambda item: item.number)
        ],
        "snapshot_at": test.updated_at,
    }


async def ensure_fixture_tests_seeded(session: AsyncSession) -> None:
    count = await session.scalar(select(func.count()).select_from(Test))
    if count and count > 0:
        return

    for fixture in TEST_CATALOG_FIXTURES:
        test = Test(
            id=fixture["id"],
            slug=str(fixture["slug"]),
            title=str(fixture["title"]),
            type=ModelTestType(str(fixture["test_type"])),
            format=ModelTestFormat.FULL,
            access_type=ModelAccessType(str(fixture["access_type"])),
            status=ModelTestStatus(str(fixture["status"])),
            source=ModelTestSource(str(fixture["source"])),
            source_detail=str(fixture["source_detail"]),
            exam_date=fixture.get("exam_date"),
            description=str(fixture["description"]) if fixture.get("description") else None,
            exam_time_limit_seconds=int(fixture["exam_time_limit_min"]) * 60,
            total_questions=int(fixture["total_questions"]),
            version=int(fixture["version"]),
            payments_paused=True,
            review_status="approved",
        )
        session.add(test)

        sections = get_test_sections(UUID(str(fixture["id"])))
        questions = get_test_questions(UUID(str(fixture["id"])))
        grouped_questions: dict[UUID, list[dict[str, object]]] = defaultdict(list)
        for question in questions:
            grouped_questions[UUID(str(question["group_id"]))].append(question)

        for section in sections:
            section_model = TestSection(
                id=section["section_id"],
                test_id=test.id,
                position=int(section["section_number"]),
                title=str(section["title"]),
                intro=str(section.get("intro") or ""),
                content={"intro": str(section.get("intro") or "")},
                audio_duration_seconds=(
                    int(section["audio_duration_seconds"])
                    if section.get("audio_duration_seconds") is not None
                    else None
                ),
                transcript={},
            )
            session.add(section_model)

        for group_id, group_questions in grouped_questions.items():
            first = group_questions[0]
            group_model = QuestionGroup(
                id=group_id,
                section_id=UUID(str(first["section_id"])),
                title=str(first["group_title"]),
                instructions=str(first["instructions"]),
                question_type=ModelQuestionType(str(first["question_type"])),
                question_start=min(int(item["question_number"]) for item in group_questions),
                question_end=max(int(item["question_number"]) for item in group_questions),
                shared_content={},
                shared_options=list(first["options"]),
            )
            session.add(group_model)

            for item in sorted(group_questions, key=lambda row: int(row["question_number"])):
                question_model = Question(
                    id=item["question_id"],
                    question_group_id=group_model.id,
                    number=int(item["question_number"]),
                    prompt=str(item["prompt"]),
                    question_metadata={
                        "instructions": str(item["instructions"]),
                        "options": list(item["options"]),
                    },
                    explanation=str(item["explanation"]),
                    explanation_reference={},
                    word_limit=int(item["word_limit"]) if item["word_limit"] is not None else None,
                )
                session.add(question_model)

                for index, answer in enumerate(item["accepted_answers"]):
                    session.add(
                        AnswerVariant(
                            question_id=question_model.id,
                            value=str(answer),
                            is_primary=index == 0,
                        )
                    )

    await session.commit()


async def ensure_admin_example_tests_seeded(session: AsyncSession) -> None:
    existing = await session.get(Test, ADMIN_EXAMPLE_READING_TEST_ID)
    if existing is not None:
        return

    await save_test_draft_to_db(
        session,
        draft=build_admin_example_reading_draft(),
        test_id=ADMIN_EXAMPLE_READING_TEST_ID,
    )


async def ensure_test_admins_seeded(session: AsyncSession) -> None:
    seeded_contact = {
        "admin": ("+998900000001", 900000001),
        "test_admin": ("+998900000002", 900000002),
        "test_super_admin": ("+998900000003", 900000003),
    }
    admins = (
        await session.scalars(select(Admin).where(Admin.username.in_(["test_admin", "test_super_admin", "admin"])))
    ).all()
    existing = {admin.username: admin for admin in admins}
    changed = False
    admin_password_hash = hash_password("TestAdmin123!")
    super_admin_password_hash = hash_password("TestSuperAdmin123!")
    simple_admin_password_hash = hash_password("admin")
    
    if "admin" not in existing:
        session.add(
            Admin(
                username="admin",
                email="admin@primescore.local",
                phone_number=seeded_contact["admin"][0],
                telegram_id=seeded_contact["admin"][1],
                password_hash=simple_admin_password_hash,
                role=AdminRole.SUPER_ADMIN,
                is_active=True,
            )
        )
        changed = True
    elif not existing["admin"].password_hash.startswith("$2"):
        existing["admin"].password_hash = simple_admin_password_hash
        changed = True
        
    if "test_admin" not in existing:
        session.add(
            Admin(
                username="test_admin",
                email="test-admin@primescore.local",
                phone_number=seeded_contact["test_admin"][0],
                telegram_id=seeded_contact["test_admin"][1],
                password_hash=admin_password_hash,
                role=AdminRole.ADMIN,
                is_active=True,
            )
        )
        changed = True
    elif not existing["test_admin"].password_hash.startswith("$2"):
        existing["test_admin"].password_hash = admin_password_hash
        changed = True
    if "test_super_admin" not in existing:
        session.add(
            Admin(
                username="test_super_admin",
                email="test-superadmin@primescore.local",
                phone_number=seeded_contact["test_super_admin"][0],
                telegram_id=seeded_contact["test_super_admin"][1],
                password_hash=super_admin_password_hash,
                role=AdminRole.SUPER_ADMIN,
                is_active=True,
            )
        )
        changed = True
    elif not existing["test_super_admin"].password_hash.startswith("$2"):
        existing["test_super_admin"].password_hash = super_admin_password_hash
        changed = True

    for username, (phone_number, telegram_id) in seeded_contact.items():
        admin = existing.get(username)
        if admin is None:
            continue
        if admin.phone_number != phone_number:
            admin.phone_number = phone_number
            changed = True
        if admin.telegram_id != telegram_id:
            admin.telegram_id = telegram_id
            changed = True

    if changed:
        await session.commit()


def _tests_query() -> Select[tuple[Test]]:
    return (
        select(Test)
        .options(
            selectinload(Test.sections)
            .selectinload(TestSection.question_groups)
            .selectinload(QuestionGroup.questions)
            .selectinload(Question.answer_variants),
        )
        .order_by(Test.created_at.desc())
    )


async def list_tests_from_db(
    session: AsyncSession,
    *,
    test_type: TestType | None = None,
    access_type: AccessType | None = None,
    status_filter: TestStatus | None = None,
    test_format: str | None = None,
    source: str | None = None,
) -> list[dict[str, object]]:

    query = _tests_query()
    if test_type is not None:
        query = query.where(Test.type == _model_test_type(test_type))
    if access_type is not None:
        query = query.where(Test.access_type == _model_access_type(access_type))
    if status_filter is not None:
        query = query.where(Test.status == _model_test_status(status_filter))
    if test_format is not None and test_format != "all":
        query = query.where(Test.format == ModelTestFormat(test_format))
    if source is not None and source != "":
        query = query.where(Test.source == ModelTestSource(source))
    result = await session.scalars(query)
    tests = [
        test
        for test in result.unique().all()
        if test.id != LISTENING_TEST_ID
    ]
    tests.sort(
        key=lambda test: (
            test.source == ModelTestSource.CUSTOM,
            (_extract_custom_test_number(test.title) or -1)
            if test.source == ModelTestSource.CUSTOM
            else -1,
            *_title_number_parts(test.title),
            test.created_at,
        ),
        reverse=True,
    )
    return [_serialize_catalog_item(test) for test in tests]


async def get_test_from_db(session: AsyncSession, test_id: UUID) -> dict[str, object] | None:
    
    query = _tests_query().where(Test.id == test_id)
    test = (await session.scalars(query)).unique().first()
    if test is None or test.id == LISTENING_TEST_ID:
        return None
    return _serialize_catalog_item(test)


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
                "secondary_block": str(group.get("secondary_block") or ""),
                "options_title": str(group.get("options_title") or ""),
                "diagram_title": str(group.get("diagram_title") or ""),
                "diagram_image_url": normalize_storage_asset_path(group.get("diagram_image_url")),
            },
            shared_options=list(group.get("shared_options", [])),
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
        group_model.shared_content = {
            "question_block": str(group_payload.get("question_block") or ""),
            "answer_block": str(group_payload.get("answer_block") or ""),
            "secondary_block": str(group_payload.get("secondary_block") or ""),
            "options_title": str(group_payload.get("options_title") or ""),
            "diagram_title": str(group_payload.get("diagram_title") or ""),
            "diagram_image_url": normalize_storage_asset_path(group_payload.get("diagram_image_url")),
        }
        group_model.shared_options = list(group_payload.get("shared_options", []))

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

            raw_question_label = str(question_payload.get("label") or "").strip()
            question_number = (
                _question_number(raw_question_label, group_model.question_start)
                if raw_question_label
                else int(question_model.number)
            )
            if int(question_model.number) != int(question_number):
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
    from app.core.enums import NotificationType
    from app.services.notification_sender import notify_all_users

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

    test_type = test.type.value if hasattr(test.type, "value") else str(test.type)
    test_title = test.title
    body = f'"{test_title}" ({test_type}) test has been published. Try it now!'
    test.review_status = "approved"

    await session.commit()
    refreshed = await _load_full_test_for_write(session, test_id)

    try:
        await notify_all_users(
            session,
            type=NotificationType.new_test,
            title="New test available!",
            body=body,
            telegram_text=f"📝 <b>New test available!</b>\n\n{body}",
            inline_keyboard=[[{"text": "🚀 Try Now", "url": f"https://primescore.uz/tests/{test.slug}"}]],
        )
        await session.commit()
    except Exception:
        await session.rollback()
        logger.exception("Failed to send publish notifications for test %s", test_id)
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
            
            question_groups.append({
                "id": group.id,
                "section_id": section.id,
                "title": group.title,
                "instructions": group.instructions or "",
                "options_title": str(group.shared_content.get("options_title") or ""),
                "type_id": str(group.question_type.value),
                "question_start": group.question_start,
                "question_end": group.question_end,
                "shared_options": list(group.shared_options),
                "question_block": str(group.shared_content.get("question_block") or ""),
                "answer_block": str(
                    group.shared_content.get("answer_block")
                    or (
                        _rebuild_matching_headings_answer_block(group)
                        if str(group.question_type.value) == ModelQuestionType.READING_MATCHING_HEADINGS.value
                        else ""
                    )
                ),
                "secondary_block": str(
                    group.shared_content.get("secondary_block")
                    or "\n".join(str(option) for option in group.shared_options)
                ),
                "options_title": str(group.shared_content.get("options_title") or ""),
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
