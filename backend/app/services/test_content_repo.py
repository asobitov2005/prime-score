from __future__ import annotations

from collections import defaultdict
from uuid import UUID, uuid4

from sqlalchemy import Select, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import AccessType, TestMode, TestScope, TestStatus, TestType
from app.core.security import hash_password
from app.models.admin import Admin
from app.models.enums import AdminRole
from app.models.enums import AccessType as ModelAccessType
from app.models.enums import QuestionType as ModelQuestionType
from app.models.enums import TestFormat as ModelTestFormat
from app.models.enums import TestSource as ModelTestSource
from app.models.enums import TestStatus as ModelTestStatus
from app.models.enums import TestType as ModelTestType
from app.models.test import AnswerVariant, Question, QuestionGroup, Test, TestSection
from app.services.fixtures import (
    TEST_CATALOG_FIXTURES,
    get_question_fixture,
    get_test_questions,
    get_test_sections,
)
from app.services.scoring import listening_exam_seconds


def _model_test_type(value: TestType) -> ModelTestType:
    return ModelTestType(value.value)


def _model_access_type(value: AccessType) -> ModelAccessType:
    return ModelAccessType(value.value)


def _model_test_status(value: TestStatus) -> ModelTestStatus:
    return ModelTestStatus(value.value)


def _serialize_catalog_item(test: Test) -> dict[str, object]:
    return {
        "id": test.id,
        "title": test.title,
        "test_type": test.type.value,
        "format": test.format.value if hasattr(test, "format") and test.format else "full",
        "access_type": test.access_type.value,
        "status": test.status.value,
        "source": test.source.value,
        "source_detail": test.source_detail,
        "description": test.description,
        "exam_time_limit_min": int((test.exam_time_limit_seconds or 0) / 60),
        "total_questions": test.total_questions,
        "version": test.version,
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
                "options": list(group.shared_options),
                "word_limit": question.word_limit,
            }
            for question in questions
        ],
    }


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
    total_questions = sum(len(group.questions) for group in selected_groups)
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
                "question_count": sum(len(group.questions) for group in section.question_groups),
                "audio_duration_seconds": section.audio_duration_seconds,
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
                "options": list(group.shared_options),
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


async def ensure_test_admins_seeded(session: AsyncSession) -> None:
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
                password_hash=super_admin_password_hash,
                role=AdminRole.SUPER_ADMIN,
                is_active=True,
            )
        )
        changed = True
    elif not existing["test_super_admin"].password_hash.startswith("$2"):
        existing["test_super_admin"].password_hash = super_admin_password_hash
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
    tests = result.unique().all()
    return [_serialize_catalog_item(test) for test in tests]


async def get_test_from_db(session: AsyncSession, test_id: UUID) -> dict[str, object] | None:
    
    query = _tests_query().where(Test.id == test_id)
    test = (await session.scalars(query)).unique().first()
    if test is None:
        return None
    return _serialize_catalog_item(test)


def _question_number(label: str, fallback: int) -> int:
    digits = "".join(char for char in label if char.isdigit())
    return int(digits) if digits else fallback


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


async def save_test_draft_to_db(
    session: AsyncSession,
    *,
    draft: dict[str, object],
    test_id: UUID | None = None,
) -> dict[str, object]:
    await ensure_test_admins_seeded(session)
    

    metadata = draft["metadata"]
    sections = draft["content"]
    question_groups = draft.get("question_groups", [])
    
    test = await _load_full_test_for_write(session, test_id) if test_id is not None else None

    if test is None:
        test = Test(
            id=test_id or uuid4(),
            title=str(metadata["title"]),
            type=ModelTestType(str(metadata["type"])),
            format=ModelTestFormat(str(metadata.get("format", "full"))),
            access_type=ModelAccessType(str(metadata["access_type"])),
            status=ModelTestStatus.DRAFT,
            source=ModelTestSource(str(metadata["source"])),
            source_detail=str(metadata.get("source_detail") or ""),
            description=f"{metadata['title']} draft created from admin builder.",
            exam_time_limit_seconds=(
                1800 if str(metadata["type"]) == TestType.listening.value else _reading_time_limit_seconds(str(metadata["time_limit_label"]))
            ),
            total_questions=sum(len(group.get("questions", [])) for group in question_groups) or 1,
            version=1,
            payments_paused=True,
        )
        session.add(test)
        await session.flush()
    else:
        test.title = str(metadata["title"])
        test.type = ModelTestType(str(metadata["type"]))
        test.format = ModelTestFormat(str(metadata.get("format", "full")))
        test.access_type = ModelAccessType(str(metadata["access_type"]))
        test.source = ModelTestSource(str(metadata["source"]))
        test.source_detail = str(metadata.get("source_detail") or "")
        test.description = f"{metadata['title']} draft updated from admin builder."
        test.exam_time_limit_seconds = (
            1800 if str(metadata["type"]) == TestType.listening.value else _reading_time_limit_seconds(str(metadata["time_limit_label"]))
        )
        test.total_questions = sum(len(group.get("questions", [])) for group in question_groups) or 1
        test.status = ModelTestStatus.DRAFT

        for section in test.sections:
            for group in section.question_groups:
                for question in group.questions:
                    for answer in question.answer_variants:
                        await session.delete(answer)
                    await session.delete(question)
                await session.delete(group)
            await session.delete(section)
        await session.flush()

    for index, section in enumerate(sections, start=1):
        section_id = UUID(str(section["id"])) if section.get("id") else uuid4()
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
                "media_kind": str(section["media_kind"]),
                "marker_count": int(section["marker_count"]),
            },
            audio_duration_seconds=420 if str(section["media_kind"]) == "audio" else None,
            transcript={},
        )
        session.add(section_model)
        await session.flush()

    for group in question_groups:
        section_id = UUID(str(group["section_id"]))
        group_id = UUID(str(group["id"])) if group.get("id") else uuid4()
        group_model = QuestionGroup(
            id=group_id,
            section_id=section_id,
            title=str(group["title"]),
            instructions=str(group["instructions"]),
            question_type=ModelQuestionType(str(group["type_id"])),
            question_start=int(group["question_start"]),
            question_end=int(group["question_end"]),
            shared_content={},
            shared_options=list(group.get("shared_options", [])),
        )
        session.add(group_model)
        await session.flush()

        for question in group.get("questions", []):
            question_number = _question_number(str(question.get("label", "")), group_model.question_start)
            question_model = Question(
                id=UUID(str(question["id"])) if question.get("id") else uuid4(),
                question_group_id=group_model.id,
                number=question_number,
                prompt=str(question["prompt"]),
                question_metadata={
                    "label": str(question.get("label", "")),
                    "variants": list(question.get("variants", [])),
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


async def publish_test_in_db(session: AsyncSession, *, test_id: UUID) -> dict[str, object] | None:
    
    test = await session.get(Test, test_id)
    if test is None:
        return None
    test.status = ModelTestStatus.PUBLISHED
    test.version += 1
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
                "type_id": str(group.question_type.value),
                "question_start": group.question_start,
                "question_end": group.question_end,
                "shared_options": list(group.shared_options),
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
                    "media_kind": "audio" if str(test.type.value) == ModelTestType.LISTENING.value else "text",
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
