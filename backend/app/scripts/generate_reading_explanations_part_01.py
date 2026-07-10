from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.scripts.generate_reading_explanations_dependencies import *

DEFAULT_MODEL = "gemini-3-flash-preview"

GENERATOR_VERSION = "2026-05-21.3"

SUPPORTED_TEST_TYPES = {
    "reading": ModelTestType.READING,
    "listening": ModelTestType.LISTENING,
}

class ExplanationStats:
    tests_seen: int = 0
    sections_seen: int = 0
    questions_seen: int = 0
    questions_updated: int = 0
    suspicious_answers: int = 0
    failed_sections: int = 0

class SectionJob:
    test_id: UUID
    test_type: str
    test_title: str
    test_status: str
    section_id: UUID
    section_title: str
    question_count: int

def _plain(value: Any) -> str:
    return str(value or "").strip()

def _normalize_answer(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().casefold()

def _extract_paragraph_text(item: Any) -> str:
    if isinstance(item, dict):
        return _plain(item.get("text"))
    return _plain(item)

def _flatten_transcript(value: Any) -> list[str]:
    if isinstance(value, str):
        return [_plain(value)] if _plain(value) else []
    if isinstance(value, list):
        lines: list[str] = []
        for item in value:
            lines.extend(_flatten_transcript(item))
        return lines
    if not isinstance(value, dict):
        return []

    for key in ("segments", "items", "lines", "turns", "paragraphs"):
        nested = value.get(key)
        if isinstance(nested, list):
            lines = _flatten_transcript(nested)
            if lines:
                return lines

    text = _plain(value.get("text") or value.get("transcript") or value.get("content"))
    if not text:
        return []
    speaker = _plain(value.get("speaker") or value.get("label"))
    return [f"{speaker}: {text}" if speaker else text]

def _transcript_text(section: TestSection) -> str:
    lines = _flatten_transcript(section.transcript)
    return "\n".join(line for line in lines if line)

def _section_passage(section: TestSection) -> str:
    paragraphs = section.content.get("paragraphs") if isinstance(section.content, dict) else None
    if isinstance(paragraphs, list) and paragraphs:
        lines = []
        for index, item in enumerate(paragraphs, start=1):
            text = _extract_paragraph_text(item)
            if not text:
                continue
            label = _plain(item.get("label")) if isinstance(item, dict) else ""
            prefix = f"{label}. " if label else f"Paragraph {index}: "
            lines.append(f"{prefix}{text}")
        if lines:
            return "\n\n".join(lines)
    return _plain((section.content or {}).get("body") or _transcript_text(section) or section.intro)

def _all_section_text(section: TestSection) -> str:
    chunks = [
        _plain(section.title),
        _plain(section.intro),
        _plain((section.content or {}).get("body")),
    ]
    paragraphs = (section.content or {}).get("paragraphs")
    if isinstance(paragraphs, list):
        chunks.extend(_extract_paragraph_text(item) for item in paragraphs)
    chunks.append(_transcript_text(section))
    return "\n\n".join(chunk for chunk in chunks if chunk)

def _quote_exists(section: TestSection, quote: str) -> bool:
    return _quote_exists_text(_all_section_text(section), quote)

def _quote_exists_text(source_text: str, quote: str) -> bool:
    normalized_quote = re.sub(r"\s+", " ", quote).strip().casefold()
    if not normalized_quote:
        return False
    normalized_section = re.sub(r"\s+", " ", source_text).casefold()
    return normalized_quote in normalized_section

def _strip_json_fence(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        return cleaned[start : end + 1]
    return cleaned

def _parse_json(text: str) -> dict[str, Any]:
    return json.loads(_strip_json_fence(text))

def _json_error_context(text: str, exc: json.JSONDecodeError) -> str:
    start = max(0, exc.pos - 120)
    end = min(len(text), exc.pos + 120)
    return text[start:end].replace("\n", "\\n")

def _response_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "explanation": {"type": "string"},
                        "quote": {"type": "string"},
                        "highlighted_answer": {"type": "string"},
                        "answer_status": {
                            "type": "string",
                            "enum": ["valid", "possibly_wrong", "uncertain"],
                        },
                        "suggested_answers": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "issue": {"type": "string"},
                        "confidence": {"type": "number"},
                    },
                    "required": [
                        "id",
                        "explanation",
                        "quote",
                        "highlighted_answer",
                        "answer_status",
                        "suggested_answers",
                        "issue",
                        "confidence",
                    ],
                },
            }
        },
        "required": ["questions"],
    }

def _question_payload(question: Question, group: QuestionGroup) -> dict[str, Any]:
    answers = [
        answer.value
        for answer in sorted(question.answer_variants, key=lambda item: (not item.is_primary, str(item.created_at or "")))
    ]
    return {
        "id": str(question.id),
        "number": question.number,
        "label": _plain(question.question_metadata.get("label") or f"Q{question.number}"),
        "type": str(group.question_type.value),
        "prompt": question.prompt,
        "accepted_answers": answers,
        "options": list(question.question_metadata.get("options", [])) or list(group.shared_options or []),
        "current_explanation": question.explanation or "",
    }

def _section_payload(test: Test, section: TestSection) -> dict[str, Any]:
    return _section_payload_for_groups(test, section, list(section.question_groups))

def _section_payload_for_groups(
    test: Test,
    section: TestSection,
    selected_groups: list[QuestionGroup],
) -> dict[str, Any]:
    groups = []
    for group in sorted(selected_groups, key=lambda item: (item.question_start, item.question_end)):
        questions = [
            _question_payload(question, group)
            for question in sorted(group.questions, key=lambda item: item.number)
        ]
        groups.append(
            {
                "title": group.title,
                "instructions": group.instructions or "",
                "type": str(group.question_type.value),
                "question_range": [group.question_start, group.question_end],
                "shared_options": list(group.shared_options or []),
                "question_block": _plain((group.shared_content or {}).get("question_block")),
                "answer_block": _plain((group.shared_content or {}).get("answer_block")),
                "secondary_block": _plain((group.shared_content or {}).get("secondary_block")),
                "questions": questions,
            }
        )
    return {
        "test_id": str(test.id),
        "test_title": test.title,
        "test_type": str(test.type.value),
        "test_status": str(test.status.value),
        "section_id": str(section.id),
        "section_title": section.title,
        "source_text": _section_passage(section),
        "groups": groups,
    }

def _section_payload_for_group_questions(
    test: Test,
    section: TestSection,
    group: QuestionGroup,
    questions: list[Question],
) -> dict[str, Any]:
    return {
        "test_id": str(test.id),
        "test_title": test.title,
        "test_type": str(test.type.value),
        "test_status": str(test.status.value),
        "section_id": str(section.id),
        "section_title": section.title,
        "source_text": _section_passage(section),
        "groups": [
            {
                "title": group.title,
                "instructions": group.instructions or "",
                "type": str(group.question_type.value),
                "question_range": [group.question_start, group.question_end],
                "shared_options": list(group.shared_options or []),
                "question_block": _plain((group.shared_content or {}).get("question_block")),
                "answer_block": _plain((group.shared_content or {}).get("answer_block")),
                "secondary_block": _plain((group.shared_content or {}).get("secondary_block")),
                "questions": [_question_payload(question, group) for question in questions],
            }
        ],
    }
