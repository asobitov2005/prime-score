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
    question_groups = [
            *passage_one_groups,
            *passage_two_groups,
            *passage_three_groups,
        ]
    return {
        "metadata": {
            "title": "Admin Example Reading Full 40",
            "type": "reading",
            "format": "full",
            "source": "custom",
            "source_detail": "Exam Practice Tests",
            "access_type": "public",
            "time_limit_label": "60 minutes",
        },
        "content": [
            section_one,
            section_two,
            section_three,
        ],
        "question_groups": question_groups,
    }
