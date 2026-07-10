from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.admin_example_reading_common import *

def build_passage_three_questions():
    passage_three_mc_questions = [
            (
                27,
                "Why did the research team move from citywide averages to street-level measurements?",
                [
                    "To reduce the cost of the study",
                    "To satisfy a request from tourists",
                    "To capture the conditions pedestrians actually experienced",
                    "To compare two planning budgets",
                ],
                ["C"],
                "Paragraph A says the citywide number failed to explain route-level comfort, so the team measured what people actually move through.",
            ),
            (
                28,
                "What pattern was found in some narrow streets?",
                [
                    "They stayed cooler than parks all day long",
                    "They were hotter at midday but cooled quickly once shade returned",
                    "They produced the strongest wind readings in the city",
                    "They matched the temperature of open squares at all times",
                ],
                ["B"],
                "Paragraph B explains that some narrow streets were hotter at midday, then cooled rapidly after shadows met.",
            ),
            (
                29,
                "Why were wall colours included in the volunteer logs?",
                [
                    "Because wall colour affected how much heat surfaces released",
                    "Because the team wanted to identify building owners",
                    "Because the council was choosing paint suppliers",
                    "Because volunteers needed a way to track noise levels",
                ],
                ["A"],
                "Paragraph C links dark walls with radiated heat.",
            ),
            (
                30,
                "Why did the market arcade feel comfortable to commuters?",
                [
                    "It was the shortest route across the district",
                    "It had the widest pavement in the study",
                    "It remained open after midnight",
                    "It combined continuous shade with moving air",
                ],
                ["D"],
                "Paragraph D says the arcade offered continuous shade and a gentle current of air.",
            ),
            (
                31,
                "Why did city officials value the final shade map?",
                [
                    "It could replace future tree-planting budgets",
                    "It could guide low-cost street improvements",
                    "It could predict rainfall more accurately",
                    "It could measure underground water reserves",
                ],
                ["B"],
                "Paragraph E says the map pointed to low-cost changes such as moving bus stops and prioritising shade on one side of a street.",
            ),
            (
                32,
                "What limitation remained after the first study?",
                [
                    "The sensors could not work after sunset",
                    "Commercial areas were excluded from the route",
                    "The measurements covered only one season",
                    "Volunteers did not agree on a fixed schedule",
                ],
                ["C"],
                "Paragraph E says all measurements were taken in one hot season.",
            ),
        ]

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
    return passage_three_mc_questions
