from __future__ import annotations

from textwrap import dedent
from uuid import NAMESPACE_URL, UUID, uuid5

ADMIN_EXAMPLE_READING_TEST_ID = UUID("44444444-4444-4444-4444-444444444444")


def _uuid(seed: str) -> UUID:
    return uuid5(NAMESPACE_URL, f"primescore:admin-example-reading:{seed}")


def _paragraphs_from_content(
    content: str,
    *,
    show_labels: bool,
) -> list[dict[str, str]]:
    paragraphs = [block.strip() for block in content.split("\n\n") if block.strip()]
    items: list[dict[str, str]] = []
    for index, paragraph in enumerate(paragraphs):
        label = chr(65 + index) if show_labels else ""
        items.append(
            {
                "id": str(_uuid(f"paragraph:{index}:{label or 'plain'}")),
                "label": label,
                "text": paragraph,
            }
        )
    return items


def _make_section(
    *,
    index: int,
    title: str,
    content: str,
    show_labels: bool,
    marker_count: int,
) -> dict[str, object]:
    question_ranges = {1: "1-13", 2: "14-26", 3: "27-40"}
    normalized_content = dedent(content).strip()
    return {
        "id": _uuid(f"section:{index}"),
        "label": f"Passage {index}",
        "title": title,
        "subtitle": (
            f"You should spend about 20 minutes on Questions {question_ranges[index]}, "
            f"which are based on Reading Passage {index} below."
        ),
        "content": normalized_content,
        "paragraphs": _paragraphs_from_content(
            normalized_content,
            show_labels=show_labels,
        ),
        "showLabels": show_labels,
        "media_kind": "text",
        "marker_count": marker_count,
    }


def _make_question(
    *,
    number: int,
    prompt: str,
    accepted_answers: list[str],
    explanation: str,
    variants: list[str] | None = None,
) -> dict[str, object]:
    return {
        "id": _uuid(f"question:{number}"),
        "label": str(number),
        "prompt": prompt,
        "accepted_answers": accepted_answers,
        "explanation": explanation,
        "variants": variants or [],
    }


def _make_group(
    *,
    key: str,
    section_index: int,
    title: str,
    instructions: str,
    type_id: str,
    question_start: int,
    question_end: int,
    questions: list[dict[str, object]],
    question_block: str = "",
    answer_block: str = "",
    secondary_block: str = "",
    shared_options: list[str] | None = None,
) -> dict[str, object]:
    return {
        "id": _uuid(f"group:{key}"),
        "section_id": _uuid(f"section:{section_index}"),
        "title": title,
        "instructions": dedent(instructions).strip(),
        "type_id": type_id,
        "question_start": question_start,
        "question_end": question_end,
        "shared_options": shared_options or [],
        "question_block": dedent(question_block).strip(),
        "answer_block": dedent(answer_block).strip(),
        "secondary_block": dedent(secondary_block).strip(),
        "questions": questions,
    }
