from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.admin_ai_agent_dependencies import *
from app.services.admin_ai_agent_part_02 import AiDraftPayloadInput, AiDraftQuestionGroupInput

_MODEL_CALL_TIMEOUT_SECONDS = 1200

_TOOL_CALL_TIMEOUT_SECONDS = 300

_STALE_LEGACY_JOB_SECONDS = 300

_ADMIN_AI_CELERY_QUEUE = "admin_ai"

_ADMIN_AI_TASK_NAME = "primescore.run_admin_ai_job"

_HTML_TAG_RE = re.compile(r"</?[^>]+>")

_UNSUPPORTED_HTML_TAG_RE = re.compile(r"<(?!/?(?:i|c)\b)[^>]+>", re.IGNORECASE)

_PLACEHOLDER_RE = re.compile(r"\[placeholder[^\]]*\]", re.IGNORECASE)

_PARAGRAPH_LABEL_TYPES = {"reading_matching_information", "reading_matching_headings"}

_DB_INSPECTION_TOOL_NAMES = {
    "list_tests",
    "get_test_draft",
    "get_test_snapshot",
    "find_question_group_examples",
    "compare_draft_with_examples",
}

def _now() -> datetime:
    return datetime.now(UTC)

def _json_preview(value: Any, *, limit: int = 480) -> str:
    try:
        rendered = json.dumps(_json_safe_value(value), ensure_ascii=False, default=str)
    except TypeError:
        rendered = str(value)
    if len(rendered) <= limit:
        return rendered
    return rendered[: limit - 3] + "..."

def _single_line(value: str) -> str:
    return " ".join((value or "").split())

def _thread_title_from_text(text: str) -> str:
    first_line = " ".join((text or "").strip().split())
    return (first_line[:77] + "...") if len(first_line) > 80 else (first_line or "New AI task")

def _normalize_message_text(text: str) -> str:
    return text.strip()

def _strip_html_tags(text: str) -> str:
    if "<" not in text or ">" not in text:
        return text
    cleaned = _HTML_TAG_RE.sub("", text)
    return html.unescape(cleaned)

def _strip_unsupported_html_tags(text: str) -> str:
    if "<" not in text or ">" not in text:
        return text
    cleaned = _UNSUPPORTED_HTML_TAG_RE.sub("", text)
    return html.unescape(cleaned)

def _contains_unsupported_html_markup(text: str) -> bool:
    if "<" not in text or ">" not in text:
        return False
    return bool(_UNSUPPORTED_HTML_TAG_RE.search(text))

def _sanitize_plain_text(value: str) -> str:
    return _strip_html_tags(value).strip()

def _sanitize_rich_text(value: str) -> str:
    return _strip_unsupported_html_tags(value)

def _json_safe_value(value: Any) -> Any:
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, BaseModel):
        return _json_safe_value(value.model_dump())
    if isinstance(value, dict):
        return {str(key): _json_safe_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe_value(item) for item in value]
    return value

def _split_content_blocks(content: str) -> list[str]:
    return [block.strip() for block in re.split(r"\n\s*\n", content) if block.strip()]

def _section_requires_paragraph_labels(type_ids: list[str]) -> bool:
    return any(type_id in _PARAGRAPH_LABEL_TYPES for type_id in type_ids)

def _build_section_paragraphs(
    *,
    content: str,
    paragraphs: list[dict[str, Any]],
    show_labels: bool,
) -> list[dict[str, str]]:
    source_rows = paragraphs or [{"id": "", "label": "", "text": block} for block in _split_content_blocks(content)]
    normalized_rows: list[dict[str, str]] = []
    label_index = 0
    for row in source_rows:
        text = _sanitize_rich_text(str(row.get("text") or "")).strip()
        if not text:
            continue
        label = chr(65 + label_index) if show_labels else ""
        normalized_rows.append(
            {
                "id": str(row.get("id") or ""),
                "label": label,
                "text": text,
            }
        )
        label_index += 1
    return normalized_rows

def _draft_quality_report(payload: AiDraftPayloadInput) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []

    if not payload.metadata.title.strip():
        errors.append("Draft title is empty.")
    if not payload.sections:
        errors.append("Draft has no sections.")
    if not payload.question_groups:
        warnings.append("Draft has no question groups yet.")

    section_ids = [section.local_id for section in payload.sections]
    duplicate_section_ids = sorted({section_id for section_id in section_ids if section_ids.count(section_id) > 1})
    if duplicate_section_ids:
        errors.append(f"Duplicate section_local_id values found: {', '.join(duplicate_section_ids)}.")

    groups_by_section: dict[str, list[AiDraftQuestionGroupInput]] = {}
    seen_numbers: list[int] = []
    seen_question_labels: set[str] = set()
    duplicate_labels: set[str] = set()

    for group in payload.question_groups:
        groups_by_section.setdefault(group.section_local_id, []).append(group)
        if group.section_local_id not in section_ids:
            errors.append(f"Question group '{group.title}' points to unknown section_local_id '{group.section_local_id}'.")
        expected_count = group.question_end - group.question_start + 1
        if expected_count <= 0:
            errors.append(f"Question group '{group.title}' has an invalid question range.")
        if len(group.questions) != max(expected_count, 0):
            errors.append(
                f"Question group '{group.title}' has {len(group.questions)} questions but its range expects {expected_count}."
            )
        if _PLACEHOLDER_RE.search(group.title) or _PLACEHOLDER_RE.search(group.instructions):
            errors.append(f"Question group '{group.title}' still contains placeholder text.")
        if _contains_unsupported_html_markup(group.title) or _contains_unsupported_html_markup(group.instructions):
            errors.append(f"Question group '{group.title}' still contains HTML-like markup.")
        if group.type_id in {"reading_matching_features", "reading_matching_sentence_endings"} and not group.shared_options:
            errors.append(f"Question group '{group.title}' needs shared_options for {group.type_id}.")
        if group.type_id == "reading_mc_single":
            for question in group.questions:
                if len(question.variants) < 2:
                    errors.append(f"Question {question.label} needs at least two variants.")
        for offset, question in enumerate(group.questions):
            expected_number = group.question_start + offset
            seen_numbers.append(expected_number)
            normalized_label = question.label.strip()
            if normalized_label in seen_question_labels:
                duplicate_labels.add(normalized_label)
            if normalized_label:
                seen_question_labels.add(normalized_label)
            if not question.prompt.strip():
                errors.append(f"Question {question.label or expected_number} has an empty prompt.")
            if _PLACEHOLDER_RE.search(question.prompt) or _PLACEHOLDER_RE.search(question.explanation):
                errors.append(f"Question {question.label or expected_number} still contains placeholder text.")
            if _contains_unsupported_html_markup(question.prompt) or _contains_unsupported_html_markup(question.explanation):
                errors.append(f"Question {question.label or expected_number} still contains HTML-like markup.")
            if group.type_id in _PARAGRAPH_LABEL_TYPES:
                if len(question.accepted_answers) != 1:
                    errors.append(f"Question {question.label or expected_number} needs exactly one paragraph-label answer.")
                elif not re.fullmatch(r"[A-Z]{1,3}|-", question.accepted_answers[0].strip().upper()):
                    warnings.append(
                        f"Question {question.label or expected_number} has a non-standard paragraph label answer '{question.accepted_answers[0]}'."
                    )
            elif group.type_id.endswith("short_answer") and not question.accepted_answers:
                errors.append(f"Question {question.label or expected_number} needs at least one accepted answer.")

    if duplicate_labels:
        errors.append(f"Duplicate question labels found: {', '.join(sorted(duplicate_labels))}.")

    if seen_numbers:
        expected_numbers = list(range(min(seen_numbers), max(seen_numbers) + 1))
        if seen_numbers != expected_numbers:
            warnings.append("Question numbering is not fully sequential across all groups.")

    section_reports: list[dict[str, Any]] = []
    for section in payload.sections:
        section_type_ids = [group.type_id for group in groups_by_section.get(section.local_id, [])]
        should_show_labels = _section_requires_paragraph_labels(section_type_ids)
        normalized_paragraphs = _build_section_paragraphs(
            content=section.content,
            paragraphs=section.paragraphs,
            show_labels=should_show_labels,
        )
        if _PLACEHOLDER_RE.search(section.title) or _PLACEHOLDER_RE.search(section.content):
            errors.append(f"Section '{section.title or section.label}' still contains placeholder text.")
        if (
            _contains_unsupported_html_markup(section.title)
            or _contains_unsupported_html_markup(section.content)
            or _contains_unsupported_html_markup(section.subtitle)
        ):
            errors.append(f"Section '{section.title or section.label}' still contains HTML-like markup.")
        if should_show_labels and not normalized_paragraphs:
            errors.append(f"Section '{section.title or section.label}' needs paragraphs because its questions depend on paragraph labels.")
        if section.show_labels != should_show_labels:
            warnings.append(
                f"Section '{section.title or section.label}' show_labels={section.show_labels} but recommended value is {should_show_labels}."
            )
        section_reports.append(
            {
                "section_local_id": section.local_id,
                "title": section.title,
                "question_types": section_type_ids,
                "recommended_show_labels": should_show_labels,
                "paragraph_count": len(normalized_paragraphs),
            }
        )

    return {
        "errors": errors,
        "warnings": warnings,
        "section_reports": section_reports,
        "ok": not errors,
    }
