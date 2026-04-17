from __future__ import annotations

from datetime import datetime, timezone
from uuid import NAMESPACE_URL, UUID, uuid5

from app.core.enums import (
    AccessType,
    QuestionType,
    TestMode,
    TestScope,
    TestSource,
    TestStatus,
    TestType,
)
from app.services.scoring import listening_exam_seconds

READING_TEST_ID = UUID("11111111-1111-1111-1111-111111111111")
LISTENING_TEST_ID = UUID("22222222-2222-2222-2222-222222222222")


def _uuid(seed: str) -> UUID:
    return uuid5(NAMESPACE_URL, f"primescore:{seed}")


READING_SECTION_IDS = (
    UUID("11111111-1111-1111-1111-111111111112"),
    UUID("11111111-1111-1111-1111-111111111113"),
    UUID("11111111-1111-1111-1111-111111111114"),
)
LISTENING_SECTION_IDS = (
    UUID("22222222-2222-2222-2222-222222222223"),
    UUID("22222222-2222-2222-2222-222222222224"),
    UUID("22222222-2222-2222-2222-222222222225"),
    UUID("22222222-2222-2222-2222-222222222226"),
)

READING_SECTIONS = [
    {
        "section_id": READING_SECTION_IDS[0],
        "section_number": 1,
        "title": "Passage 1",
        "intro": "Questions 1-13 are based on Passage 1.",
        "question_count": 13,
    },
    {
        "section_id": READING_SECTION_IDS[1],
        "section_number": 2,
        "title": "Passage 2",
        "intro": "Questions 14-26 are based on Passage 2.",
        "question_count": 13,
    },
    {
        "section_id": READING_SECTION_IDS[2],
        "section_number": 3,
        "title": "Passage 3",
        "intro": "Questions 27-40 are based on Passage 3.",
        "question_count": 14,
    },
]

LISTENING_SECTIONS = [
    {
        "section_id": LISTENING_SECTION_IDS[0],
        "section_number": 1,
        "title": "Part 1",
        "intro": "Conversation about a study tour booking.",
        "question_count": 10,
        "audio_duration_seconds": 420,
    },
    {
        "section_id": LISTENING_SECTION_IDS[1],
        "section_number": 2,
        "title": "Part 2",
        "intro": "Monologue about a public museum.",
        "question_count": 10,
        "audio_duration_seconds": 420,
    },
    {
        "section_id": LISTENING_SECTION_IDS[2],
        "section_number": 3,
        "title": "Part 3",
        "intro": "Discussion between two students and a tutor.",
        "question_count": 10,
        "audio_duration_seconds": 420,
    },
    {
        "section_id": LISTENING_SECTION_IDS[3],
        "section_number": 4,
        "title": "Part 4",
        "intro": "Lecture summary on wildlife migration.",
        "question_count": 10,
        "audio_duration_seconds": 420,
    },
]

TEST_CATALOG_FIXTURES: list[dict[str, object]] = [
    {
        "id": READING_TEST_ID,
        "title": "PrimeScore Reading Skeleton",
        "test_type": TestType.reading,
        "access_type": AccessType.public,
        "status": TestStatus.published,
        "source": TestSource.custom,
        "source_detail": "Backend skeleton fixture",
        "description": "Reading fixture with grouped passages, question types, and strict answer checking.",
        "exam_time_limit_min": 60,
        "total_questions": 40,
        "version": 1,
        "section_count": 3,
    },
    {
        "id": LISTENING_TEST_ID,
        "title": "PrimeScore Listening Skeleton",
        "test_type": TestType.listening,
        "access_type": AccessType.premium,
        "status": TestStatus.published,
        "source": TestSource.custom,
        "source_detail": "Backend skeleton fixture",
        "description": "Listening fixture with dynamic exam timing based on audio plus two minutes.",
        "exam_time_limit_min": 30,
        "total_questions": 40,
        "version": 1,
        "section_count": 4,
    },
]


def _make_question(
    *,
    test_key: str,
    section: dict[str, object],
    question_number: int,
    question_type: QuestionType,
    group_title: str,
    prompt: str,
    accepted_answers: list[str],
    options: list[str] | None = None,
    explanation: str | None = None,
    word_limit: int | None = None,
) -> dict[str, object]:
    question_id = _uuid(f"{test_key}:question:{question_number}")
    group_id = _uuid(f"{test_key}:group:{section['section_number']}:{group_title}")
    return {
        "question_id": question_id,
        "question_number": question_number,
        "section_id": section["section_id"],
        "section_title": section["title"],
        "group_id": group_id,
        "group_title": group_title,
        "question_type": question_type,
        "prompt": prompt,
        "instructions": group_title,
        "accepted_answers": accepted_answers,
        "options": options or [],
        "explanation": explanation
        or f"The accepted answer for question {question_number} is stored in fixture variants.",
        "word_limit": word_limit,
    }


def _build_reading_questions() -> list[dict[str, object]]:
    first, second, third = READING_SECTIONS
    questions: list[dict[str, object]] = [
        _make_question(
            test_key="reading",
            section=first,
            question_number=1,
            question_type=QuestionType.reading_true_false_not_given,
            group_title="Questions 1-5",
            prompt="The airframe project was first tested in a wind tunnel.",
            accepted_answers=["TRUE"],
            options=["TRUE", "FALSE", "NOT GIVEN"],
            explanation="Passage 1 states the first prototype was examined in a wind tunnel.",
        ),
        _make_question(
            test_key="reading",
            section=first,
            question_number=2,
            question_type=QuestionType.reading_true_false_not_given,
            group_title="Questions 1-5",
            prompt="The team abandoned glider testing after one failed launch.",
            accepted_answers=["FALSE"],
            options=["TRUE", "FALSE", "NOT GIVEN"],
        ),
        _make_question(
            test_key="reading",
            section=first,
            question_number=3,
            question_type=QuestionType.reading_true_false_not_given,
            group_title="Questions 1-5",
            prompt="The article identifies the exact cost of the early experiments.",
            accepted_answers=["NOT GIVEN"],
            options=["TRUE", "FALSE", "NOT GIVEN"],
        ),
        _make_question(
            test_key="reading",
            section=first,
            question_number=4,
            question_type=QuestionType.reading_true_false_not_given,
            group_title="Questions 1-5",
            prompt="Flight stability depended on wing shape and pilot balance.",
            accepted_answers=["TRUE"],
            options=["TRUE", "FALSE", "NOT GIVEN"],
        ),
        _make_question(
            test_key="reading",
            section=first,
            question_number=5,
            question_type=QuestionType.reading_true_false_not_given,
            group_title="Questions 1-5",
            prompt="The first public demonstration took place in Paris.",
            accepted_answers=["FALSE"],
            options=["TRUE", "FALSE", "NOT GIVEN"],
        ),
        _make_question(
            test_key="reading",
            section=first,
            question_number=6,
            question_type=QuestionType.reading_matching_headings,
            group_title="Questions 6-9",
            prompt="Paragraph A",
            accepted_answers=["iv"],
            options=["i", "ii", "iii", "iv", "v"],
        ),
        _make_question(
            test_key="reading",
            section=first,
            question_number=7,
            question_type=QuestionType.reading_matching_headings,
            group_title="Questions 6-9",
            prompt="Paragraph B",
            accepted_answers=["ii"],
            options=["i", "ii", "iii", "iv", "v"],
        ),
        _make_question(
            test_key="reading",
            section=first,
            question_number=8,
            question_type=QuestionType.reading_matching_headings,
            group_title="Questions 6-9",
            prompt="Paragraph C",
            accepted_answers=["v"],
            options=["i", "ii", "iii", "iv", "v"],
        ),
        _make_question(
            test_key="reading",
            section=first,
            question_number=9,
            question_type=QuestionType.reading_matching_headings,
            group_title="Questions 6-9",
            prompt="Paragraph D",
            accepted_answers=["i"],
            options=["i", "ii", "iii", "iv", "v"],
        ),
        _make_question(
            test_key="reading",
            section=first,
            question_number=10,
            question_type=QuestionType.reading_sentence_completion,
            group_title="Questions 10-13",
            prompt="The engineers completed the first successful launch in {{10}}.",
            accepted_answers=["1903", "nineteen hundred and three"],
            word_limit=4,
        ),
        _make_question(
            test_key="reading",
            section=first,
            question_number=11,
            question_type=QuestionType.reading_sentence_completion,
            group_title="Questions 10-13",
            prompt="They studied the movement of {{11}} before building the final design.",
            accepted_answers=["birds"],
            word_limit=2,
        ),
        _make_question(
            test_key="reading",
            section=first,
            question_number=12,
            question_type=QuestionType.reading_sentence_completion,
            group_title="Questions 10-13",
            prompt="The final frame used lightweight {{12}} tubing.",
            accepted_answers=["steel"],
            word_limit=2,
        ),
        _make_question(
            test_key="reading",
            section=first,
            question_number=13,
            question_type=QuestionType.reading_sentence_completion,
            group_title="Questions 10-13",
            prompt="The launch site was chosen because of its strong {{13}}.",
            accepted_answers=["winds", "wind currents"],
            word_limit=2,
        ),
    ]

    for number in range(14, 27):
        questions.append(
            _make_question(
                test_key="reading",
                section=second,
                question_number=number,
                question_type=QuestionType.reading_mc_single,
                group_title="Questions 14-26",
                prompt=f"Choose the correct option for reading question {number}.",
                accepted_answers=["A"],
                options=["A", "B", "C", "D"],
            )
        )

    for number in range(27, 41):
        questions.append(
            _make_question(
                test_key="reading",
                section=third,
                question_number=number,
                question_type=QuestionType.reading_short_answer,
                group_title="Questions 27-40",
                prompt=f"Write the short answer for reading question {number}.",
                accepted_answers=[f"answer {number}"],
                word_limit=3,
            )
        )

    return questions


def _build_listening_questions() -> list[dict[str, object]]:
    questions: list[dict[str, object]] = []
    for section_index, section in enumerate(LISTENING_SECTIONS, start=1):
        start = (section_index - 1) * 10 + 1
        end = start + 10
        for number in range(start, end):
            if section_index == 1:
                question_type = QuestionType.listening_form_completion
                accepted = [f"form {number}"]
            elif section_index == 2:
                question_type = QuestionType.listening_mc_single
                accepted = ["B"]
            elif section_index == 3:
                question_type = QuestionType.listening_matching
                accepted = ["C"]
            else:
                question_type = QuestionType.listening_sentence_completion
                accepted = [f"note {number}"]

            questions.append(
                _make_question(
                    test_key="listening",
                    section=section,
                    question_number=number,
                    question_type=question_type,
                    group_title=f"Questions {start}-{end - 1}",
                    prompt=f"Listening question {number} for {section['title']}.",
                    accepted_answers=accepted,
                    options=["A", "B", "C", "D"] if question_type == QuestionType.listening_mc_single else [],
                    explanation=f"{section['title']} fixture explanation for question {number}.",
                    word_limit=2 if question_type != QuestionType.listening_mc_single else None,
                )
            )
    return questions


QUESTION_FIXTURES: dict[UUID, list[dict[str, object]]] = {
    READING_TEST_ID: _build_reading_questions(),
    LISTENING_TEST_ID: _build_listening_questions(),
}


def get_test_catalog(
    test_type: TestType | None = None,
    access_type: AccessType | None = None,
    status: TestStatus | None = None,
) -> list[dict[str, object]]:
    items = TEST_CATALOG_FIXTURES
    if test_type is not None:
        items = [item for item in items if item["test_type"] == test_type]
    if access_type is not None:
        items = [item for item in items if item["access_type"] == access_type]
    if status is not None:
        items = [item for item in items if item["status"] == status]
    return [dict(item) for item in items]


def get_test_fixture(test_id: UUID) -> dict[str, object] | None:
    for item in TEST_CATALOG_FIXTURES:
        if item["id"] == test_id:
            return dict(item)
    return None


def get_test_sections(test_id: UUID) -> list[dict[str, object]]:
    if test_id == READING_TEST_ID:
        return [dict(item) for item in READING_SECTIONS]
    if test_id == LISTENING_TEST_ID:
        return [dict(item) for item in LISTENING_SECTIONS]
    return []


def get_test_questions(test_id: UUID, section_id: UUID | None = None) -> list[dict[str, object]]:
    questions = QUESTION_FIXTURES.get(test_id, [])
    if section_id is None:
        return [dict(item) for item in questions]
    return [dict(item) for item in questions if item["section_id"] == section_id]


def get_question_fixture(test_id: UUID, question_id: UUID) -> dict[str, object] | None:
    for item in QUESTION_FIXTURES.get(test_id, []):
        if item["question_id"] == question_id:
            return dict(item)
    return None


def _group_snapshot_items(questions: list[dict[str, object]]) -> list[dict[str, object]]:
    grouped: dict[UUID, dict[str, object]] = {}
    for question in questions:
        group = grouped.setdefault(
            question["group_id"],
            {
                "group_id": question["group_id"],
                "group_title": question["group_title"],
                "question_type": question["question_type"],
                "question_start": question["question_number"],
                "question_end": question["question_number"],
                "questions": [],
            },
        )
        group["question_start"] = min(group["question_start"], question["question_number"])
        group["question_end"] = max(group["question_end"], question["question_number"])
        group["questions"].append(
            {
                "question_id": question["question_id"],
                "question_number": question["question_number"],
                "section_id": question["section_id"],
                "section_title": question["section_title"],
                "group_id": question["group_id"],
                "group_title": question["group_title"],
                "question_type": question["question_type"],
                "prompt": question["prompt"],
                "instructions": question["instructions"],
                "options": question["options"],
                "word_limit": question["word_limit"],
            }
        )

    return sorted(grouped.values(), key=lambda item: item["question_start"])


def build_test_snapshot(
    *,
    test_id: UUID,
    scope: TestScope,
    mode: str,
    section_id: UUID | None = None,
) -> dict[str, object] | None:
    fixture = get_test_fixture(test_id)
    if fixture is None:
        return None

    all_sections = get_test_sections(test_id)
    selected_sections = all_sections
    if scope == TestScope.section:
        selected_sections = [section for section in all_sections if section["section_id"] == section_id] or [all_sections[0]]

    selected_section_ids = {section["section_id"] for section in selected_sections}
    selected_questions = [
        question for question in get_test_questions(test_id) if question["section_id"] in selected_section_ids
    ]
    total_questions = len(selected_questions)

    audio_duration_seconds = None
    if fixture["test_type"] == TestType.listening:
        audio_duration_seconds = sum(
            int(section.get("audio_duration_seconds", 0)) for section in selected_sections
        )

    if fixture["test_type"] == TestType.reading:
        full_time_limit_seconds = 60 * 60
    else:
        full_time_limit_seconds = listening_exam_seconds(audio_duration_seconds or 0)

    snapshot_sections = []
    for section in selected_sections:
        section_questions = [q for q in selected_questions if q["section_id"] == section["section_id"]]
        snapshot_sections.append(
            {
                **section,
                "question_groups": _group_snapshot_items(section_questions),
            }
        )

    snapshot = {
        "test_id": test_id,
        "title": fixture["title"],
        "test_type": fixture["test_type"],
        "access_type": fixture["access_type"],
        "status": fixture["status"],
        "version": fixture["version"],
        "scope": scope,
        "mode": TestMode(mode),
        "section_id": section_id,
        "exam_time_limit_min": fixture["exam_time_limit_min"],
        "time_limit_seconds": full_time_limit_seconds if scope == TestScope.full else max(300, total_questions * 120),
        "total_questions": total_questions,
        "audio_duration_seconds": audio_duration_seconds,
        "payment_paused": True,
        "question_bank_enabled": False,
        "sections": snapshot_sections,
        "questions": [
            {
                "question_id": question["question_id"],
                "question_number": question["question_number"],
                "section_id": question["section_id"],
                "section_title": question["section_title"],
                "group_id": question["group_id"],
                "group_title": question["group_title"],
                "question_type": question["question_type"],
                "prompt": question["prompt"],
                "instructions": question["instructions"],
                "options": question["options"],
                "word_limit": question["word_limit"],
            }
            for question in selected_questions
        ],
        "snapshot_at": datetime.now(timezone.utc),
    }
    return snapshot


def build_admin_draft_state(
    *,
    test_id: UUID | None = None,
    test_type: TestType | None = None,
) -> dict[str, object]:
    fixture = get_test_fixture(test_id) if test_id is not None else None
    if fixture is None:
        candidate_type = test_type or TestType.reading
        fixture = next(
            item for item in TEST_CATALOG_FIXTURES if item["test_type"] == candidate_type
        )

    resolved_test_id = UUID(str(fixture["id"]))
    resolved_test_type = TestType(str(fixture["test_type"]))
    snapshot = build_test_snapshot(
        test_id=resolved_test_id,
        scope=TestScope.full,
        mode=TestMode.practice.value,
    )
    if snapshot is None:
        raise KeyError("test_not_found")

    time_limit_label = (
        "Audio duration + 2 minutes"
        if resolved_test_type == TestType.listening
        else f"{fixture['exam_time_limit_min']} minutes"
    )
    sections = [
        {
            "id": section["section_id"],
            "label": section["title"],
            "title": section["title"],
            "subtitle": str(section.get("intro") or "Structured content block"),
            "content": (
                f"{section['title']} draft content. Keep all question markers in {{N}} format and "
                f"author unique material directly inside this test version."
            ),
            "media_kind": "audio" if resolved_test_type == TestType.listening else "text",
            "marker_count": int(section["question_count"]),
        }
        for section in snapshot["sections"]
    ]
    questions = [
        {
            "id": question["question_id"],
            "section_id": question["section_id"],
            "label": f"Q{question['question_number']}",
            "type_id": str(question["question_type"]),
            "prompt": question["prompt"],
            "accepted_answers": list(get_question_fixture(resolved_test_id, question["question_id"])["accepted_answers"]),
            "explanation": str(get_question_fixture(resolved_test_id, question["question_id"])["explanation"]),
            "variants": list(question["options"]),
        }
        for question in snapshot["questions"]
    ]

    return {
        "metadata": {
            "title": fixture["title"],
            "type": resolved_test_type.value,
            "source": str(fixture["source"]),
            "source_detail": str(fixture["source_detail"]),
            "access_type": str(fixture["access_type"]),
            "status": str(fixture["status"]),
            "version": int(fixture["version"]),
            "time_limit_label": time_limit_label,
        },
        "content": {
            "sections": sections,
        },
        "questions": questions,
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
                    "detail": f"{len(sections)} sections are attached directly to this versioned test draft.",
                },
                {
                    "id": "questions",
                    "label": "Question inventory attached",
                    "status": "ready",
                    "detail": f"{len(questions)} questions keep their accepted answers and explanations inside the draft.",
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


LEADERBOARD_FIXTURES: list[dict[str, object]] = [
    {
        "rank": 1,
        "user_id": UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        "display_name": "Ali T.",
        "test_type": TestType.reading,
        "band_score": 8.5,
        "attempts_count": 45,
        "show_on_leaderboard": True,
    },
    {
        "rank": 2,
        "user_id": UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        "display_name": "Maria K.",
        "test_type": TestType.listening,
        "band_score": 8.0,
        "attempts_count": 38,
        "show_on_leaderboard": True,
    },
    {
        "rank": 3,
        "user_id": UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
        "display_name": "You",
        "test_type": TestType.reading,
        "band_score": 6.5,
        "attempts_count": 23,
        "show_on_leaderboard": True,
    },
]
