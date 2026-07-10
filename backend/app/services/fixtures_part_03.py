from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.fixtures_dependencies import *
from app.services.fixtures_part_01 import TEST_CATALOG_FIXTURES
from app.services.fixtures_part_02 import get_question_fixture, get_test_fixture, get_test_questions, get_test_sections

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
