from __future__ import annotations

import asyncio
import copy
import html
import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID, uuid4

from google import genai
from google.genai import types as genai_types
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.enums import TestMode, TestScope, TestStatus, TestType
from app.db.session import get_session_maker, reset_session_state
from app.models.ai import AdminAiJob, AdminAiMessage, AdminAiThread
from app.models.enums import (
    AdminAiJobStatus,
    AdminAiMessageRole,
    AdminAiThreadStatus,
    AiProvider,
    AiUseCase,
    QuestionType as ModelQuestionType,
    TestStatus as ModelTestStatus,
    TestType as ModelTestType,
)
from app.models.test import Question, QuestionGroup, Test, TestSection
from app.schemas.admin import AdminTestDraftUpsertRequest
from app.schemas.common import AdminPrincipal
from app.services.ai_config import (
    ResolvedAiUseCaseConfig,
    build_google_client,
    resolve_ai_use_case_config,
)
from app.services.test_content_repo import (
    build_admin_draft_state_from_db,
    build_test_snapshot_from_db,
    delete_draft_test_from_db,
    list_tests_from_db,
    publish_test_in_db,
    quick_fix_published_test_in_db,
    save_test_draft_to_db,
)

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


def _serialize_example_group(test: Test, section: TestSection, group: QuestionGroup) -> dict[str, Any]:
    ordered_questions = sorted(group.questions, key=lambda item: item.number)
    return {
        "test": {
            "id": str(test.id),
            "title": test.title,
            "status": str(test.status.value),
            "source": str(test.source.value),
            "source_detail": str(test.source_detail or ""),
            "updated_at": test.updated_at.isoformat() if test.updated_at else None,
        },
        "section": {
            "id": str(section.id),
            "label": str(section.content.get("label") or section.title),
            "title": section.title,
            "show_labels": bool(section.content.get("showLabels", False)),
        },
        "group": {
            "id": str(group.id),
            "title": group.title,
            "instructions": group.instructions or "",
            "type_id": str(group.question_type.value),
            "question_start": group.question_start,
            "question_end": group.question_end,
            "shared_options_preview": list(group.shared_options)[:8],
            "question_block": str(group.shared_content.get("question_block") or "")[:800],
            "answer_block": str(group.shared_content.get("answer_block") or "")[:400],
            "secondary_block": str(group.shared_content.get("secondary_block") or "")[:400],
            "questions_preview": [
                {
                    "label": str(question.question_metadata.get("label") or f"Q{question.number}"),
                    "prompt": question.prompt,
                    "accepted_answers": [answer.value for answer in question.answer_variants],
                    "variants": list(question.question_metadata.get("variants", [])),
                }
                for question in ordered_questions[:5]
            ],
        },
    }


async def _load_question_group_examples(
    session: AsyncSession,
    *,
    question_type: str,
    test_type: str | None,
    published_only: bool,
    limit: int,
    exclude_test_id: str | None = None,
) -> list[dict[str, Any]]:
    query = (
        select(Test)
        .options(
            selectinload(Test.sections)
            .selectinload(TestSection.question_groups)
            .selectinload(QuestionGroup.questions)
            .selectinload(Question.answer_variants)
        )
        .join(Test.sections)
        .join(TestSection.question_groups)
        .where(QuestionGroup.question_type == ModelQuestionType(question_type))
        .order_by(Test.updated_at.desc(), Test.created_at.desc())
        .limit(max(limit * 4, limit))
    )
    if published_only:
        query = query.where(Test.status == ModelTestStatus.PUBLISHED)
    if test_type:
        query = query.where(Test.type == ModelTestType(test_type))
    if exclude_test_id:
        query = query.where(Test.id != UUID(exclude_test_id))

    tests = list((await session.scalars(query)).unique().all())
    examples: list[dict[str, Any]] = []
    for test in tests:
        for section in sorted(test.sections, key=lambda item: item.position):
            for group in sorted(section.question_groups, key=lambda item: (item.question_start, item.question_end)):
                if str(group.question_type.value) != question_type:
                    continue
                examples.append(_serialize_example_group(test, section, group))
                if len(examples) >= limit:
                    return examples
    return examples


def _compare_group_against_examples(
    *,
    section: AiDraftSectionInput,
    group: AiDraftQuestionGroupInput,
    examples: list[dict[str, Any]],
) -> dict[str, Any]:
    issues: list[str] = []
    recommended_show_labels = _section_requires_paragraph_labels([group.type_id])
    if section.show_labels != recommended_show_labels:
        issues.append(
            f"Section show_labels is {section.show_labels}, but {group.type_id} usually expects {recommended_show_labels}."
        )
    if group.type_id in {"reading_matching_features", "reading_matching_sentence_endings"} and not group.shared_options:
        issues.append("shared_options is empty for a matching group that normally uses reusable options.")
    if group.type_id == "reading_mc_single":
        too_short = [question.label for question in group.questions if len(question.variants) < 2]
        if too_short:
            issues.append(f"Some MC questions have too few variants: {', '.join(too_short)}.")
    return {
        "section_local_id": section.local_id,
        "group_title": group.title,
        "type_id": group.type_id,
        "recommended_show_labels": recommended_show_labels,
        "issues": issues,
        "examples": examples,
    }


def _extract_grounding_summary(response: Any) -> dict[str, Any] | None:
    candidates = list(getattr(response, "candidates", []) or [])
    if not candidates:
        return None
    metadata = getattr(candidates[0], "grounding_metadata", None)
    if metadata is None:
        return None

    web_queries = list(getattr(metadata, "web_search_queries", []) or [])
    sources: list[dict[str, str | None]] = []
    seen_uris: set[str] = set()
    for chunk in list(getattr(metadata, "grounding_chunks", []) or []):
        web = getattr(chunk, "web", None)
        if web is None:
            continue
        uri = getattr(web, "uri", None)
        if not uri or uri in seen_uris:
            continue
        seen_uris.add(uri)
        sources.append(
            {
                "title": getattr(web, "title", None),
                "domain": getattr(web, "domain", None),
                "uri": uri,
            }
        )
    return {
        "web_search_queries": web_queries,
        "sources": sources[:8],
    }


def _append_grounding_sources_to_text(text: str, grounding_summary: dict[str, Any] | None) -> str:
    if not grounding_summary:
        return text
    sources = list(grounding_summary.get("sources") or [])
    if not sources or "Sources:" in text:
        return text
    lines = [text.rstrip(), "", "Sources:"]
    for source in sources[:5]:
        title = source.get("title") or source.get("domain") or source.get("uri") or "Source"
        uri = source.get("uri") or ""
        lines.append(f"- {title}: {uri}")
    return "\n".join(lines).strip()


def _question_type_definitions() -> list[dict[str, str]]:
    return [
        {"id": "reading_mc_single", "label": "Multiple Choice (single answer)", "family": "selection", "description": "One correct option."},
        {"id": "reading_mc_multiple", "label": "Multiple Choice (multiple answers)", "family": "selection", "description": "Multiple correct options."},
        {"id": "reading_true_false_not_given", "label": "True / False / Not Given", "family": "selection", "description": "Three-way truth classification."},
        {"id": "reading_yes_no_not_given", "label": "Yes / No / Not Given", "family": "selection", "description": "Author claim agreement."},
        {"id": "reading_matching_information", "label": "Matching Information", "family": "matching", "description": "Match facts to paragraphs."},
        {"id": "reading_matching_headings", "label": "Matching Headings", "family": "matching", "description": "Choose the best heading."},
        {"id": "reading_matching_features", "label": "Matching Features", "family": "matching", "description": "Reusable options matched to items."},
        {"id": "reading_matching_sentence_endings", "label": "Matching Sentence Endings", "family": "matching", "description": "Reusable ending options matched to stems."},
        {"id": "reading_sentence_completion", "label": "Sentence Completion", "family": "completion", "description": "Fill in blanks from the passage."},
        {"id": "reading_summary_completion_wordbank", "label": "Summary Completion (word bank)", "family": "completion", "description": "Use provided word options."},
        {"id": "reading_summary_completion_freetext", "label": "Summary Completion (free text)", "family": "completion", "description": "Type the answer exactly."},
        {"id": "reading_note_completion", "label": "Note / Table / Flow-chart Completion", "family": "completion", "description": "Structured completion blocks."},
        {"id": "reading_diagram_labeling", "label": "Diagram / Map Labeling", "family": "labeling", "description": "Label a visual asset."},
        {"id": "reading_short_answer", "label": "Short Answer Questions", "family": "short-answer", "description": "Concise answer input."},
        {"id": "listening_mc_single", "label": "Listening MC Single", "family": "selection", "description": "One correct option."},
        {"id": "listening_mc_multiple", "label": "Listening MC Multiple", "family": "selection", "description": "Multiple correct options."},
        {"id": "listening_matching", "label": "Listening Matching", "family": "matching", "description": "Pair items with answers."},
        {"id": "listening_plan_map_labeling", "label": "Listening Plan / Map / Diagram Labeling", "family": "labeling", "description": "Place labels on a visual."},
        {"id": "listening_form_completion", "label": "Listening Form / Note / Table Completion", "family": "completion", "description": "Structured blank filling."},
        {"id": "listening_sentence_completion", "label": "Listening Sentence Completion", "family": "completion", "description": "Complete the sentence."},
        {"id": "listening_short_answer", "label": "Listening Short Answer", "family": "short-answer", "description": "Concise answer input."},
    ]


def _builder_rules() -> list[str]:
    return [
        "Always inspect supported question types before saving a new test draft.",
        "Save as draft first unless the admin explicitly asks to publish.",
        "For structural changes to a published test, create or update a draft version instead of quick-fix.",
        "reading_short_answer uses [] inside question text to represent blank inputs in authored content.",
        "reading_matching_headings can pin an example heading with syntax like A->Heading text; pinned headings should not stay in the open option list.",
        "reading_matching_features and reading_matching_sentence_endings use reusable dropdown options; do not model them as one-time drag/drop options.",
        "reading_diagram_labeling supports diagram_title and diagram_image_url on the question group.",
        "Question numbering must be sequential across groups and passages; if unsure, inspect an existing draft example first.",
    ]


class AiDraftMetadataInput(BaseModel):
    title: str
    type: Literal["reading", "listening"] = "reading"
    format: str = "full"
    source: Literal["cambridge", "real_exam", "custom"] = "custom"
    source_detail: str = ""
    access_type: Literal["public", "premium"] = "public"
    time_limit_label: str = "60 min exam"


class AiDraftSectionInput(BaseModel):
    local_id: str
    id: str | None = None
    label: str
    title: str
    subtitle: str = ""
    content: str = ""
    paragraphs: list[dict[str, Any]] = Field(default_factory=list)
    show_labels: bool = False
    media_kind: Literal["text", "audio"] = "text"
    marker_count: int = 0


class AiDraftQuestionInput(BaseModel):
    id: str | None = None
    label: str
    prompt: str
    accepted_answers: list[str] = Field(default_factory=list)
    explanation: str = ""
    variants: list[str] = Field(default_factory=list)


class AiDraftQuestionGroupInput(BaseModel):
    id: str | None = None
    section_local_id: str
    title: str
    instructions: str
    type_id: str
    question_start: int
    question_end: int
    shared_options: list[str] = Field(default_factory=list)
    question_block: str = ""
    answer_block: str = ""
    secondary_block: str = ""
    diagram_title: str = ""
    diagram_image_url: str = ""
    questions: list[AiDraftQuestionInput] = Field(default_factory=list)


class AiDraftPayloadInput(BaseModel):
    metadata: AiDraftMetadataInput
    sections: list[AiDraftSectionInput] = Field(default_factory=list)
    question_groups: list[AiDraftQuestionGroupInput] = Field(default_factory=list)


class GetDraftTemplateArgs(BaseModel):
    test_type: Literal["reading", "listening"] = "reading"
    title: str | None = None
    access_type: Literal["public", "premium"] = "public"


class ListQuestionTypesArgs(BaseModel):
    test_type: Literal["reading", "listening", "all"] = "reading"


class ListTestsArgs(BaseModel):
    query: str | None = None
    test_type: Literal["reading", "listening"] | None = None
    status: Literal["draft", "published", "archived"] | None = None
    limit: int = Field(default=10, ge=1, le=50)


class GetTestDraftArgs(BaseModel):
    test_id: str


class GetTestSnapshotArgs(BaseModel):
    test_id: str
    scope: Literal["full", "section"] = "full"
    mode: Literal["practice", "exam"] = "practice"


class SaveDraftArgs(BaseModel):
    draft: AiDraftPayloadInput
    test_id: str | None = None


class ValidateDraftArgs(BaseModel):
    draft: AiDraftPayloadInput


class FindQuestionGroupExamplesArgs(BaseModel):
    question_type: str
    test_type: Literal["reading", "listening"] | None = None
    published_only: bool = True
    limit: int = Field(default=3, ge=1, le=8)
    exclude_test_id: str | None = None


class CompareDraftWithExamplesArgs(BaseModel):
    draft: AiDraftPayloadInput
    published_only: bool = True
    limit_per_group: int = Field(default=2, ge=1, le=4)
    exclude_test_id: str | None = None


class QuickFixArgs(BaseModel):
    test_id: str
    draft: AiDraftPayloadInput


class PublishTestArgs(BaseModel):
    test_id: str


class DeleteDraftArgs(BaseModel):
    test_id: str


class EmptyToolArgs(BaseModel):
    pass


@dataclass(slots=True)
class AiToolDefinition:
    name: str
    description: str
    args_model: type[BaseModel]
    handler: Any


def _build_ai_draft_template(
    *,
    test_type: Literal["reading", "listening"] = "reading",
    title: str | None = None,
    access_type: Literal["public", "premium"] = "public",
) -> dict[str, Any]:
    section_label = "Passage 1" if test_type == "reading" else "Part 1"
    section_title = "Reading Passage 1" if test_type == "reading" else "Listening Part 1"
    return {
        "metadata": {
            "title": title or "",
            "type": test_type,
            "format": "full",
            "source": "custom",
            "source_detail": "",
            "access_type": access_type,
            "time_limit_label": "60 min exam" if test_type == "reading" else "Audio duration + 2 min",
        },
        "sections": [
            {
                "local_id": "section-1",
                "id": None,
                "label": section_label,
                "title": section_title,
                "subtitle": "",
                "content": "",
                "paragraphs": [],
                "show_labels": test_type == "reading",
                "media_kind": "text" if test_type == "reading" else "audio",
                "marker_count": 0,
            }
        ],
        "question_groups": [],
    }


def _admin_draft_to_ai_payload(draft: dict[str, Any]) -> dict[str, Any]:
    sections = []
    section_map: dict[str, str] = {}
    for section in draft.get("content", {}).get("sections", []):
        section_id = str(section["id"])
        section_map[section_id] = section_id
        sections.append(
            {
                "local_id": section_id,
                "id": section_id,
                "label": section["label"],
                "title": section["title"],
                "subtitle": section["subtitle"],
                "content": section["content"],
                "paragraphs": section.get("paragraphs", []),
                "show_labels": bool(section.get("showLabels", False)),
                "media_kind": section["media_kind"],
                "marker_count": int(section.get("marker_count", 0)),
            }
        )

    groups = []
    for group in draft.get("questionGroups", []):
        groups.append(
            {
                "id": str(group["id"]),
                "section_local_id": section_map.get(str(group["section_id"]), str(group["section_id"])),
                "title": group["title"],
                "instructions": group["instructions"],
                "type_id": group["type_id"],
                "question_start": group["question_start"],
                "question_end": group["question_end"],
                "shared_options": list(group.get("shared_options", [])),
                "question_block": group.get("question_block", ""),
                "answer_block": group.get("answer_block", ""),
                "secondary_block": group.get("secondary_block", ""),
                "diagram_title": group.get("diagram_title", ""),
                "diagram_image_url": group.get("diagram_image_url", ""),
                "questions": [
                    {
                        "id": str(question["id"]) if question.get("id") else None,
                        "label": question["label"],
                        "prompt": question["prompt"],
                        "accepted_answers": list(question.get("accepted_answers", [])),
                        "explanation": question.get("explanation", ""),
                        "variants": list(question.get("variants", [])),
                    }
                    for question in group.get("questions", [])
                ],
            }
        )

    metadata = draft["metadata"]
    return {
        "metadata": {
            "title": metadata["title"],
            "type": metadata["type"],
            "format": metadata.get("format", "full"),
            "source": metadata["source"],
            "source_detail": metadata.get("source_detail", ""),
            "access_type": metadata["access_type"],
            "time_limit_label": metadata["time_limit_label"],
        },
        "sections": sections,
        "question_groups": groups,
    }


def _ai_payload_to_backend_draft(payload: AiDraftPayloadInput) -> dict[str, Any]:
    groups_by_section: dict[str, list[AiDraftQuestionGroupInput]] = {}
    for group in payload.question_groups:
        groups_by_section.setdefault(group.section_local_id, []).append(group)

    section_uuid_map: dict[str, str] = {}
    section_rows = []
    for index, section in enumerate(payload.sections, start=1):
        raw_id = section.id or section.local_id or f"section-{index}"
        section_uuid_map[section.local_id] = raw_id
        recommended_show_labels = _section_requires_paragraph_labels(
            [group.type_id for group in groups_by_section.get(section.local_id, [])]
        )
        normalized_paragraphs = _build_section_paragraphs(
            content=section.content,
            paragraphs=section.paragraphs,
            show_labels=recommended_show_labels,
        )
        section_rows.append(
            {
                "id": raw_id,
                "label": _sanitize_plain_text(section.label),
                "title": _sanitize_plain_text(section.title),
                "subtitle": _sanitize_rich_text(section.subtitle),
                "content": _sanitize_rich_text(section.content),
                "paragraphs": _json_safe_value(normalized_paragraphs),
                "showLabels": recommended_show_labels,
                "media_kind": section.media_kind,
                "marker_count": section.marker_count,
            }
        )

    group_rows = []
    for group in payload.question_groups:
        section_ref = section_uuid_map.get(group.section_local_id)
        if section_ref is None:
            raise ValueError(f"Unknown section_local_id: {group.section_local_id}")
        group_rows.append(
            {
                "id": group.id,
                "section_id": section_ref,
                "title": _sanitize_plain_text(group.title),
                "instructions": _sanitize_rich_text(group.instructions),
                "type_id": group.type_id,
                "question_start": group.question_start,
                "question_end": group.question_end,
                "shared_options": [_sanitize_plain_text(option) for option in group.shared_options],
                "question_block": _sanitize_rich_text(group.question_block),
                "answer_block": _sanitize_rich_text(group.answer_block),
                "secondary_block": _sanitize_rich_text(group.secondary_block),
                "diagram_title": _sanitize_plain_text(group.diagram_title),
                "diagram_image_url": group.diagram_image_url.strip(),
                "questions": [
                    {
                        "id": question.id,
                        "label": _sanitize_plain_text(question.label),
                        "prompt": _sanitize_rich_text(question.prompt),
                        "accepted_answers": [_sanitize_plain_text(answer) for answer in question.accepted_answers],
                        "explanation": _sanitize_rich_text(question.explanation),
                        "variants": [_sanitize_plain_text(option) for option in question.variants],
                    }
                    for question in group.questions
                ],
            }
        )

    backend_payload = {
        "metadata": payload.metadata.model_dump(),
        "content": section_rows,
        "question_groups": group_rows,
    }
    AdminTestDraftUpsertRequest.model_validate(backend_payload)
    return backend_payload


def _map_thread_summary(thread: AdminAiThread) -> dict[str, Any]:
    return {
        "id": thread.id,
        "title": thread.title,
        "summary": thread.summary,
        "provider": thread.provider,
        "model_name": thread.model_name,
        "task_kind": thread.task_kind,
        "status": thread.status.value,
        "last_job_status": thread.last_job_status.value if thread.last_job_status else None,
        "updated_at": thread.updated_at,
        "created_at": thread.created_at,
    }


def _map_message(message: AdminAiMessage) -> dict[str, Any]:
    return {
        "id": message.id,
        "thread_id": message.thread_id,
        "role": message.role.value,
        "content": message.content,
        "tool_calls": list(message.tool_calls or []),
        "created_at": message.created_at,
    }


def _map_job(job: AdminAiJob) -> dict[str, Any]:
    return {
        "id": job.id,
        "thread_id": job.thread_id,
        "status": job.status.value,
        "provider": job.provider,
        "model_name": job.model_name,
        "task_kind": job.task_kind,
        "error_message": job.error_message,
        "is_background": job.is_background,
        "tool_trace": list(job.tool_trace or []),
        "result_payload": dict(job.result_payload or {}),
        "started_at": job.started_at,
        "finished_at": job.finished_at,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
    }


async def list_admin_ai_threads(session: AsyncSession, *, admin_id: UUID) -> list[dict[str, Any]]:
    items = list(
        (
            await session.scalars(
                select(AdminAiThread)
                .where(
                    AdminAiThread.admin_id == admin_id,
                    AdminAiThread.status == AdminAiThreadStatus.ACTIVE,
                )
                .order_by(AdminAiThread.updated_at.desc())
            )
        ).all()
    )
    return [_map_thread_summary(item) for item in items]


async def get_admin_ai_thread_detail(
    session: AsyncSession,
    *,
    admin_id: UUID,
    thread_id: UUID,
) -> dict[str, Any] | None:
    thread = await session.get(AdminAiThread, thread_id)
    if thread is None or thread.admin_id != admin_id:
        return None
    messages = list(
        (
            await session.scalars(
                select(AdminAiMessage)
                .where(AdminAiMessage.thread_id == thread_id)
                .order_by(AdminAiMessage.created_at.asc())
            )
        ).all()
    )
    jobs = list(
        (
            await session.scalars(
                select(AdminAiJob)
                .where(AdminAiJob.thread_id == thread_id)
                .order_by(AdminAiJob.created_at.desc())
            )
        ).all()
    )
    return {
        **_map_thread_summary(thread),
        "messages": [_map_message(item) for item in messages],
        "jobs": [_map_job(item) for item in jobs],
    }


async def create_admin_ai_thread(
    session: AsyncSession,
    *,
    admin: AdminPrincipal,
    title: str | None = None,
) -> AdminAiThread:
    resolved = await resolve_ai_use_case_config(session, AiUseCase.ADMIN_CHAT)
    thread = AdminAiThread(
        admin_id=admin.id,
        title=(title or "New AI task").strip() or "New AI task",
        provider=resolved.provider.value,
        model_name=resolved.model_id,
        task_kind="test_builder",
        status=AdminAiThreadStatus.ACTIVE,
        last_job_status=None,
        context={},
    )
    session.add(thread)
    await session.flush()
    return thread


async def append_admin_ai_message(
    session: AsyncSession,
    *,
    thread: AdminAiThread,
    admin: AdminPrincipal,
    role: AdminAiMessageRole,
    content: str,
    tool_calls: list[dict[str, Any]] | None = None,
    extra_payload: dict[str, Any] | None = None,
    update_thread_summary: bool = True,
    update_thread_title_from_user_message: bool = True,
) -> AdminAiMessage:
    message = AdminAiMessage(
        thread_id=thread.id,
        admin_id=admin.id,
        role=role,
        content=_normalize_message_text(content),
        tool_calls=tool_calls or [],
        extra_payload=extra_payload or {},
        created_at=_now(),
    )
    session.add(message)
    if update_thread_summary and message.content:
        thread.summary = message.content[:240]
    thread.updated_at = _now()
    if (
        update_thread_title_from_user_message
        and role == AdminAiMessageRole.USER
        and (not thread.title or thread.title == "New AI task")
    ):
        thread.title = _thread_title_from_text(message.content)
    await session.flush()
    return message


async def append_admin_ai_status_message(
    session: AsyncSession,
    *,
    thread: AdminAiThread,
    admin: AdminPrincipal,
    content: str,
) -> AdminAiMessage:
    return await append_admin_ai_message(
        session,
        thread=thread,
        admin=admin,
        role=AdminAiMessageRole.ASSISTANT,
        content=content,
        extra_payload={"kind": "status_update"},
        update_thread_summary=False,
        update_thread_title_from_user_message=False,
    )


async def create_admin_ai_job(
    session: AsyncSession,
    *,
    thread: AdminAiThread,
    admin: AdminPrincipal,
    user_message: AdminAiMessage,
) -> AdminAiJob:
    resolved = await resolve_ai_use_case_config(session, AiUseCase.ADMIN_CHAT)
    job = AdminAiJob(
        thread_id=thread.id,
        admin_id=admin.id,
        user_message_id=user_message.id,
        provider=resolved.provider.value,
        model_name=resolved.model_id,
        broker_task_id=None,
        task_kind="test_builder",
        status=AdminAiJobStatus.QUEUED,
        is_background=True,
        tool_trace=[],
        result_payload={},
    )
    session.add(job)
    thread.last_job_status = AdminAiJobStatus.QUEUED
    thread.summary = "Queued and waiting for a worker."
    thread.updated_at = _now()
    await session.flush()
    return job


async def schedule_admin_ai_job(session: AsyncSession, *, job_id: UUID) -> str:
    from app.tasks.celery_app import celery_app

    job = await session.get(AdminAiJob, job_id)
    if job is None:
        raise KeyError("job_not_found")

    async_result = await asyncio.to_thread(
        celery_app.send_task,
        _ADMIN_AI_TASK_NAME,
        kwargs={"job_id": str(job_id)},
        queue=_ADMIN_AI_CELERY_QUEUE,
    )
    job.broker_task_id = async_result.id
    payload = dict(job.result_payload or {})
    payload.update(
        {
            "broker": "celery",
            "broker_queue": _ADMIN_AI_CELERY_QUEUE,
            "broker_task_id": async_result.id,
        }
    )
    job.result_payload = payload
    job.updated_at = _now()
    await session.commit()
    return async_result.id


def cancel_active_admin_ai_job(job: AdminAiJob) -> bool:
    from app.tasks.celery_app import celery_app

    if not (job.broker_task_id or "").strip():
        return False
    celery_app.control.revoke(job.broker_task_id, terminate=True, signal="SIGTERM")
    return True


async def enqueue_admin_ai_message(
    session: AsyncSession,
    *,
    admin: AdminPrincipal,
    thread_id: UUID,
    content: str,
) -> dict[str, Any]:
    thread = await session.get(AdminAiThread, thread_id)
    if thread is None or thread.admin_id != admin.id:
        raise KeyError("thread_not_found")

    active_job = await session.scalar(
        select(AdminAiJob.id).where(
            AdminAiJob.thread_id == thread.id,
            AdminAiJob.status.in_([AdminAiJobStatus.QUEUED, AdminAiJobStatus.RUNNING]),
        )
    )
    if active_job is not None:
        raise ValueError("thread_job_already_running")

    message = await append_admin_ai_message(
        session,
        thread=thread,
        admin=admin,
        role=AdminAiMessageRole.USER,
        content=content,
    )
    job = await create_admin_ai_job(session, thread=thread, admin=admin, user_message=message)
    await session.commit()
    try:
        await schedule_admin_ai_job(session, job_id=job.id)
    except Exception as exc:
        await session.rollback()
        failed_job = await session.get(AdminAiJob, job.id)
        failed_thread = await session.get(AdminAiThread, thread.id)
        if failed_job is not None:
            failed_job.status = AdminAiJobStatus.FAILED
            failed_job.error_message = f"Failed to dispatch Celery job: {exc}"
            failed_job.finished_at = _now()
        if failed_thread is not None:
            failed_thread.last_job_status = AdminAiJobStatus.FAILED
            failed_thread.summary = "Failed to dispatch Celery job."
            failed_thread.updated_at = _now()
        await session.commit()
        raise RuntimeError("admin_ai_job_dispatch_failed") from exc
    return {
        "thread": _map_thread_summary(thread),
        "message": _map_message(message),
        "job": _map_job(job),
    }


def get_admin_ai_config() -> dict[str, Any]:
    settings = get_settings()
    return {
        "provider": "gemini",
        "model_name": settings.gemini_model,
        "has_api_key": bool((settings.gemini_api_key or "").strip()),
        "background_supported": True,
        "context_window_tokens": 1_048_576,
        "notes": [
            "Tasks are persisted in the database and run through Celery workers after the page closes.",
            "Multiple admin AI jobs can run in parallel when worker concurrency is available.",
            "Raw hidden model reasoning is not exposed; tool trace and activity timeline are shown instead.",
            "The chat includes concise job-status updates while long tool chains are running.",
            "Configure GEMINI_API_KEY in backend/.env before sending live jobs.",
        ],
    }


async def archive_admin_ai_thread(session: AsyncSession, *, admin_id: UUID, thread_id: UUID) -> bool:
    thread = await session.get(AdminAiThread, thread_id)
    if thread is None or thread.admin_id != admin_id:
        return False
    thread.status = AdminAiThreadStatus.ARCHIVED
    thread.updated_at = _now()
    await session.commit()
    return True


def _thinking_level() -> genai_types.ThinkingLevel:
    value = (get_settings().gemini_thinking_level or "HIGH").strip().upper()
    return {
        "MINIMAL": genai_types.ThinkingLevel.MINIMAL,
        "LOW": genai_types.ThinkingLevel.LOW,
        "MEDIUM": genai_types.ThinkingLevel.MEDIUM,
        "HIGH": genai_types.ThinkingLevel.HIGH,
    }.get(value, genai_types.ThinkingLevel.HIGH)


def _max_tool_loops() -> int:
    return max(10, int(get_settings().gemini_max_tool_loops or 80))


def _build_gemini_client(resolved_config: "ResolvedAiUseCaseConfig") -> genai.Client:
    # Honour Vertex AI (service-account) auth when enabled; the AI Studio API
    # key path fails in production where the key's project is denied access.
    return build_google_client(resolved_config)


def _build_generation_config(tool_declarations: list[genai_types.FunctionDeclaration]) -> genai_types.GenerateContentConfig:
    return genai_types.GenerateContentConfig(
        systemInstruction=(
            "You are PrimeScore Admin AI. Your job is to help admins inspect, author, normalize, save, quick-fix, and publish IELTS tests using the provided tools. "
            "Use tools aggressively before making structural assumptions. Save new content as draft first unless the admin clearly asks to publish. "
            "Before adding or changing question groups, inspect existing DB examples with find_question_group_examples or get_test_draft. "
            "Before saving, run validate_draft and compare_draft_with_examples so you check and compare the full structure. "
            "Use Google Search grounding when the admin asks for current facts, real-world references, recent examples, or anything that may have changed recently. "
            "Never invent unsupported question types or fields. Respect builder rules and numbering constraints. "
            "PrimeScore reading content supports styling markers like { }, <i>, and <c>; preserve those markers when the admin uses them. "
            "Do not write unsupported HTML tags like <b>, <p>, or similar markup into saved draft content."
        ),
        temperature=0.1,
        maxOutputTokens=8192,
        tools=[
            genai_types.Tool(functionDeclarations=tool_declarations),
            genai_types.Tool(googleSearch=genai_types.GoogleSearch()),
        ],
        toolConfig=genai_types.ToolConfig(
            include_server_side_tool_invocations=True,
            functionCallingConfig=genai_types.FunctionCallingConfig(
                mode=genai_types.FunctionCallingConfigMode.AUTO,
            )
        ),
        automaticFunctionCalling=genai_types.AutomaticFunctionCallingConfig(disable=True),
        thinkingConfig=genai_types.ThinkingConfig(
            thinkingLevel=_thinking_level(),
        ),
    )


def _tool_declarations() -> list[genai_types.FunctionDeclaration]:
    return [
        genai_types.FunctionDeclaration(
            name="get_builder_rules",
            description="Get the current PrimeScore builder rules and important authoring constraints.",
            parametersJsonSchema={"type": "object", "properties": {}, "additionalProperties": False},
        ),
        genai_types.FunctionDeclaration(
            name="get_draft_template",
            description="Get a minimal draft template for a reading or listening test in the saveable PrimeScore shape.",
            parametersJsonSchema=GetDraftTemplateArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="list_question_types",
            description="List supported PrimeScore question types and their short descriptions.",
            parametersJsonSchema=ListQuestionTypesArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="list_tests",
            description="Search recent tests already stored in the database.",
            parametersJsonSchema=ListTestsArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="get_test_draft",
            description="Fetch a stored test as an AI-friendly draft payload for inspection or editing.",
            parametersJsonSchema=GetTestDraftArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="get_test_snapshot",
            description="Fetch the stored user-facing snapshot shape used by practice/exam views.",
            parametersJsonSchema=GetTestSnapshotArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="find_question_group_examples",
            description="Read matching question group examples from DB so the model can compare against published patterns before editing questions.",
            parametersJsonSchema=FindQuestionGroupExamplesArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="validate_draft",
            description="Check a draft for structure, numbering, placeholder text, label usage, and save-readiness.",
            parametersJsonSchema=ValidateDraftArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="compare_draft_with_examples",
            description="Compare every draft question group against similar DB examples and report structural mismatches.",
            parametersJsonSchema=CompareDraftWithExamplesArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="save_test_draft",
            description="Create a new draft or replace an existing draft with a complete payload.",
            parametersJsonSchema=SaveDraftArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="quick_fix_published_test",
            description="Apply an in-place metadata/content quick-fix to a published test without a structural rewrite.",
            parametersJsonSchema=QuickFixArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="publish_test",
            description="Publish a draft test after it is ready.",
            parametersJsonSchema=PublishTestArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="delete_draft_test",
            description="Delete or archive a draft test.",
            parametersJsonSchema=DeleteDraftArgs.model_json_schema(),
        ),
    ]


async def _tool_get_builder_rules(session: AsyncSession, args: EmptyToolArgs) -> dict[str, Any]:
    _ = (session, args)
    return {
        "builder_rules": _builder_rules(),
    }


async def _tool_get_draft_template(session: AsyncSession, args: GetDraftTemplateArgs) -> dict[str, Any]:
    _ = session
    return {
        "draft_template": _build_ai_draft_template(
            test_type=args.test_type,
            title=args.title,
            access_type=args.access_type,
        )
    }


async def _tool_list_question_types(session: AsyncSession, args: ListQuestionTypesArgs) -> dict[str, Any]:
    _ = session
    rows = _question_type_definitions()
    if args.test_type != "all":
        prefix = f"{args.test_type}_"
        rows = [row for row in rows if row["id"].startswith(prefix)]
    return {
        "question_types": rows,
        "builder_rules": _builder_rules(),
    }


async def _tool_list_tests(session: AsyncSession, args: ListTestsArgs) -> dict[str, Any]:
    items = await list_tests_from_db(
        session,
        test_type=TestType(args.test_type) if args.test_type else None,
        status_filter=TestStatus(args.status) if args.status else None,
    )
    query = (args.query or "").strip().lower()
    if query:
        items = [
            item for item in items
            if query in str(item.get("title", "")).lower() or query in str(item.get("source_detail", "")).lower()
        ]
    items = items[: args.limit]
    return {
        "tests": [
            {
                "id": str(item["id"]),
                "title": item["title"],
                "test_type": item["test_type"],
                "format": item.get("format", "full"),
                "source": item["source"],
                "source_detail": item.get("source_detail", ""),
                "access_type": item["access_type"],
                "status": item["status"],
                "review_status": item.get("review_status", "needs_review"),
                "total_questions": item.get("total_questions", 0),
                "version": item.get("version", 1),
                "updated_at": item.get("updated_at"),
            }
            for item in items
        ]
    }


async def _tool_get_test_draft(session: AsyncSession, args: GetTestDraftArgs) -> dict[str, Any]:
    draft = await build_admin_draft_state_from_db(session, test_id=UUID(args.test_id))
    if draft is None:
        raise ValueError("Test draft not found.")
    return {
        "draft": _admin_draft_to_ai_payload(draft),
    }


async def _tool_get_test_snapshot(session: AsyncSession, args: GetTestSnapshotArgs) -> dict[str, Any]:
    snapshot = await build_test_snapshot_from_db(
        session,
        test_id=UUID(args.test_id),
        scope=TestScope(args.scope),
        mode=TestMode(args.mode),
    )
    if snapshot is None:
        raise ValueError("Test snapshot not found.")
    return {"snapshot": snapshot}


async def _tool_find_question_group_examples(session: AsyncSession, args: FindQuestionGroupExamplesArgs) -> dict[str, Any]:
    examples = await _load_question_group_examples(
        session,
        question_type=args.question_type,
        test_type=args.test_type,
        published_only=args.published_only,
        limit=args.limit,
        exclude_test_id=args.exclude_test_id,
    )
    return {
        "question_type": args.question_type,
        "examples": examples,
        "count": len(examples),
    }


async def _tool_validate_draft(session: AsyncSession, args: ValidateDraftArgs) -> dict[str, Any]:
    _ = session
    report = _draft_quality_report(args.draft)
    return {
        "validation": report,
    }


async def _tool_compare_draft_with_examples(session: AsyncSession, args: CompareDraftWithExamplesArgs) -> dict[str, Any]:
    comparisons: list[dict[str, Any]] = []
    section_map = {section.local_id: section for section in args.draft.sections}
    for group in args.draft.question_groups:
        section = section_map.get(group.section_local_id)
        if section is None:
            comparisons.append(
                {
                    "section_local_id": group.section_local_id,
                    "group_title": group.title,
                    "type_id": group.type_id,
                    "issues": [f"Unknown section_local_id '{group.section_local_id}'."],
                    "examples": [],
                }
            )
            continue
        examples = await _load_question_group_examples(
            session,
            question_type=group.type_id,
            test_type=args.draft.metadata.type,
            published_only=args.published_only,
            limit=args.limit_per_group,
            exclude_test_id=args.exclude_test_id,
        )
        comparisons.append(
            _compare_group_against_examples(
                section=section,
                group=group,
                examples=examples,
            )
        )
    return {
        "comparisons": comparisons,
    }


async def _tool_save_test_draft(session: AsyncSession, args: SaveDraftArgs) -> dict[str, Any]:
    payload = _ai_payload_to_backend_draft(args.draft)
    saved = await save_test_draft_to_db(session, draft=payload, test_id=UUID(args.test_id) if args.test_id else None)
    return {
        "saved_test": {
            "id": str(saved["id"]),
            "title": saved["title"],
            "status": saved["status"],
            "version": saved["version"],
            "review_status": saved["review_status"],
        }
    }


async def _tool_quick_fix_published_test(session: AsyncSession, args: QuickFixArgs) -> dict[str, Any]:
    payload = _ai_payload_to_backend_draft(args.draft)
    saved = await quick_fix_published_test_in_db(session, draft=payload, test_id=UUID(args.test_id))
    if saved is None:
        raise ValueError("Quick fix failed.")
    return {
        "quick_fixed_test": {
            "id": str(saved["id"]),
            "title": saved["title"],
            "status": saved["status"],
            "version": saved["version"],
            "review_status": saved["review_status"],
        }
    }


async def _tool_publish_test(session: AsyncSession, args: PublishTestArgs) -> dict[str, Any]:
    saved = await publish_test_in_db(session, test_id=UUID(args.test_id))
    if saved is None:
        raise ValueError("Publish failed.")
    return {
        "published_test": {
            "id": str(saved["id"]),
            "title": saved["title"],
            "status": saved["status"],
            "version": saved["version"],
            "review_status": saved["review_status"],
        }
    }


async def _tool_delete_draft_test(session: AsyncSession, args: DeleteDraftArgs) -> dict[str, Any]:
    result = await delete_draft_test_from_db(session, test_id=UUID(args.test_id))
    return {"result": result}


TOOL_REGISTRY: dict[str, AiToolDefinition] = {
    "get_builder_rules": AiToolDefinition(
        name="get_builder_rules",
        description="Get builder rules.",
        args_model=EmptyToolArgs,
        handler=_tool_get_builder_rules,
    ),
    "get_draft_template": AiToolDefinition(
        name="get_draft_template",
        description="Get a draft template.",
        args_model=GetDraftTemplateArgs,
        handler=_tool_get_draft_template,
    ),
    "list_question_types": AiToolDefinition(
        name="list_question_types",
        description="List supported question types.",
        args_model=ListQuestionTypesArgs,
        handler=_tool_list_question_types,
    ),
    "list_tests": AiToolDefinition(
        name="list_tests",
        description="List tests from the DB.",
        args_model=ListTestsArgs,
        handler=_tool_list_tests,
    ),
    "get_test_draft": AiToolDefinition(
        name="get_test_draft",
        description="Inspect an existing draft.",
        args_model=GetTestDraftArgs,
        handler=_tool_get_test_draft,
    ),
    "get_test_snapshot": AiToolDefinition(
        name="get_test_snapshot",
        description="Inspect user-facing snapshot shape.",
        args_model=GetTestSnapshotArgs,
        handler=_tool_get_test_snapshot,
    ),
    "find_question_group_examples": AiToolDefinition(
        name="find_question_group_examples",
        description="Inspect similar question groups from DB.",
        args_model=FindQuestionGroupExamplesArgs,
        handler=_tool_find_question_group_examples,
    ),
    "validate_draft": AiToolDefinition(
        name="validate_draft",
        description="Validate a draft before save.",
        args_model=ValidateDraftArgs,
        handler=_tool_validate_draft,
    ),
    "compare_draft_with_examples": AiToolDefinition(
        name="compare_draft_with_examples",
        description="Compare a draft against DB examples.",
        args_model=CompareDraftWithExamplesArgs,
        handler=_tool_compare_draft_with_examples,
    ),
    "save_test_draft": AiToolDefinition(
        name="save_test_draft",
        description="Create/update a draft.",
        args_model=SaveDraftArgs,
        handler=_tool_save_test_draft,
    ),
    "quick_fix_published_test": AiToolDefinition(
        name="quick_fix_published_test",
        description="Apply a quick fix.",
        args_model=QuickFixArgs,
        handler=_tool_quick_fix_published_test,
    ),
    "publish_test": AiToolDefinition(
        name="publish_test",
        description="Publish a test.",
        args_model=PublishTestArgs,
        handler=_tool_publish_test,
    ),
    "delete_draft_test": AiToolDefinition(
        name="delete_draft_test",
        description="Delete a draft test.",
        args_model=DeleteDraftArgs,
        handler=_tool_delete_draft_test,
    ),
}


async def _append_tool_trace_item(
    session: AsyncSession,
    *,
    job: AdminAiJob,
    name: str,
    arguments: dict[str, Any],
) -> dict[str, Any]:
    trace = copy.deepcopy(list(job.tool_trace or []))
    item = {
        "id": str(uuid4()),
        "name": name,
        "status": "running",
        "arguments": arguments,
        "result_preview": None,
        "error": None,
        "created_at": _now().isoformat(),
        "completed_at": None,
    }
    trace.append(item)
    job.tool_trace = trace
    job.updated_at = _now()
    await session.commit()
    return item


async def _append_tool_trace_item_for_job(
    *,
    job_id: UUID,
    name: str,
    arguments: dict[str, Any],
) -> dict[str, Any]:
    session_maker = get_session_maker()
    async with session_maker() as session:
        job = await session.get(AdminAiJob, job_id)
        if job is None:
            raise RuntimeError("Admin AI job not found while appending tool trace.")
        return await _append_tool_trace_item(session, job=job, name=name, arguments=arguments)


async def _finish_tool_trace_item(
    session: AsyncSession,
    *,
    job: AdminAiJob,
    trace_id: str,
    status: Literal["completed", "failed"],
    result_preview: str | None = None,
    error: str | None = None,
) -> None:
    trace = copy.deepcopy(list(job.tool_trace or []))
    for item in trace:
        if item.get("id") == trace_id:
            item["status"] = status
            item["result_preview"] = result_preview
            item["error"] = error
            item["completed_at"] = _now().isoformat()
            break
    job.tool_trace = trace
    job.updated_at = _now()
    await session.commit()


async def _finish_tool_trace_item_for_job(
    *,
    job_id: UUID,
    trace_id: str,
    status: Literal["completed", "failed"],
    result_preview: str | None = None,
    error: str | None = None,
) -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        job = await session.get(AdminAiJob, job_id)
        if job is None:
            return
        await _finish_tool_trace_item(
            session,
            job=job,
            trace_id=trace_id,
            status=status,
            result_preview=result_preview,
            error=error,
        )


def _message_history_to_contents(messages: list[AdminAiMessage]) -> list[Any]:
    contents: list[Any] = []
    for message in messages:
        if not message.content.strip():
            continue
        if str((message.extra_payload or {}).get("kind") or "") == "status_update":
            continue
        part = genai_types.Part(text=message.content)
        if message.role == AdminAiMessageRole.USER:
            contents.append(genai_types.UserContent(parts=[part]))
        else:
            contents.append(genai_types.ModelContent(parts=[part]))
    return contents


def _build_tool_args(tool: AiToolDefinition, raw_args: dict[str, Any] | None) -> BaseModel:
    payload = raw_args or {}
    if tool.args_model is EmptyToolArgs:
        return EmptyToolArgs()
    return tool.args_model.model_validate(payload)


def _tool_plan_line(name: str, args: dict[str, Any]) -> str:
    if name == "list_tests":
        parts = []
        if args.get("status"):
            parts.append(str(args["status"]))
        if args.get("test_type"):
            parts.append(str(args["test_type"]))
        qualifier = " ".join(parts).strip()
        limit = args.get("limit")
        return f"Search {qualifier or 'recent'} tests" + (f" (limit {limit})" if limit else "")
    if name == "get_test_draft":
        return f"Open draft {str(args.get('test_id') or '').strip()}"
    if name == "get_test_snapshot":
        return f"Open snapshot {str(args.get('test_id') or '').strip()}"
    if name == "find_question_group_examples":
        return f"Load DB examples for `{args.get('question_type')}`"
    if name == "validate_draft":
        return "Validate numbering, placeholders, and structure"
    if name == "compare_draft_with_examples":
        return "Compare the draft against existing DB examples"
    if name == "save_test_draft":
        draft = args.get("draft") or {}
        metadata = draft.get("metadata") if isinstance(draft, dict) else {}
        title = _single_line(str((metadata or {}).get("title") or "updated draft"))
        return f"Save draft: {title[:90]}"
    if name == "quick_fix_published_test":
        return f"Quick-fix published test {str(args.get('test_id') or '').strip()}"
    if name == "publish_test":
        return f"Publish test {str(args.get('test_id') or '').strip()}"
    if name == "list_question_types":
        return f"Load supported question types for `{args.get('test_type') or 'all'}`"
    if name == "get_builder_rules":
        return "Load PrimeScore builder rules"
    return f"Run `{name}` with {_json_preview(args, limit=120)}"


def _tool_result_line(name: str, result: dict[str, Any]) -> str:
    if name == "list_tests":
        tests = list(result.get("tests") or [])
        titles = [_single_line(str(item.get("title") or "")) for item in tests[:3] if item.get("title")]
        suffix = f" Top matches: {', '.join(titles)}." if titles else ""
        return f"Found {len(tests)} test(s).{suffix}"
    if name == "get_test_draft":
        draft = result.get("draft") or {}
        metadata = draft.get("metadata") or {}
        sections = list(draft.get("sections") or [])
        groups = list(draft.get("question_groups") or [])
        title = _single_line(str(metadata.get("title") or "Untitled draft"))
        return f"Loaded draft `{title}` with {len(sections)} section(s) and {len(groups)} group(s)."
    if name == "get_test_snapshot":
        snapshot = result.get("snapshot") or {}
        sections = list(snapshot.get("sections") or [])
        return f"Loaded snapshot with {len(sections)} section(s)."
    if name == "find_question_group_examples":
        examples = list(result.get("examples") or [])
        return f"Loaded {len(examples)} example group(s) for `{result.get('question_type')}`."
    if name == "validate_draft":
        validation = result.get("validation") or {}
        errors = list(validation.get("errors") or [])
        warnings = list(validation.get("warnings") or [])
        if errors:
            return f"Validation found {len(errors)} error(s) and {len(warnings)} warning(s)."
        return f"Validation passed with {len(warnings)} warning(s)."
    if name == "compare_draft_with_examples":
        comparisons = list(result.get("comparisons") or [])
        issue_count = sum(len(item.get("issues") or []) for item in comparisons if isinstance(item, dict))
        return f"Compared {len(comparisons)} group(s); found {issue_count} structural issue(s)."
    if name == "save_test_draft":
        saved = result.get("saved_test") or {}
        title = _single_line(str(saved.get("title") or "Untitled draft"))
        return f"Saved draft `{title}` at version {saved.get('version') or '?'}."
    if name == "quick_fix_published_test":
        saved = result.get("quick_fixed_test") or {}
        title = _single_line(str(saved.get("title") or "Untitled test"))
        return f"Applied quick fix to `{title}`."
    if name == "publish_test":
        saved = result.get("published_test") or {}
        title = _single_line(str(saved.get("title") or "Untitled test"))
        return f"Published `{title}`."
    if name == "list_question_types":
        rows = list(result.get("question_types") or [])
        return f"Loaded {len(rows)} supported question type(s)."
    if name == "get_builder_rules":
        rules = list(result.get("builder_rules") or [])
        return f"Loaded {len(rules)} builder rule(s)."
    return _json_preview(result, limit=180)


async def _append_job_status_message(
    *,
    job_id: UUID,
    content: str,
) -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        job = await session.get(AdminAiJob, job_id)
        if job is None:
            return
        thread = await session.get(AdminAiThread, job.thread_id)
        if thread is None:
            return
        admin = await _build_admin_principal_for_job(session, job)
        await append_admin_ai_status_message(
            session,
            thread=thread,
            admin=admin,
            content=content,
        )
        await session.commit()


async def _enforce_pre_save_requirements(
    session: AsyncSession,
    *,
    job_id: UUID,
    tool_name: str,
    args_obj: BaseModel,
) -> None:
    if tool_name not in {"save_test_draft", "quick_fix_published_test"}:
        return

    draft = getattr(args_obj, "draft", None)
    if not isinstance(draft, AiDraftPayloadInput):
        return

    report = _draft_quality_report(draft)
    if report["errors"]:
        raise ValueError("Draft validation failed: " + " | ".join(report["errors"][:6]))

    if not draft.question_groups:
        return

    job = await session.get(AdminAiJob, job_id)
    completed_tools = {
        str(item.get("name"))
        for item in list(job.tool_trace or [])
        if item.get("status") == "completed"
    } if job is not None else set()

    if not completed_tools.intersection(_DB_INSPECTION_TOOL_NAMES):
        raise ValueError(
            "Inspect DB-backed examples first. Call find_question_group_examples, get_test_draft, or compare_draft_with_examples before saving."
        )
    if "validate_draft" not in completed_tools:
        raise ValueError("Run validate_draft before saving the draft.")
    if "compare_draft_with_examples" not in completed_tools:
        raise ValueError("Run compare_draft_with_examples before saving question edits.")


async def _load_job_with_context(
    session: AsyncSession,
    *,
    job_id: UUID,
) -> tuple[AdminAiJob | None, AdminAiThread | None, list[AdminAiMessage], AdminPrincipal | None]:
    job = await session.get(AdminAiJob, job_id)
    if job is None:
        return None, None, [], None
    thread = await session.get(AdminAiThread, job.thread_id)
    if thread is None:
        return job, None, [], None
    messages = list(
        (
            await session.scalars(
                select(AdminAiMessage)
                .where(AdminAiMessage.thread_id == thread.id)
                .order_by(AdminAiMessage.created_at.asc())
            )
        ).all()
    )
    admin = None
    if thread.admin_id:
        admin = AdminPrincipal(id=thread.admin_id, username="admin", email="", role="admin", is_active=True)  # type: ignore[arg-type]
    return job, thread, messages, admin


async def _build_admin_principal_for_job(session: AsyncSession, job: AdminAiJob) -> AdminPrincipal:
    from app.models.admin import Admin  # local import to avoid cycle

    admin = await session.get(Admin, job.admin_id)
    if admin is None:
        raise RuntimeError("Admin account for AI job is missing.")
    return AdminPrincipal.model_validate(admin)


async def _run_admin_ai_job_once(job_id: UUID) -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        job = await session.get(AdminAiJob, job_id)
        if job is None:
            return
        if job.status not in {AdminAiJobStatus.QUEUED, AdminAiJobStatus.RUNNING}:
            return
        thread = await session.get(AdminAiThread, job.thread_id)
        if thread is None:
            return
        admin = await _build_admin_principal_for_job(session, job)
        messages = list(
            (
                await session.scalars(
                    select(AdminAiMessage)
                    .where(AdminAiMessage.thread_id == thread.id)
                    .order_by(AdminAiMessage.created_at.asc())
                )
            ).all()
        )

        job.status = AdminAiJobStatus.RUNNING
        job.started_at = _now()
        job.error_message = None
        thread.last_job_status = AdminAiJobStatus.RUNNING
        thread.updated_at = _now()
        resolved_config = await resolve_ai_use_case_config(session, AiUseCase.ADMIN_CHAT)
        job.provider = resolved_config.provider.value
        job.model_name = resolved_config.model_id
        thread.provider = resolved_config.provider.value
        thread.model_name = resolved_config.model_id
        await session.commit()

    try:
        if resolved_config.provider != AiProvider.GOOGLE:
            raise RuntimeError(
                "Admin AI workspace currently requires a Google binding because tool-calling and grounded search still use the Google runtime."
            )
        client = _build_gemini_client(resolved_config)
        tool_declarations = _tool_declarations()
        config = _build_generation_config(tool_declarations)
        contents: list[Any] = _message_history_to_contents(messages)
        final_text = ""
        final_tool_calls: list[dict[str, Any]] = []
        grounding_summary: dict[str, Any] | None = None

        for loop_index in range(_max_tool_loops()):
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    client.models.generate_content,
                    model=resolved_config.model_id,
                    contents=contents,
                    config=config,
                ),
                timeout=_MODEL_CALL_TIMEOUT_SECONDS,
            )
            latest_grounding_summary = _extract_grounding_summary(response)
            if latest_grounding_summary is not None:
                grounding_summary = latest_grounding_summary

            function_calls = list(response.function_calls or [])
            if not function_calls:
                final_text = (response.text or "").strip()
                break

            intermediate_text = (response.text or "").strip()
            if intermediate_text:
                await _append_job_status_message(
                    job_id=job_id,
                    content=f"Model note:\n{intermediate_text}",
                )

            final_tool_calls = [
                {"name": call.name, "arguments": dict(call.args or {})}
                for call in function_calls
            ]

            planned_lines = [
                f"{index}. {_tool_plan_line(call.name or 'tool', dict(call.args or {}))}"
                for index, call in enumerate(function_calls, start=1)
            ]
            await _append_job_status_message(
                job_id=job_id,
                content=(
                    f"Step batch {loop_index + 1}: next I will run {len(function_calls)} tool call(s).\n"
                    + "\n".join(planned_lines[:8])
                ),
            )

            if response.candidates and response.candidates[0].content is not None:
                contents.append(response.candidates[0].content)

            response_parts: list[genai_types.Part] = []
            for function_call in function_calls:
                tool = TOOL_REGISTRY.get(function_call.name or "")
                if tool is None:
                    raise RuntimeError(f"Unsupported tool requested: {function_call.name}")

                trace_item = await _append_tool_trace_item_for_job(
                    job_id=job_id,
                    name=tool.name,
                    arguments=dict(function_call.args or {}),
                )
                try:
                    args_obj = _build_tool_args(tool, dict(function_call.args or {}))
                    tool_session_maker = get_session_maker()
                    async with tool_session_maker() as tool_session:
                        await _enforce_pre_save_requirements(
                            tool_session,
                            job_id=job_id,
                            tool_name=tool.name,
                            args_obj=args_obj,
                        )
                        result = await asyncio.wait_for(
                            tool.handler(tool_session, args_obj),
                            timeout=_TOOL_CALL_TIMEOUT_SECONDS,
                        )
                    preview = _json_preview(result)
                    await _finish_tool_trace_item_for_job(
                        job_id=job_id,
                        trace_id=str(trace_item["id"]),
                        status="completed",
                        result_preview=preview,
                    )
                    await _append_job_status_message(
                        job_id=job_id,
                        content=f"Completed `{tool.name}`. {_tool_result_line(tool.name, result)}",
                    )
                    result_payload = _json_safe_value(result)
                    response_parts.append(
                        genai_types.Part.from_function_response(
                            name=tool.name,
                            response={"result": result_payload},
                        )
                    )
                except asyncio.TimeoutError:
                    error_message = f"{tool.name} timed out after {_TOOL_CALL_TIMEOUT_SECONDS} seconds."
                    await _finish_tool_trace_item_for_job(
                        job_id=job_id,
                        trace_id=str(trace_item["id"]),
                        status="failed",
                        error=error_message,
                    )
                    await _append_job_status_message(
                        job_id=job_id,
                        content=f"`{tool.name}` failed: {error_message}",
                    )
                    raise RuntimeError(error_message) from None
                except Exception as exc:
                    await _finish_tool_trace_item_for_job(
                        job_id=job_id,
                        trace_id=str(trace_item["id"]),
                        status="failed",
                        error=str(exc),
                    )
                    await _append_job_status_message(
                        job_id=job_id,
                        content=f"`{tool.name}` returned an error: {str(exc)}",
                    )
                    response_parts.append(
                        genai_types.Part.from_function_response(
                            name=tool.name,
                            response={"error": str(exc)},
                        )
                    )
            contents.extend(response_parts)
        else:
            final_text = (
                f"I stopped after reaching the current tool loop limit ({_max_tool_loops()}). "
                "The chat log above includes the latest model notes, tool plans, and completed steps."
            )

        final_text = _append_grounding_sources_to_text(final_text or "Task completed.", grounding_summary)

        await _complete_admin_ai_job(
            job_id=job_id,
            admin_id=admin.id,
            final_text=final_text,
            final_tool_calls=final_tool_calls,
            grounding_summary=grounding_summary,
        )
    except asyncio.CancelledError:
        await _cancel_admin_ai_job(job_id)
        raise
    except Exception as exc:
        error_message = "Model request timed out." if isinstance(exc, asyncio.TimeoutError) else str(exc)
        await _mark_admin_ai_job_failed(job_id, error_message)
        raise


async def _complete_admin_ai_job(
    *,
    job_id: UUID,
    admin_id: UUID,
    final_text: str,
    final_tool_calls: list[dict[str, Any]],
    grounding_summary: dict[str, Any] | None,
) -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        job = await session.get(AdminAiJob, job_id)
        if job is None:
            return
        thread = await session.get(AdminAiThread, job.thread_id)
        if thread is None:
            return
        admin = await _build_admin_principal_for_job(session, job)
        assistant_message = await append_admin_ai_message(
            session,
            thread=thread,
            admin=admin,
            role=AdminAiMessageRole.ASSISTANT,
            content=final_text,
            tool_calls=final_tool_calls,
        )
        job.assistant_message_id = assistant_message.id
        job.status = AdminAiJobStatus.COMPLETED
        job.finished_at = _now()
        payload = dict(job.result_payload or {})
        payload.update(
            {
                "assistant_message_id": str(assistant_message.id),
                "assistant_preview": assistant_message.content[:500],
            }
        )
        if grounding_summary is not None:
            payload["grounding"] = grounding_summary
        job.result_payload = payload
        thread.last_job_status = AdminAiJobStatus.COMPLETED
        thread.summary = assistant_message.content[:240]
        thread.updated_at = _now()
        await session.commit()


async def _cancel_admin_ai_job(job_id: UUID) -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        job = await session.get(AdminAiJob, job_id)
        if job is None:
            return
        thread = await session.get(AdminAiThread, job.thread_id)
        job.status = AdminAiJobStatus.CANCELED
        job.error_message = "Cancelled by admin."
        job.finished_at = _now()
        if thread is not None:
            thread.last_job_status = AdminAiJobStatus.CANCELED
            thread.updated_at = _now()
        await session.commit()


async def _mark_admin_ai_job_failed(job_id: UUID, error_message: str) -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        job = await session.get(AdminAiJob, job_id)
        if job is None:
            return
        thread = await session.get(AdminAiThread, job.thread_id)
        job.status = AdminAiJobStatus.FAILED
        job.error_message = error_message[:4000]
        job.finished_at = _now()
        if thread is not None:
            thread.last_job_status = AdminAiJobStatus.FAILED
            thread.summary = error_message[:240]
            thread.updated_at = _now()
        await session.commit()


def run_admin_ai_job(job_id: str | UUID) -> None:
    job_uuid = UUID(str(job_id))
    reset_session_state()
    try:
        asyncio.run(_run_admin_ai_job_once(job_uuid))
    except Exception as exc:
        reset_session_state()
        message = "Model request timed out." if isinstance(exc, asyncio.TimeoutError) else str(exc)
        asyncio.run(_mark_admin_ai_job_failed(job_uuid, message))
        raise


async def resume_pending_admin_ai_jobs() -> None:
    from app.tasks.celery_app import celery_app

    session_maker = get_session_maker()
    async with session_maker() as session:
        pending_jobs = list(
            (
                await session.scalars(
                    select(AdminAiJob).where(
                        AdminAiJob.status.in_([AdminAiJobStatus.QUEUED, AdminAiJobStatus.RUNNING])
                    )
                )
            ).all()
        )
        for job in pending_jobs:
            thread = await session.get(AdminAiThread, job.thread_id)
            if thread is None:
                continue

            next_status: AdminAiJobStatus | None = None
            next_error: str | None = None
            if (job.broker_task_id or "").strip():
                state = await asyncio.to_thread(lambda: celery_app.AsyncResult(job.broker_task_id or "").state)
                if state == "REVOKED":
                    next_status = AdminAiJobStatus.CANCELED
                    next_error = "Cancelled by admin."
                elif state == "FAILURE":
                    next_status = AdminAiJobStatus.FAILED
                    next_error = "Celery worker failed before the admin AI job could finish."
            else:
                age_seconds = (_now() - (job.updated_at or job.created_at)).total_seconds()
                if age_seconds >= _STALE_LEGACY_JOB_SECONDS:
                    next_status = AdminAiJobStatus.FAILED
                    next_error = "Legacy in-process admin AI job lost its worker. Retry the job."

            if next_status is None:
                continue

            job.status = next_status
            job.error_message = next_error
            job.finished_at = _now()
            thread.last_job_status = next_status
            thread.summary = (next_error or thread.summary or "")[:240]
            thread.updated_at = _now()

        await session.commit()
