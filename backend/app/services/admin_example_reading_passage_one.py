from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.admin_example_reading_common import *

def build_passage_one_groups(passage_one_headings):
    passage_one_groups = [
            _make_group(
                key="passage-1-headings",
                section_index=1,
                title="Questions 1-5",
                instructions="""
                Choose the correct heading for each paragraph from the list of headings below.

                Write the correct number, i-v, in boxes on your answer sheet.
                """,
                type_id="reading_matching_headings",
                question_start=1,
                question_end=5,
                shared_options=passage_one_headings,
                answer_block="""
                C
                D
                E
                B
                A
                """,
                secondary_block="\n".join(passage_one_headings),
                questions=[
                    _make_question(
                        number=1,
                        prompt="Paragraph A",
                        accepted_answers=["v"],
                        explanation="Paragraph A introduces the village's long-term shortage and dependence on tanker deliveries.",
                    ),
                    _make_question(
                        number=2,
                        prompt="Paragraph B",
                        accepted_answers=["iv"],
                        explanation="Paragraph B explains how Salazar realised the local fog itself could be collected.",
                    ),
                    _make_question(
                        number=3,
                        prompt="Paragraph C",
                        accepted_answers=["i"],
                        explanation="Paragraph C focuses on the residents' design changes and repair routine.",
                    ),
                    _make_question(
                        number=4,
                        prompt="Paragraph D",
                        accepted_answers=["ii"],
                        explanation="Paragraph D describes school attendance and the cooperative garden.",
                    ),
                    _make_question(
                        number=5,
                        prompt="Paragraph E",
                        accepted_answers=["iii"],
                        explanation="Paragraph E makes clear that fog harvesting cannot cover the driest months on its own.",
                    ),
                ],
            ),
            _make_group(
                key="passage-1-tfng",
                section_index=1,
                title="Questions 6-10",
                instructions="""
                Do the following statements agree with the information given in the Reading Passage?

                In boxes on your answer sheet, write:

                TRUE if the statement agrees with the information
                FALSE if the statement contradicts the information
                NOT GIVEN if there is no information on this
                """,
                type_id="reading_true_false_not_given",
                question_start=6,
                question_end=10,
                question_block="""
                Before the fog nets were installed, tanker deliveries were the village's main water source.
                Salazar's first test used mesh imported from Europe.
                School attendance was tracked for more than ten years after the project began.
                Villagers organised regular maintenance of the nets themselves.
                The fog nets removed the need for storage tanks.
                """,
                answer_block="""
                TRUE
                FALSE
                NOT GIVEN
                TRUE
                FALSE
                """,
                questions=[
                    _make_question(
                        number=6,
                        prompt="Before the fog nets were installed, tanker deliveries were the village's main water source.",
                        accepted_answers=["TRUE"],
                        explanation="Paragraph A says the village survived on water delivered by tanker twice a week.",
                    ),
                    _make_question(
                        number=7,
                        prompt="Salazar's first test used mesh imported from Europe.",
                        accepted_answers=["FALSE"],
                        explanation="Paragraph B says she borrowed coarse fishing mesh from a harbour workshop.",
                    ),
                    _make_question(
                        number=8,
                        prompt="School attendance was tracked for more than ten years after the project began.",
                        accepted_answers=["NOT GIVEN"],
                        explanation="The passage mentions attendance improved, but gives no monitoring period.",
                    ),
                    _make_question(
                        number=9,
                        prompt="Villagers organised regular maintenance of the nets themselves.",
                        accepted_answers=["TRUE"],
                        explanation="Paragraph C describes a village rota for inspection and cleaning.",
                    ),
                    _make_question(
                        number=10,
                        prompt="The fog nets removed the need for storage tanks.",
                        accepted_answers=["FALSE"],
                        explanation="Paragraphs A and B refer to collection and storage; the water is still channelled into tanks.",
                    ),
                ],
            ),
            _make_group(
                key="passage-1-completion",
                section_index=1,
                title="Questions 11-13",
                instructions="""
                Complete the sentences below.

                Choose ONE WORD ONLY from the passage for each answer.

                Write your answers in boxes on your answer sheet.
                """,
                type_id="reading_sentence_completion",
                question_start=11,
                question_end=13,
                question_block="""
                * Complete the sentences below.
                The engineer first noticed beads of water collecting on roadside [].
                Each net channels the water it catches into covered [].
                Even after the project expanded, families still depended on delivered [] during the driest months.
                """,
                answer_block="""
                fences
                tanks
                water
                """,
                questions=[
                    _make_question(
                        number=11,
                        prompt="Blank 11",
                        accepted_answers=["fences"],
                        explanation="Paragraph B says roadside fences were wet after dawn.",
                    ),
                    _make_question(
                        number=12,
                        prompt="Blank 12",
                        accepted_answers=["tanks"],
                        explanation="Paragraph B and the sentence both refer to covered tanks.",
                    ),
                    _make_question(
                        number=13,
                        prompt="Blank 13",
                        accepted_answers=["water"],
                        explanation="Paragraph E says the village still orders extra water from outside.",
                    ),
                ],
            ),
        ]
    return passage_one_groups
