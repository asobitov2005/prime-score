from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.test_content_repo_dependencies import *
from app.services.test_content_repo_part_01 import _extract_custom_test_number, _model_access_type, _model_test_status, _model_test_type, _title_number_parts
from app.services.test_content_repo_part_02 import _serialize_catalog_item


async def ensure_fixture_tests_seeded(session: AsyncSession) -> None:
    fixture_ids = [UUID(str(fixture["id"])) for fixture in TEST_CATALOG_FIXTURES]
    existing_ids = set(
        (
            await session.scalars(select(Test.id).where(Test.id.in_(fixture_ids)))
        ).all()
    )
    missing_fixtures = [
        fixture
        for fixture in TEST_CATALOG_FIXTURES
        if UUID(str(fixture["id"])) not in existing_ids
    ]
    if not missing_fixtures:
        return

    for fixture in missing_fixtures:
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
    from app.services.test_content_repo_part_05 import save_test_draft_to_db

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
