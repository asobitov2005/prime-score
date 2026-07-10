from __future__ import annotations

from app.services.admin_example_reading_assembly import (
    assemble_admin_example_reading_draft,
)
from app.services.admin_example_reading_common import (
    ADMIN_EXAMPLE_READING_TEST_ID,
    _make_group,
    _make_question,
    _make_section,
    _paragraphs_from_content,
    _uuid,
)
from app.services.admin_example_reading_passage_one import (
    build_passage_one_groups,
)
from app.services.admin_example_reading_passage_three import (
    build_passage_three_groups,
)
from app.services.admin_example_reading_passage_three_questions import (
    build_passage_three_questions,
)
from app.services.admin_example_reading_passage_two import (
    build_passage_two_groups,
)
from app.services.admin_example_reading_sections import (
    build_sections_and_options,
)


def build_admin_example_reading_draft() -> dict[str, object]:
    (
        section_one,
        section_two,
        section_three,
        passage_one_headings,
        passage_two_word_bank,
    ) = build_sections_and_options()
    passage_one_groups = build_passage_one_groups(passage_one_headings)
    passage_two_groups = build_passage_two_groups(passage_two_word_bank)
    passage_three_mc_questions = build_passage_three_questions()
    passage_three_groups = build_passage_three_groups(
        passage_three_mc_questions
    )
    return assemble_admin_example_reading_draft(
        section_one=section_one,
        section_two=section_two,
        section_three=section_three,
        passage_one_groups=passage_one_groups,
        passage_two_groups=passage_two_groups,
        passage_three_groups=passage_three_groups,
    )


__all__ = [
    "ADMIN_EXAMPLE_READING_TEST_ID",
    "build_admin_example_reading_draft",
]
