from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.fixtures_dependencies import *
from app.services.fixtures_part_01 import LISTENING_SECTIONS, LISTENING_TEST_ID, READING_SECTIONS, READING_TEST_ID, TEST_CATALOG_FIXTURES, _make_question

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
