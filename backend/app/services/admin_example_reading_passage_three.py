from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.admin_example_reading_common import *


def build_passage_three_groups(passage_three_mc_questions):
    mc_question_block_parts: list[str] = []
    passage_three_mc_built_questions: list[dict[str, object]] = []
    mc_answer_lines: list[str] = []
    for number, prompt, variants, accepted_answers, explanation in passage_three_mc_questions:
        mc_question_block_parts.append(
            "\n".join(
                [f"<{prompt}>", *[f"{chr(65 + index)}. {option}" for index, option in enumerate(variants)]]
            )
        )
        mc_answer_lines.extend(accepted_answers)
        passage_three_mc_built_questions.append(
            _make_question(
                number=number,
                prompt=prompt,
                accepted_answers=accepted_answers,
                explanation=explanation,
                variants=variants,
            )
        )

    passage_three_groups = [
            _make_group(
                key="passage-3-mc-single",
                section_index=3,
                title="Questions 27-32",
                instructions="""
                Choose the correct letter, A, B, C or D.

                Write the correct letter in boxes on your answer sheet.
                """,
                type_id="reading_mc_single",
                question_start=27,
                question_end=32,
                question_block="\n\n".join(mc_question_block_parts),
                answer_block="\n".join(mc_answer_lines),
                questions=passage_three_mc_built_questions,
            ),
            _make_group(
                key="passage-3-note-completion",
                section_index=3,
                title="Questions 33-36",
                instructions="""
                Complete the notes below.

                Choose ONE WORD AND/OR A NUMBER from the passage for each answer.

                Write your answers in boxes on your answer sheet.
                """,
                type_id="reading_note_completion",
                question_start=33,
                question_end=36,
                question_block="""
                * Pilot study notes
                Readings were collected every [] minutes.
                Sensors were mounted at [] metres above ground.
                Volunteers also recorded the colour of nearby [].
                The coolest busy route included the market [].
                """,
                answer_block="""
                15
                2
                walls
                arcade
                """,
                questions=[
                    _make_question(
                        number=33,
                        prompt="Blank 33",
                        accepted_answers=["15", "fifteen"],
                        explanation="Paragraph B says volunteers walked fixed routes every fifteen minutes.",
                    ),
                    _make_question(
                        number=34,
                        prompt="Blank 34",
                        accepted_answers=["2", "two"],
                        explanation="Paragraph B says each device was mounted two metres above the ground.",
                    ),
                    _make_question(
                        number=35,
                        prompt="Blank 35",
                        accepted_answers=["walls"],
                        explanation="Paragraph C says volunteers noted whether nearby walls were pale or dark.",
                    ),
                    _make_question(
                        number=36,
                        prompt="Blank 36",
                        accepted_answers=["arcade"],
                        explanation="Paragraph D identifies the market arcade as the most comfortable busy route.",
                    ),
                ],
            ),
            _make_group(
                key="passage-3-short-answer",
                section_index=3,
                title="Questions 37-40",
                instructions="""
                Answer the questions below.

                Choose NO MORE THAN TWO WORDS from the passage for each answer.

                Write your answers in boxes on your answer sheet.
                """,
                type_id="reading_short_answer",
                question_start=37,
                question_end=40,
                question_block="""
                Which road surface heated up fastest in direct sun?

                Who provided evening electricity for uploading the team's data packs?

                According to commuters, what mattered more than a single cool doorway?

                In which month was the second survey carried out?
                """,
                answer_block="""
                asphalt
                shopkeepers
                continuous shade
                October
                """,
                questions=[
                    _make_question(
                        number=37,
                        prompt="Which road surface heated up fastest in direct sun?",
                        accepted_answers=["asphalt"],
                        explanation="Paragraph C states that asphalt heated up fastest of all.",
                    ),
                    _make_question(
                        number=38,
                        prompt="Who provided evening electricity for uploading the team's data packs?",
                        accepted_answers=["shopkeepers"],
                        explanation="Paragraph D says nearby shopkeepers let the team use their sockets.",
                    ),
                    _make_question(
                        number=39,
                        prompt="According to commuters, what mattered more than a single cool doorway?",
                        accepted_answers=["continuous shade"],
                        explanation="Paragraph D says commuters valued an uninterrupted shaded stretch.",
                    ),
                    _make_question(
                        number=40,
                        prompt="In which month was the second survey carried out?",
                        accepted_answers=["October"],
                        explanation="Paragraph E says a second survey was carried out in October.",
                    ),
                ],
            ),
        ]
    return passage_three_groups
