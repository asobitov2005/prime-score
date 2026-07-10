from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.fixtures_dependencies import *

READING_TEST_ID = UUID("11111111-1111-1111-1111-111111111111")

LISTENING_TEST_ID = UUID("22222222-2222-2222-2222-222222222222")

FIXTURE_CREATED_AT = datetime(2026, 1, 1, tzinfo=timezone.utc)

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
        "slug": "primescore-reading-skeleton",
        "title": "PrimeScore Reading Skeleton",
        "test_type": TestType.reading,
        "access_type": AccessType.public,
        "status": TestStatus.published,
        "source": TestSource.custom,
        "source_detail": "Exam Practice Tests",
        "description": "Reading fixture with grouped passages, question types, and strict answer checking.",
        "exam_time_limit_min": 60,
        "total_questions": 40,
        "version": 1,
        "section_count": 3,
        "created_at": FIXTURE_CREATED_AT,
        "updated_at": FIXTURE_CREATED_AT,
    },
    {
        "id": LISTENING_TEST_ID,
        "slug": "primescore-listening-skeleton",
        "title": "PrimeScore Listening Skeleton",
        "test_type": TestType.listening,
        "access_type": AccessType.premium,
        "status": TestStatus.published,
        "source": TestSource.custom,
        "source_detail": "Exam Practice Tests",
        "description": "Listening fixture with dynamic exam timing based on audio plus two minutes.",
        "exam_time_limit_min": 30,
        "total_questions": 40,
        "version": 1,
        "section_count": 4,
        "created_at": FIXTURE_CREATED_AT,
        "updated_at": FIXTURE_CREATED_AT,
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
        "explanation_reference": {"quote": "Mock reference text for fixture"},
        "word_limit": word_limit,
    }
