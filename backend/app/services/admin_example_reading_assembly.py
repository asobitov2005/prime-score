from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.admin_example_reading_common import *


def assemble_admin_example_reading_draft(
    *,
    section_one,
    section_two,
    section_three,
    passage_one_groups,
    passage_two_groups,
    passage_three_groups,
):
    sections = [section_one, section_two, section_three]
    question_groups = [
        *passage_one_groups,
        *passage_two_groups,
        *passage_three_groups,
    ]
    questions = [
        question
        for group in question_groups
        for question in group.get("questions", [])
    ]
    return {
        "metadata": {
            "id": ADMIN_EXAMPLE_READING_TEST_ID,
            "title": "Admin Example Reading Full 40",
            "type": "reading",
            "format": "full",
            "source": "custom",
            "source_detail": "Exam Practice Tests",
            "access_type": "public",
            "time_limit_label": "60 minutes",
        },
        "content": {"sections": sections},
        "questionGroups": question_groups,
        "questions": questions,
    }
