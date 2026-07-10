from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.admin_example_reading_common import *

def build_passage_two_groups(passage_two_word_bank):
    passage_two_groups = [
            _make_group(
                key="passage-2-yng",
                section_index=2,
                title="Questions 14-18",
                instructions="""
                Do the following statements agree with the claims of the writer in the Reading Passage?

                In boxes on your answer sheet, write:

                YES if the statement agrees with the claims of the writer
                NO if the statement contradicts the claims of the writer
                NOT GIVEN if it is impossible to say what the writer thinks about this
                """,
                type_id="reading_yes_no_not_given",
                question_start=14,
                question_end=18,
                question_block="""
                Local repair methods are always more useful than large dams.
                Farmers should be treated as designers, not just recipients of advice.
                Satellite data has no role in dryland planning.
                Stone lines improve fields partly by trapping soil.
                Short political funding cycles can work against restoration projects.
                """,
                answer_block="""
                NO
                YES
                NOT GIVEN
                YES
                YES
                """,
                questions=[
                    _make_question(
                        number=14,
                        prompt="Local repair methods are always more useful than large dams.",
                        accepted_answers=["NO"],
                        explanation="Paragraph A explicitly says large dams are not always useless.",
                    ),
                    _make_question(
                        number=15,
                        prompt="Farmers should be treated as designers, not just recipients of advice.",
                        accepted_answers=["YES"],
                        explanation="Paragraph C states that cultivators should be treated as designers rather than passive recipients.",
                    ),
                    _make_question(
                        number=16,
                        prompt="Satellite data has no role in dryland planning.",
                        accepted_answers=["NOT GIVEN"],
                        explanation="The writer never discusses satellite data.",
                    ),
                    _make_question(
                        number=17,
                        prompt="Stone lines improve fields partly by trapping soil.",
                        accepted_answers=["YES"],
                        explanation="Paragraph B says the lines trap moving sediment.",
                    ),
                    _make_question(
                        number=18,
                        prompt="Short political funding cycles can work against restoration projects.",
                        accepted_answers=["YES"],
                        explanation="Paragraph E says short funding cycles rarely reward slow restoration work.",
                    ),
                ],
            ),
            _make_group(
                key="passage-2-matching-information",
                section_index=2,
                title="Questions 19-22",
                instructions="""
                Which paragraph contains the following information?

                Write the correct letter, A-E, in boxes on your answer sheet.

                NB You may use any letter more than once.
                """,
                type_id="reading_matching_information",
                question_start=19,
                question_end=22,
                shared_options=["A", "B", "C", "D", "E"],
                question_block="""
                a reference to an expensive approach that often failed to help farms
                an explanation of how soil is physically held back on a field
                an example of farmers testing several versions of one method
                a legal or ownership issue that discourages long-term work
                """,
                answer_block="""
                A
                B
                C
                E
                """,
                questions=[
                    _make_question(
                        number=19,
                        prompt="a reference to an expensive approach that often failed to help farms",
                        accepted_answers=["A"],
                        explanation="Paragraph A criticises costly showcase schemes.",
                    ),
                    _make_question(
                        number=20,
                        prompt="an explanation of how soil is physically held back on a field",
                        accepted_answers=["B"],
                        explanation="Paragraph B describes runoff slowing and sediment being trapped.",
                    ),
                    _make_question(
                        number=21,
                        prompt="an example of farmers testing several versions of one method",
                        accepted_answers=["C"],
                        explanation="Paragraph C lists farmer-led adjustments to gaps, widths, and passages.",
                    ),
                    _make_question(
                        number=22,
                        prompt="a legal or ownership issue that discourages long-term work",
                        accepted_answers=["E"],
                        explanation="Paragraph E refers to insecure access to land.",
                    ),
                ],
            ),
            _make_group(
                key="passage-2-summary-wordbank",
                section_index=2,
                title="Questions 23-26",
                instructions="""
                Complete the summary using the list of words, A-H, below.

                Write the correct letter, A-H, in boxes on your answer sheet.
                """,
                type_id="reading_summary_completion_wordbank",
                question_start=23,
                question_end=26,
                shared_options=passage_two_word_bank,
                secondary_block="\n".join(passage_two_word_bank),
                question_block="""
                * Summary
                To rebuild exhausted land, farmers first place lines of stone along the [] of a field. These barriers slow rainwater [] and capture []. In a few seasons, crops such as [] can be planted again.
                """,
                answer_block="""
                A
                B
                G
                E
                """,
                questions=[
                    _make_question(
                        number=23,
                        prompt="Blank 23",
                        accepted_answers=["A", "contour"],
                        explanation="Paragraph B says farmers follow the field's contour.",
                    ),
                    _make_question(
                        number=24,
                        prompt="Blank 24",
                        accepted_answers=["B", "runoff"],
                        explanation="Paragraph B says the line slows runoff.",
                    ),
                    _make_question(
                        number=25,
                        prompt="Blank 25",
                        accepted_answers=["G", "sediment"],
                        explanation="Paragraph B says the line traps moving sediment.",
                    ),
                    _make_question(
                        number=26,
                        prompt="Blank 26",
                        accepted_answers=["E", "millet"],
                        explanation="The summary refers to crops growing again; millet is the crop option that fits.",
                    ),
                ],
            ),
        ]
    return passage_two_groups
