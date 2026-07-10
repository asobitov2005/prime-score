from __future__ import annotations

import hashlib
import json
import logging
import re
import time
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from google.genai import types as genai_types
from pydantic import BaseModel, Field, TypeAdapter, ValidationError, field_validator
from sqlalchemy import select

from app.db.session import get_session_maker
from app.models.enums import (
    AiProvider,
    AiUseCase,
    WritingErrorCategory,
    WritingSubmissionStatus,
    WritingTaskType,
)
from app.models.writing import WritingEvaluation, WritingEvaluationRun, WritingSubmission, WritingTask
from app.services.ai_config import ResolvedAiUseCaseConfig, resolve_ai_use_case_config
from app.services.ai_generation import generate_text_sync
from app.services.writing_config import (
    WritingAnchorBundle,
    WritingPromptBundle,
    WritingRubricBundle,
    get_active_anchor_bundle,
    get_active_prompt_bundle,
    get_active_rubric_bundle,
    render_annotation_repair_prompt,
    render_grader_system_prompt,
    render_grader_user_prompt,
    render_improved_version_prompt,
    render_json_repair_prompt,
)
from app.services.writing_roast import generate_roast
from app.services.xp import award_xp_for_writing_submission
from app.services.writing_rubric import (
    calculate_overall_band,
    round_to_ielts_band,
)
from app.services.writing_blueprint import (
    WritingBenchmarkCardBundle,
    WritingDescriptorBundle,
    build_pipeline_run_payload,
    get_active_benchmark_card_bundle,
    get_active_descriptor_bundle,
    round_criterion_band,
)

logger = logging.getLogger(__name__)


_HTML_TAG_RE = re.compile(r"</?[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")
_ALLOWED_SEVERITIES = {"error", "warning", "suggestion"}
_DEFAULT_GRADER_MAX_OUTPUT_TOKENS = 8192
_DEFAULT_ANNOTATION_MAX_OUTPUT_TOKENS = 8192
_DEFAULT_REPAIR_MAX_OUTPUT_TOKENS = 4096
_DEFAULT_IMPROVED_MAX_OUTPUT_TOKENS = 4096
_GROQ_GRADER_MAX_OUTPUT_TOKENS = 2048
_GROQ_ANNOTATION_MAX_OUTPUT_TOKENS = 1024
_GROQ_REPAIR_MAX_OUTPUT_TOKENS = 1024
_GROQ_IMPROVED_MAX_OUTPUT_TOKENS = 1536
_GROQ_RUBRIC_CHAR_LIMIT = 2800
_GROQ_ANCHOR_RATIONALE_LIMIT = 240
_GROQ_ANCHOR_COUNT = 3


class _CriterionPayload(BaseModel):
    band: float
    reasoning: str = ""
    summary: str = ""
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    evidence_quotes: list[str] = Field(default_factory=list)

    @field_validator("strengths", "improvements", "evidence_quotes", mode="before")
    @classmethod
    def _coerce_to_list(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            return [v]
        return v


class _AnnotationPayload(BaseModel):
    offset: int
    length: int
    original: str
    replacements: list[str] = Field(default_factory=list)
    category: str
    severity: str = "warning"
    short_message: str = ""
    explanation: str = ""
    band_impact: str = ""
    examiner_tip: str = ""
    improved_sentence: str = ""


class _VocabularySuggestionPayload(BaseModel):
    current_phrase: str = ""
    improved_phrase: str = ""
    level: str = ""
    why_it_works: str = ""
    example_sentence: str = ""


class _TargetActionPayload(BaseModel):
    title: str = ""
    why: str = ""
    how: str = ""
    example: str = ""
    band_impact: str = ""
    priority: int = 0


class _BandBoundaryPayload(BaseModel):
    criterion: str = ""
    current_band: float = 0.0
    next_band: float = 0.0
    why_current: str = ""
    required_for_next: str = ""


class _ChecklistPayload(BaseModel):
    label: str = ""
    status: str = "partial"
    detail: str = ""
    how_to_fix: str = ""


class _ErrorTaxonomyPayload(BaseModel):
    category: str = ""
    subcategory: str = ""
    label: str = ""
    count: int = 0
    examples: list[str] = Field(default_factory=list)
    fix: str = ""


class _SentenceFixPayload(BaseModel):
    priority: int = 0
    original: str = ""
    replacement: str = ""
    corrected_sentence: str = ""
    why: str = ""
    band_impact: str = ""
    category: str = ""


class _ScoreBoosterPayload(BaseModel):
    criterion: str = ""
    original: str = ""
    why_it_scores: str = ""
    keep_doing: str = ""
    band_value: str = ""


class _GraderPayload(BaseModel):
    task_achievement: _CriterionPayload
    coherence: _CriterionPayload
    lexical: _CriterionPayload
    grammar: _CriterionPayload
    overall_summary: str = ""
    next_steps: list[str] = Field(default_factory=list)
    inline_annotations: list[_AnnotationPayload] = Field(default_factory=list)
    vocabulary_suggestions: list[_VocabularySuggestionPayload] = Field(default_factory=list)
    target_action_plan: list[_TargetActionPayload] = Field(default_factory=list)
    band_boundaries: list[_BandBoundaryPayload] = Field(default_factory=list)
    ielts_checklist: list[_ChecklistPayload] = Field(default_factory=list)
    error_taxonomy: list[_ErrorTaxonomyPayload] = Field(default_factory=list)
    sentence_fixes: list[_SentenceFixPayload] = Field(default_factory=list)
    score_boosters: list[_ScoreBoosterPayload] = Field(default_factory=list)


_ANNOTATION_LIST_ADAPTER = TypeAdapter(list[_AnnotationPayload])
_VOCAB_MAX_COUNT = 8
_GENERIC_PATTERNS = (
    "improve grammar",
    "improve your grammar",
    "use better vocabulary",
    "improve vocabulary",
    "develop your ideas",
    "be more specific",
    "give more details",
    "add more examples",
    "work on coherence",
    "more practice",
    "practice more",
    "clear response with room for improvement",
)

_TASK_2_VOCAB_RULES: list[dict[str, Any]] = [
    {
        "patterns": [r"\blearn many useful things\b", r"\buseful things\b"],
        "current_phrase": "learn many useful things",
        "improved_phrase": "acquire essential life skills",
        "level": "C1",
        "why": "It replaces vague wording with a more academic collocation for personal development.",
        "example": "By working, children can acquire essential life skills.",
    },
    {
        "patterns": [r"\bfuture life\b"],
        "current_phrase": "future life",
        "improved_phrase": "their future careers",
        "level": "C1",
        "why": "It is more precise when discussing work and long-term development.",
        "example": "These habits can help them in their future careers.",
    },
    {
        "patterns": [r"\bhow hard money is earned\b", r"\bearning money is not easy\b"],
        "current_phrase": "how hard money is earned",
        "improved_phrase": "develop financial literacy",
        "level": "C1",
        "why": "It turns a general idea into a stronger academic phrase about money awareness.",
        "example": "Part-time work can help teenagers develop financial literacy.",
    },
    {
        "patterns": [r"\bhow real job works\b", r"\breal job\b"],
        "current_phrase": "how real job works",
        "improved_phrase": "how the workplace functions",
        "level": "C1",
        "why": "It sounds more natural and formal in academic writing.",
        "example": "Early exposure helps students understand how the workplace functions.",
    },
    {
        "patterns": [r"\blittle money\b"],
        "current_phrase": "little money",
        "improved_phrase": "a small income",
        "level": "C1",
        "why": "It sounds more natural and accurate in this context.",
        "example": "They may earn a small income while studying.",
    },
    {
        "patterns": [r"\bgood experience\b"],
        "current_phrase": "good experience",
        "improved_phrase": "a valuable formative experience",
        "level": "C2",
        "why": "It sounds more mature and specific than a basic adjective.",
        "example": "Part-time work can be a valuable formative experience.",
    },
    {
        "patterns": [r"\bcontrol the time\b", r"\bcontrol their working hours\b"],
        "current_phrase": "control the time",
        "improved_phrase": "regulate their working hours",
        "level": "C1",
        "why": "It gives the idea a more precise and academic tone.",
        "example": "Parents should regulate their working hours carefully.",
    },
    {
        "patterns": [r"\bschool results can go down\b", r"\bresults can go down\b"],
        "current_phrase": "school results can go down",
        "improved_phrase": "academic performance may suffer",
        "level": "C1",
        "why": "It is a more natural academic collocation than a literal phrase.",
        "example": "If work hours are excessive, academic performance may suffer.",
    },
    {
        "patterns": [r"\bmore mature\b"],
        "current_phrase": "more mature",
        "improved_phrase": "more self-disciplined",
        "level": "C1",
        "why": "It is more specific and sounds less repetitive.",
        "example": "These responsibilities can make teenagers more self-disciplined.",
    },
    {
        "patterns": [r"\bthink only about money\b"],
        "current_phrase": "think only about money",
        "improved_phrase": "become overly money-focused",
        "level": "C1",
        "why": "It sounds more natural and less conversational.",
        "example": "Some teenagers may become overly money-focused.",
    },
    {
        "patterns": [r"\bbad for their study and health\b", r"\bbad for their studies and health\b"],
        "current_phrase": "bad for their study and health",
        "improved_phrase": "adversely affect their studies and well-being",
        "level": "C2",
        "why": "It gives a stronger academic tone and covers the health idea more precisely.",
        "example": "Excessive work can adversely affect their studies and well-being.",
    },
    {
        "patterns": [r"\bpart time job\b", r"\bpart-time job\b"],
        "current_phrase": "part time job",
        "improved_phrase": "part-time employment",
        "level": "C1",
        "why": "It sounds more formal and natural in IELTS essays.",
        "example": "Part-time employment can build responsibility and independence.",
    },
]

_TASK_1_VOCAB_RULES: list[dict[str, Any]] = [
    {
        "patterns": [r"\bwent up\b", r"\brose\b", r"\bincrease\b"],
        "current_phrase": "went up",
        "improved_phrase": "rose steadily",
        "level": "C1",
        "why": "It is more precise than a basic verb phrase.",
        "example": "The figure rose steadily over the period.",
    },
    {
        "patterns": [r"\bwent down\b", r"\bfall\b", r"\bdecrease\b"],
        "current_phrase": "went down",
        "improved_phrase": "declined gradually",
        "level": "C1",
        "why": "It sounds more academic and specific.",
        "example": "After 2010, the number declined gradually.",
    },
    {
        "patterns": [r"\bbecome highest\b", r"\bhighest\b"],
        "current_phrase": "become highest",
        "improved_phrase": "reach the highest level",
        "level": "C1",
        "why": "It is a natural report-writing phrase.",
        "example": "By 2020, country A reached the highest level.",
    },
    {
        "patterns": [r"\balways have more\b", r"\bmore than\b"],
        "current_phrase": "always have more",
        "improved_phrase": "maintained a clear lead",
        "level": "C2",
        "why": "It is a stronger overview phrase for Task 1.",
        "example": "Country A maintained a clear lead throughout the period.",
    },
    {
        "patterns": [r"\blower\b", r"\blowest\b"],
        "current_phrase": "always lowest",
        "improved_phrase": "remained the smallest market",
        "level": "C1",
        "why": "It sounds more academic and less repetitive.",
        "example": "Country D remained the smallest market until the end.",
    },
    {
        "patterns": [r"\ball of them grow up\b", r"\bgrow up\b"],
        "current_phrase": "grow up",
        "improved_phrase": "grow significantly",
        "level": "C1",
        "why": "It is the correct academic collocation for trend descriptions.",
        "example": "All four figures grew significantly over the decade.",
    },
]

_GENERAL_VOCAB_RULES: list[dict[str, Any]] = [
    {
        "patterns": [r"\bgood\b"],
        "current_phrase": "good",
        "improved_phrase": "beneficial",
        "level": "C1",
        "why": "It is more formal and flexible for IELTS writing.",
        "example": "Part-time work can be beneficial for teenagers.",
    },
    {
        "patterns": [r"\bbad\b"],
        "current_phrase": "bad",
        "improved_phrase": "detrimental",
        "level": "C1",
        "why": "It is a stronger academic adjective.",
        "example": "Excessive work can be detrimental to health.",
    },
    {
        "patterns": [r"\bthings\b"],
        "current_phrase": "things",
        "improved_phrase": "skills",
        "level": "C1",
        "why": "It replaces vague wording with a clearer noun.",
        "example": "Students can acquire useful skills through work.",
    },
    {
        "patterns": [r"\bmore mature\b"],
        "current_phrase": "more mature",
        "improved_phrase": "more responsible",
        "level": "C1",
        "why": "It is a more natural evaluation of personal growth.",
        "example": "The experience can make teenagers more responsible.",
    },
]


def _strip_html(text: str) -> str:
    if not text:
        return ""
    if "<" not in text or ">" not in text:
        return text
    return _HTML_TAG_RE.sub(" ", text)


def _normalize_essay(text: str) -> str:
    return _WHITESPACE_RE.sub(" ", (text or "")).strip().lower()


def compute_essay_hash(task_id: str, essay_text: str, task_type: str) -> str:
    payload = f"{task_type}|{task_id}|{_normalize_essay(essay_text)}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _writing_generate_config(**kwargs: Any) -> genai_types.GenerateContentConfig:
    # Writing uses a dedicated Gemini model, and some model IDs reject
    # thinkingLevel/thinkingConfig entirely. Keep writing requests free of
    # thinking controls unless that model contract is revisited explicitly.
    return genai_types.GenerateContentConfig(**kwargs)


def _criterion_schema() -> genai_types.Schema:
    return genai_types.Schema(
        type=genai_types.Type.OBJECT,
        required=["band", "reasoning", "summary", "strengths", "improvements", "evidence_quotes"],
        properties={
            "band": genai_types.Schema(type=genai_types.Type.NUMBER),
            "reasoning": genai_types.Schema(type=genai_types.Type.STRING),
            "summary": genai_types.Schema(type=genai_types.Type.STRING),
            "strengths": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=genai_types.Schema(type=genai_types.Type.STRING),
            ),
            "improvements": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=genai_types.Schema(type=genai_types.Type.STRING),
            ),
            "evidence_quotes": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=genai_types.Schema(type=genai_types.Type.STRING),
            ),
        },
    )


def _annotation_schema() -> genai_types.Schema:
    return genai_types.Schema(
        type=genai_types.Type.OBJECT,
        required=[
            "offset",
            "length",
            "original",
            "replacements",
            "category",
            "severity",
            "short_message",
            "explanation",
        ],
        properties={
            "offset": genai_types.Schema(type=genai_types.Type.INTEGER),
            "length": genai_types.Schema(type=genai_types.Type.INTEGER),
            "original": genai_types.Schema(type=genai_types.Type.STRING),
            "replacements": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=genai_types.Schema(type=genai_types.Type.STRING),
            ),
            "category": genai_types.Schema(
                type=genai_types.Type.STRING,
                enum=[c.value for c in WritingErrorCategory],
            ),
            "severity": genai_types.Schema(
                type=genai_types.Type.STRING,
                enum=sorted(_ALLOWED_SEVERITIES),
            ),
            "short_message": genai_types.Schema(type=genai_types.Type.STRING),
            "explanation": genai_types.Schema(type=genai_types.Type.STRING),
            "band_impact": genai_types.Schema(type=genai_types.Type.STRING),
            "examiner_tip": genai_types.Schema(type=genai_types.Type.STRING),
            "improved_sentence": genai_types.Schema(type=genai_types.Type.STRING),
        },
    )


def _vocabulary_suggestion_schema() -> genai_types.Schema:
    return genai_types.Schema(
        type=genai_types.Type.OBJECT,
        required=[
            "current_phrase",
            "improved_phrase",
            "level",
            "why_it_works",
            "example_sentence",
        ],
        properties={
            "current_phrase": genai_types.Schema(type=genai_types.Type.STRING),
            "improved_phrase": genai_types.Schema(type=genai_types.Type.STRING),
            "level": genai_types.Schema(
                type=genai_types.Type.STRING,
                enum=["C1", "C2"],
            ),
            "why_it_works": genai_types.Schema(type=genai_types.Type.STRING),
            "example_sentence": genai_types.Schema(type=genai_types.Type.STRING),
        },
    )


def _target_action_schema() -> genai_types.Schema:
    return genai_types.Schema(
        type=genai_types.Type.OBJECT,
        properties={
            "title": genai_types.Schema(type=genai_types.Type.STRING),
            "why": genai_types.Schema(type=genai_types.Type.STRING),
            "how": genai_types.Schema(type=genai_types.Type.STRING),
            "example": genai_types.Schema(type=genai_types.Type.STRING),
            "band_impact": genai_types.Schema(type=genai_types.Type.STRING),
            "priority": genai_types.Schema(type=genai_types.Type.INTEGER),
        },
    )


def _band_boundary_schema() -> genai_types.Schema:
    return genai_types.Schema(
        type=genai_types.Type.OBJECT,
        properties={
            "criterion": genai_types.Schema(type=genai_types.Type.STRING),
            "current_band": genai_types.Schema(type=genai_types.Type.NUMBER),
            "next_band": genai_types.Schema(type=genai_types.Type.NUMBER),
            "why_current": genai_types.Schema(type=genai_types.Type.STRING),
            "required_for_next": genai_types.Schema(type=genai_types.Type.STRING),
        },
    )


def _checklist_schema() -> genai_types.Schema:
    return genai_types.Schema(
        type=genai_types.Type.OBJECT,
        properties={
            "label": genai_types.Schema(type=genai_types.Type.STRING),
            "status": genai_types.Schema(type=genai_types.Type.STRING, enum=["met", "partial", "missing"]),
            "detail": genai_types.Schema(type=genai_types.Type.STRING),
            "how_to_fix": genai_types.Schema(type=genai_types.Type.STRING),
        },
    )


def _error_taxonomy_schema() -> genai_types.Schema:
    return genai_types.Schema(
        type=genai_types.Type.OBJECT,
        properties={
            "category": genai_types.Schema(type=genai_types.Type.STRING),
            "subcategory": genai_types.Schema(type=genai_types.Type.STRING),
            "label": genai_types.Schema(type=genai_types.Type.STRING),
            "count": genai_types.Schema(type=genai_types.Type.INTEGER),
            "examples": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=genai_types.Schema(type=genai_types.Type.STRING),
            ),
            "fix": genai_types.Schema(type=genai_types.Type.STRING),
        },
    )


def _sentence_fix_schema() -> genai_types.Schema:
    return genai_types.Schema(
        type=genai_types.Type.OBJECT,
        properties={
            "priority": genai_types.Schema(type=genai_types.Type.INTEGER),
            "original": genai_types.Schema(type=genai_types.Type.STRING),
            "replacement": genai_types.Schema(type=genai_types.Type.STRING),
            "corrected_sentence": genai_types.Schema(type=genai_types.Type.STRING),
            "why": genai_types.Schema(type=genai_types.Type.STRING),
            "band_impact": genai_types.Schema(type=genai_types.Type.STRING),
            "category": genai_types.Schema(type=genai_types.Type.STRING),
        },
    )


def _score_booster_schema() -> genai_types.Schema:
    return genai_types.Schema(
        type=genai_types.Type.OBJECT,
        properties={
            "criterion": genai_types.Schema(type=genai_types.Type.STRING),
            "original": genai_types.Schema(type=genai_types.Type.STRING),
            "why_it_scores": genai_types.Schema(type=genai_types.Type.STRING),
            "keep_doing": genai_types.Schema(type=genai_types.Type.STRING),
            "band_value": genai_types.Schema(type=genai_types.Type.STRING),
        },
    )


def _response_schema() -> genai_types.Schema:
    criterion = _criterion_schema()
    return genai_types.Schema(
        type=genai_types.Type.OBJECT,
        required=[
            "task_achievement",
            "coherence",
            "lexical",
            "grammar",
            "overall_summary",
            "next_steps",
            "inline_annotations",
            "vocabulary_suggestions",
            "target_action_plan",
            "band_boundaries",
            "ielts_checklist",
            "error_taxonomy",
            "sentence_fixes",
            "score_boosters",
        ],
        properties={
            "task_achievement": criterion,
            "coherence": criterion,
            "lexical": criterion,
            "grammar": criterion,
            "overall_summary": genai_types.Schema(type=genai_types.Type.STRING),
            "next_steps": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=genai_types.Schema(type=genai_types.Type.STRING),
            ),
            "inline_annotations": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=_annotation_schema(),
            ),
            "vocabulary_suggestions": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=_vocabulary_suggestion_schema(),
            ),
            "target_action_plan": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=_target_action_schema(),
            ),
            "band_boundaries": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=_band_boundary_schema(),
            ),
            "ielts_checklist": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=_checklist_schema(),
            ),
            "error_taxonomy": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=_error_taxonomy_schema(),
            ),
            "sentence_fixes": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=_sentence_fix_schema(),
            ),
            "score_boosters": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=_score_booster_schema(),
            ),
        },
    )


def _annotation_list_schema() -> genai_types.Schema:
    return genai_types.Schema(
        type=genai_types.Type.ARRAY,
        items=_annotation_schema(),
    )


def _seed_from_hash(essay_hash: str) -> int:
    return int(essay_hash[:8], 16) % (2**31)


def _essay_word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text or ""))


def _is_groq_config(config: ResolvedAiUseCaseConfig | None) -> bool:
    return config is not None and config.provider == AiProvider.GROQ


def _grader_max_output_tokens(config: ResolvedAiUseCaseConfig | None) -> int:
    if _is_groq_config(config):
        return _GROQ_GRADER_MAX_OUTPUT_TOKENS
    return _DEFAULT_GRADER_MAX_OUTPUT_TOKENS


def _annotation_max_output_tokens(config: ResolvedAiUseCaseConfig | None) -> int:
    if _is_groq_config(config):
        return _GROQ_ANNOTATION_MAX_OUTPUT_TOKENS
    return _DEFAULT_ANNOTATION_MAX_OUTPUT_TOKENS


def _repair_max_output_tokens(config: ResolvedAiUseCaseConfig | None) -> int:
    if _is_groq_config(config):
        return _GROQ_REPAIR_MAX_OUTPUT_TOKENS
    return _DEFAULT_REPAIR_MAX_OUTPUT_TOKENS


def _improved_max_output_tokens(config: ResolvedAiUseCaseConfig) -> int:
    if _is_groq_config(config):
        return _GROQ_IMPROVED_MAX_OUTPUT_TOKENS
    return _DEFAULT_IMPROVED_MAX_OUTPUT_TOKENS


def _skip_groq_aux_call(config: ResolvedAiUseCaseConfig | None) -> bool:
    return _is_groq_config(config)


def _compact_text_block(value: str | None, *, limit: int) -> str:
    cleaned = _clean_text(value)
    if len(cleaned) <= limit:
        return cleaned
    shortened = cleaned[:limit].rsplit(" ", 1)[0].rstrip(" ,;:")
    return f"{shortened}..."


def _extract_band_block(section_text: str, band: int) -> str:
    pattern = re.compile(rf"Band {band}\n(?P<body>.*?)(?=\n\nBand \d+\n|\Z)", re.DOTALL)
    match = pattern.search(section_text)
    if match is None:
        return ""
    lines = [line.strip(" -\t") for line in match.group("body").splitlines() if line.strip()]
    return " ".join(lines)


def _select_task_specific_band_text(raw_text: str, *, task_type: str) -> str:
    if "Task 1:" not in raw_text and "Task 2:" not in raw_text:
        return raw_text
    wanted = "Task 1:" if task_type == WritingTaskType.TASK_1.value else "Task 2:"
    for chunk in raw_text.split("Task "):
        normalized = chunk.strip()
        if normalized.startswith(wanted.replace("Task ", "")):
            return f"Task {normalized}"
    return raw_text


def _extract_rubric_section(body: str, heading: str, next_heading: str | None) -> str:
    start = body.find(heading)
    if start == -1:
        return ""
    end = body.find(next_heading, start + len(heading)) if next_heading else -1
    if end == -1:
        end = len(body)
    return body[start:end]


def _build_groq_rubric_reference(rubric: WritingRubricBundle, *, task_type: str) -> str:
    body = rubric.body or ""
    sections = [
        (
            "Task Response",
            _extract_rubric_section(body, "1. TASK ACHIEVEMENT", "2. COHERENCE AND COHESION"),
        ),
        (
            "Coherence",
            _extract_rubric_section(body, "2. COHERENCE AND COHESION", "3. LEXICAL RESOURCE"),
        ),
        (
            "Lexical",
            _extract_rubric_section(body, "3. LEXICAL RESOURCE", "4. GRAMMATICAL RANGE AND ACCURACY"),
        ),
        (
            "Grammar",
            _extract_rubric_section(body, "4. GRAMMATICAL RANGE AND ACCURACY", "GRADING INSTRUCTIONS"),
        ),
    ]
    summary_lines = [
        "Use IELTS descriptors conservatively. If the essay sits between bands, choose the lower band.",
    ]
    for label, section in sections:
        if not section:
            continue
        band_parts: list[str] = []
        for band in (8, 7, 6, 5):
            excerpt = _extract_band_block(section, band)
            excerpt = _select_task_specific_band_text(excerpt, task_type=task_type)
            excerpt = _compact_text_block(excerpt, limit=220)
            if excerpt:
                band_parts.append(f"{band}: {excerpt}")
        if band_parts:
            summary_lines.append(f"{label} bands -> " + " | ".join(band_parts))
    return _compact_text_block("\n".join(summary_lines), limit=_GROQ_RUBRIC_CHAR_LIMIT)


def _build_groq_anchor_reference(anchors: WritingAnchorBundle) -> str:
    if not anchors.items:
        return "No anchor snapshots provided."
    lines: list[str] = []
    for anchor in anchors.items[:_GROQ_ANCHOR_COUNT]:
        criteria = anchor.get("criteria", {})
        rationale = _compact_text_block(anchor.get("rationale", ""), limit=_GROQ_ANCHOR_RATIONALE_LIMIT)
        lines.append(
            "Band {band}: TA {ta}, CC {cc}, LR {lr}, GRA {gra}. Snapshot: {rationale}".format(
                band=anchor.get("band"),
                ta=criteria.get("task_achievement"),
                cc=criteria.get("coherence"),
                lr=criteria.get("lexical"),
                gra=criteria.get("grammar"),
                rationale=rationale or "No rationale provided.",
            )
        )
    return "\n".join(lines)


def _build_groq_system_instruction(
    *,
    rubric: WritingRubricBundle,
    task_type: str,
) -> str:
    return "\n\n".join(
        [
            "You are a strict IELTS Writing examiner.",
            "Score only what is on the page. Do not reward effort, memorised polish, or generic AI-style fluency.",
            "Do not award Band 8+ for safe, formulaic, or merely error-light writing unless descriptor evidence is unmistakable.",
            "Clear but predictable ideas, mechanical transitions, safe repeated vocabulary, or conventional grammar usually cap the relevant criterion around Band 7.0-7.5.",
            "Quote short phrases from the essay as evidence. Keep summaries concrete and essay-specific.",
            _build_groq_rubric_reference(rubric, task_type=task_type),
        ]
    )


def _build_groq_grading_prompt(
    *,
    anchors: WritingAnchorBundle,
    task_type: str,
    task_prompt_text: str,
    image_summary: str,
    essay_text: str,
    desired_score: float | None,
) -> str:
    prompt_parts = [
        f"TASK TYPE: {task_type.upper()}",
        f"TASK PROMPT:\n{task_prompt_text.strip()}",
    ]
    if task_type == WritingTaskType.TASK_1.value and image_summary.strip():
        prompt_parts.append(
            "VISUAL DESCRIPTION (ground truth, do not reinterpret):\n"
            + image_summary.strip()
        )
    prompt_parts.extend(
        [
            "CALIBRATION SNAPSHOTS:",
            _build_groq_anchor_reference(anchors),
            "TARGET SCORE CONTEXT:",
            (
                f"Dashboard Desired Score: Band {desired_score:.1f}. "
                "If the essay is below that target, make next_steps a realistic +0.5 to +1.0 band path without overloading the learner. "
                "If it already meets or exceeds the target, make next_steps preserve the current band and push toward the next realistic +0.5 to +1.0 band."
                if desired_score is not None
                else "No learner desired score provided. Make next_steps target the next realistic +0.5 to +1.0 band."
            ),
            "OUTPUT CONTRACT:",
            "Return JSON only.",
            "Top-level keys: task_achievement, coherence, lexical, grammar, overall_summary, next_steps, inline_annotations, vocabulary_suggestions, target_action_plan, band_boundaries, ielts_checklist, error_taxonomy, sentence_fixes, score_boosters.",
            "Each criterion object must contain: band, reasoning, summary, strengths, improvements, evidence_quotes.",
            "Use whole criterion bands only: 0, 1, 2, 3, 4, 5, 6, 7, 8, or 9. Do not output 5.5, 6.5, 7.5, or 8.5 for any individual criterion.",
            "Keep strengths/improvements/evidence_quotes short and specific: 1-2 items each.",
            "overall_summary: exactly 2 short sentences.",
            "next_steps: exactly 3 short strings tied to this essay.",
            "target_action_plan: exactly 3 objects with title, why, how, example, band_impact, priority. Aim for realistic +0.5 to +1.0 improvement, not an impossible rewrite.",
            "band_boundaries: 4 objects, one per IELTS criterion, explaining why current band holds and what the next realistic +0.5 to +1.0 needs.",
            "ielts_checklist: 5 task-specific items with label, status, detail, how_to_fix.",
            "error_taxonomy: 3-6 repeated weak patterns with category, subcategory, label, count, examples, fix.",
            "sentence_fixes: 3-8 priority sentence-level corrections with original, replacement, corrected_sentence, why, band_impact, category.",
            "score_boosters: 3-6 original phrases/sentences that helped the band. Include criterion, exact original text, why_it_scores, keep_doing, band_value. band_value must describe scoring effect, not overclaim a full band.",
            "STRICT SCORING CALIBRATION: Band 8 requires clear descriptor evidence, not just good structure and few mistakes. Predictable ideas, formulaic transitions, safe vocabulary, or conventional grammar usually cap that criterion at 7.0-7.5.",
            "TARGET INTEGRITY: Desired Score is only a coaching goal, not a scoring boost. Never inflate a band so the learner passes the target. If evidence is between two bands, choose the lower band unless the higher descriptor is consistently proven across the whole essay.",
            "inline_annotations: return [].",
            "vocabulary_suggestions: return [].",
            "===== CANDIDATE ESSAY START =====",
            essay_text,
            "===== CANDIDATE ESSAY END =====",
        ]
    )
    return "\n\n".join(part for part in prompt_parts if part)


def _format_anchors_block(anchors: list[dict[str, Any]]) -> str:
    blocks: list[str] = []
    for anchor in anchors:
        criteria = anchor.get("criteria", {})
        blocks.append(
            "----- ANCHOR ESSAY (Band {band}) -----\n"
            "Criteria bands -> TA: {ta}, CC: {cc}, LR: {lr}, GRA: {gra}\n"
            "Rationale: {rationale}\n"
            "Essay:\n{essay}\n----- END ANCHOR -----".format(
                band=anchor.get("band"),
                ta=criteria.get("task_achievement"),
                cc=criteria.get("coherence"),
                lr=criteria.get("lexical"),
                gra=criteria.get("grammar"),
                rationale=anchor.get("rationale", ""),
                essay=anchor.get("essay", ""),
            )
        )
    return "\n\n".join(blocks)


def _build_system_instruction(
    *,
    prompts: WritingPromptBundle,
    rubric: WritingRubricBundle,
    resolved_config: ResolvedAiUseCaseConfig | None = None,
    task_type: str,
) -> str:
    if _is_groq_config(resolved_config):
        return _build_groq_system_instruction(rubric=rubric, task_type=task_type)
    return render_grader_system_prompt(prompts=prompts, rubric=rubric)


def _build_grading_prompt(
    *,
    prompts: WritingPromptBundle,
    anchors: WritingAnchorBundle,
    resolved_config: ResolvedAiUseCaseConfig | None = None,
    task_type: str,
    task_prompt_text: str,
    image_summary: str,
    essay_text: str,
    desired_score: float | None = None,
) -> str:
    if _is_groq_config(resolved_config):
        return _build_groq_grading_prompt(
            anchors=anchors,
            task_type=task_type,
            task_prompt_text=task_prompt_text,
            image_summary=image_summary,
            essay_text=essay_text,
            desired_score=desired_score,
        )
    return render_grader_user_prompt(
        prompts=prompts,
        anchors=anchors,
        task_type=task_type,
        task_prompt_text=task_prompt_text,
        image_summary=image_summary,
        essay_text=essay_text,
        desired_score=desired_score,
    )


def _clean_text(value: str | None) -> str:
    return _WHITESPACE_RE.sub(" ", (value or "").strip())


def _trim_sentence(value: str, *, limit: int = 220) -> str:
    cleaned = _clean_text(value)
    if len(cleaned) <= limit:
        return cleaned
    shortened = cleaned[:limit].rsplit(" ", 1)[0].rstrip(" ,;:")
    return f"{shortened}..."


def _is_generic_text(value: str | None) -> bool:
    cleaned = _normalize_essay(value or "")
    if not cleaned:
        return True
    return any(pattern in cleaned for pattern in _GENERIC_PATTERNS)


def _criterion_records(
    grader: _GraderPayload,
    *,
    ta: float,
    cc: float,
    lr: float,
    gra: float,
) -> list[tuple[str, float, _CriterionPayload]]:
    return [
        ("Task Achievement", ta, grader.task_achievement),
        ("Coherence & Cohesion", cc, grader.coherence),
        ("Lexical Resource", lr, grader.lexical),
        ("Grammatical Range & Accuracy", gra, grader.grammar),
    ]


def _criterion_anchor_text(criterion: _CriterionPayload) -> str:
    for bucket in (criterion.evidence_quotes, criterion.improvements, criterion.strengths):
        for item in bucket:
            cleaned = _clean_text(item)
            if cleaned:
                return cleaned
    return ""


def _build_precise_summary(
    *,
    grader: _GraderPayload,
    overall_band: float,
    penalty: float,
    word_count: int,
    word_minimum: int,
    ta: float,
    cc: float,
    lr: float,
    gra: float,
) -> str:
    criteria = _criterion_records(grader, ta=ta, cc=cc, lr=lr, gra=gra)
    strongest_name, strongest_band, strongest_payload = max(criteria, key=lambda item: item[1])
    weakest_name, weakest_band, weakest_payload = min(criteria, key=lambda item: item[1])
    strongest_anchor = _criterion_anchor_text(strongest_payload)
    weakest_anchor = _criterion_anchor_text(weakest_payload)
    priority = _clean_text(
        weakest_payload.improvements[0] if weakest_payload.improvements else weakest_payload.summary
    )

    parts = [
        f"Band {overall_band:.1f} overall. Your strongest area is {strongest_name} at Band {strongest_band:.1f}"
        + (f", especially in {strongest_anchor!r}." if strongest_anchor else "."),
        f"The main score limit is {weakest_name} at Band {weakest_band:.1f}"
        + (f", where {weakest_anchor!r} still sounds underdeveloped or imprecise." if weakest_anchor else "."),
    ]
    if priority and word_count >= 120:
        parts.append(f"The fastest improvement now is to {priority.rstrip('.')}.")
    if penalty > 0:
        parts.append(
            f"Length also cost you {penalty:.1f} band because the response stayed below the {word_minimum}-word minimum."
        )
    if word_count < 90:
        return " ".join(parts[:1])
    if word_count < 180:
        return " ".join(parts[:2])
    return " ".join(parts[:4])


def _annotation_action(annotation: dict[str, Any]) -> str | None:
    original = _clean_text(str(annotation.get("original", "")))
    replacement = _clean_text(
        str(((annotation.get("replacements") or [""])[0]))
    )
    short_message = _clean_text(str(annotation.get("short_message", "")))
    if not original:
        return None
    if replacement:
        action = f"Replace {original!r} with {replacement!r}"
    else:
        action = f"Fix {original!r}"
    if short_message:
        action += f" to solve the {short_message.lower()} issue"
    band_impact = _clean_text(str(annotation.get("band_impact", "")))
    if band_impact:
        action += f"; {band_impact.rstrip('.')}"
    return f"{action}."


def _criterion_action(name: str, criterion: _CriterionPayload) -> str | None:
    improvement = _clean_text(criterion.improvements[0] if criterion.improvements else criterion.summary)
    if not improvement:
        return None
    return f"In {name}, {improvement.rstrip('.')}."


def _build_precise_next_steps(
    *,
    grader: _GraderPayload,
    annotations: list[dict[str, Any]],
    word_count: int,
    ta: float,
    cc: float,
    lr: float,
    gra: float,
) -> list[str]:
    criteria = _criterion_records(grader, ta=ta, cc=cc, lr=lr, gra=gra)
    ordered_criteria = sorted(criteria, key=lambda item: item[1])
    steps: list[str] = []
    seen: set[str] = set()

    for annotation in annotations:
        action = _annotation_action(annotation)
        if action and action not in seen:
            seen.add(action)
            steps.append(action)
        if len(steps) >= 2:
            break

    for name, _, criterion in ordered_criteria:
        action = _criterion_action(name, criterion)
        if action and action not in seen:
            seen.add(action)
            steps.append(action)
        if len(steps) >= 3:
            break

    fallback = [
        "Write one more revision draft and fix every highlighted sentence before changing ideas.",
        "Underline repeated nouns and verbs, then upgrade at least three of them with stronger academic collocations.",
        "Check each paragraph for one clear main idea, one supporting explanation, and one precise example or comparison.",
    ]
    for item in fallback:
        if item not in seen:
            steps.append(item)
        if len(steps) >= 3:
            break
    target_count = 2 if word_count < 180 else 3
    return steps[:target_count]


def _target_context_label(*, current_band: float, desired_score: float | None) -> str:
    stretch_target = min(9.0, current_band + 1.0)
    passed_target = min(9.0, current_band + 0.5)
    if desired_score is None:
        return f"Band {current_band:.1f} -> {stretch_target:.1f}"
    if current_band >= desired_score:
        return f"Band {current_band:.1f} -> {passed_target:.1f}"
    return f"Band {current_band:.1f} -> {min(desired_score, stretch_target):.1f}"


def _normalize_target_actions(
    *,
    grader: _GraderPayload,
    precise_next_steps: list[str],
    annotations: list[dict[str, Any]],
    overall_band: float,
    desired_score: float | None,
) -> list[dict[str, Any]]:
    target = _target_context_label(current_band=overall_band, desired_score=desired_score)
    normalized: list[dict[str, Any]] = []
    for item in grader.target_action_plan:
        title = _trim_sentence(item.title, limit=64)
        how = _trim_sentence(item.how, limit=150)
        why = _trim_sentence(item.why, limit=120)
        if not title and how:
            title = how.split(".")[0][:64].strip()
        if not how and title:
            how = title
        if not title or not how:
            continue
        normalized.append(
            {
                "title": title,
                "why": why or f"Needed for {target}.",
                "how": how,
                "example": _trim_sentence(item.example, limit=140),
                "band_impact": _trim_sentence(item.band_impact, limit=100) or target,
                "priority": item.priority or len(normalized) + 1,
            }
        )
        if len(normalized) >= 3:
            break

    for step in precise_next_steps:
        if len(normalized) >= 3:
            break
        clean = _trim_sentence(step, limit=150)
        if not clean:
            continue
        normalized.append(
            {
                "title": clean.split(";")[0].split(".")[0][:64].strip() or "Fix the score limiter",
                "why": f"This is the shortest move for {target}.",
                "how": clean,
                "example": "",
                "band_impact": target,
                "priority": len(normalized) + 1,
            }
        )

    for annotation in annotations:
        if len(normalized) >= 3:
            break
        action = _annotation_action(annotation)
        if not action:
            continue
        normalized.append(
            {
                "title": "Fix this sentence first",
                "why": _trim_sentence(str(annotation.get("short_message") or ""), limit=100) or f"It blocks {target}.",
                "how": _trim_sentence(action, limit=150),
                "example": _trim_sentence(str(annotation.get("improved_sentence") or ""), limit=140),
                "band_impact": _trim_sentence(str(annotation.get("band_impact") or ""), limit=100) or target,
                "priority": len(normalized) + 1,
            }
        )
    return normalized[:3]


def _normalize_band_boundaries(
    *,
    grader: _GraderPayload,
    ta: float,
    cc: float,
    lr: float,
    gra: float,
) -> list[dict[str, Any]]:
    supplied = []
    for item in grader.band_boundaries:
        criterion = _trim_sentence(item.criterion, limit=70)
        if not criterion:
            continue
        supplied.append(
            {
                "criterion": criterion,
                "current_band": round_to_ielts_band(item.current_band),
                "next_band": round_to_ielts_band(item.next_band or min(9.0, item.current_band + 1.0)),
                "why_current": _trim_sentence(item.why_current, limit=170),
                "required_for_next": _trim_sentence(item.required_for_next, limit=170),
            }
        )
    if len(supplied) >= 4:
        return supplied[:4]

    fallback: list[dict[str, Any]] = []
    for name, band, criterion in _criterion_records(grader, ta=ta, cc=cc, lr=lr, gra=gra):
        required = _clean_text(criterion.improvements[0] if criterion.improvements else criterion.summary)
        fallback.append(
            {
                "criterion": name,
                "current_band": band,
                "next_band": min(9.0, band + 1.0),
                "why_current": _trim_sentence(criterion.reasoning or criterion.summary, limit=170),
                "required_for_next": _trim_sentence(required, limit=170),
            }
        )
    return fallback


def _normalize_checklist_payload(grader: _GraderPayload) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    for item in grader.ielts_checklist:
        label = _trim_sentence(item.label, limit=80)
        if not label:
            continue
        status = item.status if item.status in {"met", "partial", "missing"} else "partial"
        items.append(
            {
                "label": label,
                "status": status,
                "detail": _trim_sentence(item.detail, limit=140),
                "how_to_fix": _trim_sentence(item.how_to_fix, limit=140),
            }
        )
    return items[:5]


def _normalize_error_taxonomy(grader: _GraderPayload) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for item in grader.error_taxonomy:
        label = _trim_sentence(item.label, limit=80)
        if not label:
            continue
        count = max(0, int(item.count or 0))
        items.append(
            {
                "category": _clean_text(item.category).lower() or "style",
                "subcategory": _clean_text(item.subcategory).lower(),
                "label": label,
                "count": count,
                "examples": [_trim_sentence(example, limit=100) for example in item.examples[:3] if _clean_text(example)],
                "fix": _trim_sentence(item.fix, limit=140),
            }
        )
    return items[:6]


def _normalize_sentence_fixes(
    *,
    grader: _GraderPayload,
    annotations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in grader.sentence_fixes:
        original = _trim_sentence(item.original, limit=180)
        corrected = _trim_sentence(item.corrected_sentence or item.replacement, limit=220)
        if not original or original in seen:
            continue
        seen.add(original)
        items.append(
            {
                "priority": item.priority or len(items) + 1,
                "original": original,
                "replacement": _trim_sentence(item.replacement, limit=180),
                "corrected_sentence": corrected,
                "why": _trim_sentence(item.why, limit=130),
                "band_impact": _trim_sentence(item.band_impact, limit=100),
                "category": _clean_text(item.category).lower(),
            }
        )
        if len(items) >= 8:
            break

    for annotation in annotations:
        if len(items) >= 8:
            break
        original = _trim_sentence(str(annotation.get("original", "")), limit=180)
        if not original or original in seen:
            continue
        replacement = _trim_sentence(str(((annotation.get("replacements") or [""])[0])), limit=180)
        corrected = _trim_sentence(str(annotation.get("improved_sentence") or replacement), limit=220)
        if not replacement and not corrected:
            continue
        seen.add(original)
        items.append(
            {
                "priority": len(items) + 1,
                "original": original,
                "replacement": replacement,
                "corrected_sentence": corrected,
                "why": _trim_sentence(str(annotation.get("explanation") or annotation.get("short_message") or ""), limit=130),
                "band_impact": _trim_sentence(str(annotation.get("band_impact") or ""), limit=100),
                "category": _clean_text(str(annotation.get("category") or "")),
            }
        )
    return items


def _normalize_score_boosters(grader: _GraderPayload) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in grader.score_boosters:
        original = _trim_sentence(item.original, limit=180)
        if not original or original in seen:
            continue
        seen.add(original)
        band_value = _trim_sentence(item.band_value, limit=80)
        if band_value.lower().startswith("band "):
            band_value = "Supports the criterion"
        items.append(
            {
                "criterion": _trim_sentence(item.criterion, limit=70),
                "original": original,
                "why_it_scores": _trim_sentence(item.why_it_scores, limit=150),
                "keep_doing": _trim_sentence(item.keep_doing, limit=130),
                "band_value": band_value,
            }
        )
        if len(items) >= 6:
            break
    if items:
        return items

    for name, _, criterion in _criterion_records(
        grader,
        ta=grader.task_achievement.band,
        cc=grader.coherence.band,
        lr=grader.lexical.band,
        gra=grader.grammar.band,
    ):
        for quote in criterion.evidence_quotes[:2]:
            original = _trim_sentence(quote, limit=180)
            if not original or original in seen:
                continue
            seen.add(original)
            items.append(
                {
                    "criterion": name,
                    "original": original,
                    "why_it_scores": _trim_sentence(criterion.strengths[0] if criterion.strengths else criterion.summary, limit=150),
                    "keep_doing": "Keep this pattern in future essays.",
                    "band_value": f"Supports {name}",
                }
            )
            if len(items) >= 6:
                return items
    return items


def _normalize_vocabulary_suggestions(
    suggestions: list[_VocabularySuggestionPayload],
) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for suggestion in suggestions:
        current_phrase = _clean_text(suggestion.current_phrase)
        improved_phrase = _clean_text(suggestion.improved_phrase)
        if not current_phrase or not improved_phrase:
            continue
        key = (current_phrase.lower(), improved_phrase.lower())
        if key in seen:
            continue
        seen.add(key)
        level = suggestion.level.strip().upper()
        if level not in {"C1", "C2"}:
            level = "C1"
        normalized.append(
            {
                "current_phrase": current_phrase,
                "improved_phrase": improved_phrase,
                "level": level,
                "why_it_works": _trim_sentence(suggestion.why_it_works, limit=180),
                "example_sentence": _trim_sentence(suggestion.example_sentence, limit=220),
            }
        )
        if len(normalized) >= _VOCAB_MAX_COUNT:
            break
    return normalized


def _append_vocab_rule_suggestions(
    *,
    rules: list[dict[str, Any]],
    essay_text: str,
    items: list[dict[str, str]],
    seen: set[tuple[str, str]],
) -> None:
    for rule in rules:
        if len(items) >= _VOCAB_MAX_COUNT:
            return
        patterns = rule.get("patterns", [])
        if not patterns:
            continue
        matched = any(re.search(pattern, essay_text, flags=re.IGNORECASE) for pattern in patterns)
        if not matched:
            continue
        current_phrase = _clean_text(str(rule.get("current_phrase", "")))
        improved_phrase = _clean_text(str(rule.get("improved_phrase", "")))
        if not current_phrase or not improved_phrase:
            continue
        key = (current_phrase.lower(), improved_phrase.lower())
        if key in seen:
            continue
        seen.add(key)
        items.append(
            {
                "current_phrase": current_phrase,
                "improved_phrase": improved_phrase,
                "level": str(rule.get("level", "C1")).upper(),
                "why_it_works": _trim_sentence(str(rule.get("why", "")), limit=180),
                "example_sentence": _trim_sentence(str(rule.get("example", "")), limit=220),
            }
        )


def _augment_vocabulary_suggestions(
    *,
    task_type: str,
    essay_text: str,
    annotations: list[dict[str, Any]],
    items: list[dict[str, str]],
) -> list[dict[str, str]]:
    seen: set[tuple[str, str]] = {
        (item["current_phrase"].lower(), item["improved_phrase"].lower()) for item in items
    }

    _append_vocab_rule_suggestions(
        rules=_TASK_2_VOCAB_RULES if task_type == WritingTaskType.TASK_2.value else _TASK_1_VOCAB_RULES,
        essay_text=essay_text,
        items=items,
        seen=seen,
    )
    _append_vocab_rule_suggestions(
        rules=_GENERAL_VOCAB_RULES,
        essay_text=essay_text,
        items=items,
        seen=seen,
    )

    if len(items) < _VOCAB_MAX_COUNT:
        for annotation in annotations:
            if len(items) >= _VOCAB_MAX_COUNT:
                break
            category = str(annotation.get("category", "")).lower()
            if category not in {"lexical", "style", "cohesion"}:
                continue
            current_phrase = _clean_text(str(annotation.get("original", "")))
            replacements = annotation.get("replacements") or []
            improved_phrase = _clean_text(str(replacements[0] if replacements else ""))
            if not current_phrase or not improved_phrase:
                continue
            key = (current_phrase.lower(), improved_phrase.lower())
            if key in seen:
                continue
            seen.add(key)
            items.append(
                {
                    "current_phrase": current_phrase,
                    "improved_phrase": improved_phrase,
                    "level": "C1",
                    "why_it_works": _trim_sentence(
                        _clean_text(str(annotation.get("explanation", "")))
                        or _clean_text(str(annotation.get("examiner_tip", "")))
                        or "This version sounds more precise and natural in academic writing.",
                        limit=180,
                    ),
                    "example_sentence": _trim_sentence(
                        _clean_text(str(annotation.get("improved_sentence", "")))
                        or f"Writers can use {improved_phrase!r} when they need a more natural academic phrase.",
                        limit=220,
                    ),
                }
            )

    return items[:_VOCAB_MAX_COUNT]


def _assert_grader_payload_integrity(
    grader: _GraderPayload,
    *,
    essay_text: str,
) -> None:
    if _essay_word_count(essay_text) < 20:
        return

    criteria = [
        ("task_achievement", grader.task_achievement),
        ("coherence", grader.coherence),
        ("lexical", grader.lexical),
        ("grammar", grader.grammar),
    ]
    zero_bands = [name for name, criterion in criteria if criterion.band <= 0]
    if zero_bands:
        raise ValueError(
            "Grader returned zero-band criteria for a non-empty essay: "
            + ", ".join(zero_bands)
        )


def _validate_annotations(
    annotations: list[_AnnotationPayload], essay_text: str
) -> list[dict[str, Any]]:
    def resolve_span(
        *,
        offset: int,
        length: int,
        original: str,
    ) -> tuple[int, int, str] | None:
        if offset < 0 or length <= 0:
            return None

        essay_len = len(essay_text)
        if not original:
            end = offset + length
            if end > essay_len:
                return None
            actual = essay_text[offset:end]
            return offset, length, actual

        expected = original
        expected_len = len(expected)
        if expected_len <= 0:
            return None

        end = offset + expected_len
        if end <= essay_len:
            actual = essay_text[offset:end]
            if actual == expected:
                return offset, expected_len, actual

        window_start = max(0, offset - 64)
        window_end = min(essay_len, offset + expected_len + 64)
        window = essay_text[window_start:window_end]
        local_hits: list[int] = []
        start_at = 0
        while True:
            found = window.find(expected, start_at)
            if found == -1:
                break
            local_hits.append(window_start + found)
            start_at = found + 1

        if local_hits:
            best_offset = min(local_hits, key=lambda candidate: abs(candidate - offset))
            return best_offset, expected_len, essay_text[best_offset:best_offset + expected_len]

        global_hits: list[int] = []
        start_at = 0
        while True:
            found = essay_text.find(expected, start_at)
            if found == -1:
                break
            global_hits.append(found)
            start_at = found + 1

        if len(global_hits) == 1:
            best_offset = global_hits[0]
            return best_offset, expected_len, essay_text[best_offset:best_offset + expected_len]

        return None

    cleaned: list[dict[str, Any]] = []
    for ann in annotations:
        resolved = resolve_span(
            offset=ann.offset,
            length=ann.length,
            original=ann.original,
        )
        if resolved is None:
            continue
        resolved_offset, resolved_length, actual = resolved
        try:
            category = WritingErrorCategory(ann.category.strip().lower())
        except ValueError:
            continue
        severity = ann.severity.strip().lower() if ann.severity else "warning"
        if severity not in _ALLOWED_SEVERITIES:
            severity = "warning"
        cleaned.append(
            {
                "offset": resolved_offset,
                "length": resolved_length,
                "original": actual,
                "replacements": [r for r in ann.replacements if isinstance(r, str)][:5],
                "category": category.value,
                "severity": severity,
                "short_message": ann.short_message or "",
                "explanation": ann.explanation or "",
                "band_impact": ann.band_impact or "",
                "examiner_tip": ann.examiner_tip or "",
                "improved_sentence": ann.improved_sentence or "",
            }
        )
    return cleaned


def _dedupe_annotations(annotations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ordered = sorted(
        annotations,
        key=lambda item: (item["offset"], -item["length"], item["category"]),
    )
    deduped: list[dict[str, Any]] = []
    index_by_key: dict[tuple[int, int, str], int] = {}
    for item in ordered:
        key = (item["offset"], item["length"], item["category"])
        existing_index = index_by_key.get(key)
        if existing_index is None:
            index_by_key[key] = len(deduped)
            deduped.append(item)
            continue
        existing = deduped[existing_index]
        existing_score = len(existing.get("explanation", "")) + len(existing.get("band_impact", ""))
        current_score = len(item.get("explanation", "")) + len(item.get("band_impact", ""))
        if current_score > existing_score:
            deduped[existing_index] = item
    return deduped


def _call_grader(
    *,
    resolved_config: ResolvedAiUseCaseConfig | None = None,
    prompts: WritingPromptBundle | None = None,
    client: Any | None = None,
    system_instruction: str,
    prompt: str,
    essay_text: str,
    seed: int,
) -> _GraderPayload:
    max_output_tokens = _grader_max_output_tokens(resolved_config)
    config = _writing_generate_config(
        systemInstruction=system_instruction,
        temperature=0,
        topP=1,
        seed=seed,
        maxOutputTokens=max_output_tokens,
        responseMimeType="application/json",
        responseSchema=_response_schema(),
    )
    last_error: Exception | None = None
    for _ in range(2):
        if client is not None:
            response = client.models.generate_content(
                model="test-model",
                contents=prompt,
                config=config,
            )
            raw_text = (response.text or "").strip()
        else:
            if resolved_config is None:
                raise RuntimeError("resolved_config is required when client is not provided.")
            raw_text = generate_text_sync(
                config=resolved_config,
                system_instruction=system_instruction,
                prompt=prompt,
                temperature=0,
                top_p=1,
                max_output_tokens=max_output_tokens,
                response_mime_type="application/json",
                response_schema=_response_schema(),
                seed=seed,
            )
        if not raw_text:
            last_error = RuntimeError("Empty response from grader")
            continue
        try:
            data = json.loads(_extract_json_payload(raw_text))
            payload = _GraderPayload.model_validate(data)
            _assert_grader_payload_integrity(payload, essay_text=essay_text)
            return payload
        except (json.JSONDecodeError, ValidationError) as exc:
            last_error = exc
            repaired_text = _repair_grader_json(
                resolved_config=resolved_config,
                prompts=prompts,
                client=client,
                raw_text=raw_text,
                seed=seed,
            )
            if repaired_text:
                try:
                    data = json.loads(_extract_json_payload(repaired_text))
                    payload = _GraderPayload.model_validate(data)
                    _assert_grader_payload_integrity(payload, essay_text=essay_text)
                    return payload
                except (json.JSONDecodeError, ValidationError, ValueError) as repair_exc:
                    last_error = repair_exc
            continue
        except ValueError as exc:
            last_error = exc
            continue
    raise RuntimeError(f"Grader returned invalid or incomplete payload: {last_error}")


def _extract_json_payload(raw_text: str) -> str:
    text = raw_text.strip()
    if text.startswith("```"):
        lines = [line for line in text.splitlines() if not line.strip().startswith("```")]
        text = "\n".join(lines).strip()
    object_start = text.find("{")
    array_start = text.find("[")
    starts = [(object_start, "}"), (array_start, "]")]
    starts = [(idx, closing) for idx, closing in starts if idx != -1]
    if starts:
        start, closing = min(starts, key=lambda item: item[0])
        end = text.rfind(closing)
        if end != -1 and end > start:
            return text[start : end + 1]
    return text


def _build_annotation_recovery_prompt(*, essay_text: str, hints: list[str]) -> str:
    prompt_parts = [
        "You are a strict IELTS writing line editor and annotation generator.",
        "Return ONLY a JSON array of annotation objects.",
        "Find the specific text-level issues that are holding this essay below the learner's target band or the next realistic +0.5 band.",
        "Include real spelling mistakes, grammar mistakes, tense/form errors, article/preposition errors, punctuation problems, wrong word forms, awkward or imprecise vocabulary, weak collocations, and clearly broken cohesive phrasing.",
        "You may include lexical upgrades when the current wording is understandable but unnatural, inaccurate, or too weak for a higher IELTS band.",
        "Do NOT annotate mere style preferences that do not materially improve the IELTS result.",
        "STRICT RULES:",
        "1. `original` must be copied verbatim from the essay, character-for-character.",
        "2. `offset` is the exact 0-based character index in the raw essay between the markers.",
        "3. `length` must equal the exact character count of `original`.",
        "4. Before outputting each item, verify mentally that essay[offset:offset+length] == original.",
        "5. If you are unsure about any item, omit it.",
        "6. Prefer 6-18 high-value annotations and avoid duplicates.",
        "7. `short_message` must be a sharp issue label, not a vague sentence.",
        "8. `explanation` must be 2-4 specific sentences explaining what is wrong in THIS exact phrase or sentence, what rule is broken, and why the replacement is better.",
        "9. `band_impact` must state which IELTS criterion is affected and how this mistake holds the band down.",
        "10. `examiner_tip` must state what a stronger Band 7-9 writer would do instead.",
        "11. `improved_sentence` must rewrite only the containing sentence with the minimum changes needed to fix the problem while preserving meaning.",
    ]
    if hints:
        prompt_parts.append("KNOWN ISSUE HINTS:")
        prompt_parts.extend(f"- {hint}" for hint in hints[:20])
    prompt_parts.append("===== CANDIDATE ESSAY START =====")
    prompt_parts.append(essay_text)
    prompt_parts.append("===== CANDIDATE ESSAY END =====")
    return "\n".join(prompt_parts)


def _call_annotation_recovery(
    *,
    resolved_config: ResolvedAiUseCaseConfig | None = None,
    prompts: WritingPromptBundle | None = None,
    client: Any | None = None,
    essay_text: str,
    hints: list[str],
    seed: int,
) -> list[_AnnotationPayload]:
    max_output_tokens = _annotation_max_output_tokens(resolved_config)
    prompt = _build_annotation_recovery_prompt(
        essay_text=essay_text,
        hints=hints,
    )
    if resolved_config and resolved_config.provider == AiProvider.GROQ:
        prompt += (
            "\n\nReturn JSON array only. Every item must contain: "
            "offset, length, original, replacements, category, severity, "
            "short_message, explanation, band_impact, examiner_tip, improved_sentence."
        )
    if client is not None:
        response = client.models.generate_content(
            model="test-model",
            contents=prompt,
            config=_writing_generate_config(
                temperature=0,
                topP=1,
                seed=seed,
                maxOutputTokens=max_output_tokens,
                responseMimeType="application/json",
                responseSchema=_annotation_list_schema(),
            ),
        )
        raw_text = (response.text or "").strip()
    else:
        if resolved_config is None:
            raise RuntimeError("resolved_config is required when client is not provided.")
        raw_text = generate_text_sync(
            config=resolved_config,
            prompt=prompt,
            temperature=0,
            top_p=1,
            seed=seed,
            max_output_tokens=max_output_tokens,
            response_mime_type="application/json",
            response_schema=_annotation_list_schema(),
        )
    if not raw_text:
        return []
    try:
        data = json.loads(_extract_json_payload(raw_text))
        return _ANNOTATION_LIST_ADAPTER.validate_python(data)
    except (json.JSONDecodeError, ValidationError):
        repaired_text = _repair_annotation_json(
            resolved_config=resolved_config,
            prompts=prompts,
            client=client,
            raw_text=raw_text,
            seed=seed,
        )
        if not repaired_text:
            raise
        data = json.loads(_extract_json_payload(repaired_text))
        return _ANNOTATION_LIST_ADAPTER.validate_python(data)


def _repair_annotation_json(
    *,
    resolved_config: ResolvedAiUseCaseConfig | None,
    prompts: WritingPromptBundle | None,
    client: Any | None = None,
    raw_text: str,
    seed: int,
) -> str | None:
    max_output_tokens = _repair_max_output_tokens(resolved_config)
    if client is not None:
        response = client.models.generate_content(
            model="test-model",
            contents=(
                "Repair the broken JSON annotation array below so it becomes valid JSON "
                "matching the annotation schema exactly. Preserve meaning when possible, "
                "use [] for missing arrays, use \"\" for missing strings, and output JSON only.\n\n"
                f"BROKEN JSON:\n{raw_text}"
            ),
            config=_writing_generate_config(
                temperature=0,
                topP=1,
                seed=seed,
                maxOutputTokens=max_output_tokens,
                responseMimeType="application/json",
                responseSchema=_annotation_list_schema(),
            ),
        )
        repaired = (response.text or "").strip()
    else:
        if resolved_config is None or prompts is None:
            raise RuntimeError("resolved_config and prompts are required when client is not provided.")
        repaired = generate_text_sync(
            config=resolved_config,
            prompt=render_annotation_repair_prompt(prompts, raw_text),
            temperature=0,
            top_p=1,
            seed=seed,
            max_output_tokens=max_output_tokens,
            response_mime_type="application/json",
            response_schema=_annotation_list_schema(),
        )
    return repaired or None


def _repair_grader_json(
    *,
    resolved_config: ResolvedAiUseCaseConfig | None,
    prompts: WritingPromptBundle | None,
    client: Any | None = None,
    raw_text: str,
    seed: int,
) -> str | None:
    max_output_tokens = _repair_max_output_tokens(resolved_config)
    if client is not None:
        response = client.models.generate_content(
            model="test-model",
            contents=(
                "Repair the broken IELTS grader JSON below so it becomes valid JSON "
                "that matches the response schema exactly. Preserve meaning when possible, "
                "use [] for missing arrays, use \"\" for missing strings, and output JSON only.\n\n"
                f"BROKEN JSON:\n{raw_text}"
            ),
            config=_writing_generate_config(
                temperature=0,
                topP=1,
                seed=seed,
                maxOutputTokens=max_output_tokens,
                responseMimeType="application/json",
                responseSchema=_response_schema(),
            ),
        )
        repaired = (response.text or "").strip()
    else:
        if resolved_config is None or prompts is None:
            raise RuntimeError("resolved_config and prompts are required when client is not provided.")
        repaired = generate_text_sync(
            config=resolved_config,
            prompt=render_json_repair_prompt(prompts, raw_text),
            temperature=0,
            top_p=1,
            seed=seed,
            max_output_tokens=max_output_tokens,
            response_mime_type="application/json",
            response_schema=_response_schema(),
        )
    return repaired or None


def _generate_improved_version(
    *,
    resolved_config: ResolvedAiUseCaseConfig,
    prompts: WritingPromptBundle,
    essay_text: str,
    annotations: list[dict[str, Any]],
    task_prompt_text: str,
    overall_band: float,
    desired_score: float | None,
    word_count: int,
    word_minimum: int,
) -> str:
    if not annotations:
        return essay_text
    annotations_lines = [
        (
            f"- offset {a['offset']} length {a['length']} "
            f"({a['category']}, {a['severity']}): "
            f"replace {a['original']!r} with {a['replacements'][:1] or ['(see explanation)']} "
            f"-- {a['short_message']}"
        )
        for a in annotations
    ]
    target_band = min(9.0, overall_band + 1.0)
    if desired_score is not None:
        if overall_band >= desired_score:
            target_band = min(9.0, overall_band + 0.5)
        else:
            target_band = min(9.0, max(overall_band + 0.5, min(desired_score, overall_band + 1.0)))
    prompt = render_improved_version_prompt(
        prompts=prompts,
        essay_text=essay_text,
        annotations_lines=annotations_lines,
        task_prompt_text=task_prompt_text,
        current_band=overall_band,
        target_band=target_band,
        desired_score=desired_score,
        word_count=word_count,
        word_minimum=word_minimum,
    )
    text = generate_text_sync(
        config=resolved_config,
        prompt=prompt,
        temperature=0,
        top_p=1,
        max_output_tokens=_improved_max_output_tokens(resolved_config),
    )
    return text or essay_text


def _build_payload(
    *,
    grader: _GraderPayload,
    annotations: list[dict[str, Any]],
    essay_text: str,
    task_type: str,
    word_count: int,
    word_minimum: int,
    desired_score: float | None,
    model_version: str,
    prompt_profile_version: int = 1,
    rubric_version: int = 1,
    anchor_set_version: int = 1,
    latency_ms: int = 0,
    descriptors: WritingDescriptorBundle | None = None,
    benchmarks: WritingBenchmarkCardBundle | None = None,
) -> dict[str, Any]:
    ta = round_criterion_band(grader.task_achievement.band)
    cc = round_criterion_band(grader.coherence.band)
    lr = round_criterion_band(grader.lexical.band)
    gra = round_criterion_band(grader.grammar.band)
    overall_pre_penalty = calculate_overall_band(ta, cc, lr, gra)

    penalty = 0.0
    if word_minimum > 0:
        if word_count < word_minimum * 0.6:
            penalty = 1.0
        elif word_count < word_minimum:
            penalty = 0.5

    overall_after_penalty = max(0.0, min(9.0, overall_pre_penalty - penalty))
    overall_after_penalty = round_to_ielts_band(overall_after_penalty)
    precise_summary = _build_precise_summary(
        grader=grader,
        overall_band=overall_after_penalty,
        penalty=penalty,
        word_count=word_count,
        word_minimum=word_minimum,
        ta=ta,
        cc=cc,
        lr=lr,
        gra=gra,
    )
    precise_next_steps = _build_precise_next_steps(
        grader=grader,
        annotations=annotations,
        word_count=word_count,
        ta=ta,
        cc=cc,
        lr=lr,
        gra=gra,
    )
    normalized_vocabulary = _normalize_vocabulary_suggestions(grader.vocabulary_suggestions)
    normalized_vocabulary = _augment_vocabulary_suggestions(
        task_type=task_type,
        essay_text=essay_text,
        annotations=annotations,
        items=normalized_vocabulary,
    )
    target_action_plan = _normalize_target_actions(
        grader=grader,
        precise_next_steps=precise_next_steps,
        annotations=annotations,
        overall_band=overall_after_penalty,
        desired_score=desired_score,
    )
    band_boundaries = _normalize_band_boundaries(grader=grader, ta=ta, cc=cc, lr=lr, gra=gra)
    ielts_checklist = _normalize_checklist_payload(grader)
    error_taxonomy = _normalize_error_taxonomy(grader)
    sentence_fixes = _normalize_sentence_fixes(grader=grader, annotations=annotations)
    score_boosters = _normalize_score_boosters(grader)

    feedback = {
        "task_achievement": {
            "band": ta,
            "summary": grader.task_achievement.summary,
            "strengths": grader.task_achievement.strengths,
            "improvements": grader.task_achievement.improvements,
            "evidence_quotes": grader.task_achievement.evidence_quotes,
            "reasoning": grader.task_achievement.reasoning,
        },
        "coherence": {
            "band": cc,
            "summary": grader.coherence.summary,
            "strengths": grader.coherence.strengths,
            "improvements": grader.coherence.improvements,
            "evidence_quotes": grader.coherence.evidence_quotes,
            "reasoning": grader.coherence.reasoning,
        },
        "lexical": {
            "band": lr,
            "summary": grader.lexical.summary,
            "strengths": grader.lexical.strengths,
            "improvements": grader.lexical.improvements,
            "evidence_quotes": grader.lexical.evidence_quotes,
            "reasoning": grader.lexical.reasoning,
        },
        "grammar": {
            "band": gra,
            "summary": grader.grammar.summary,
            "strengths": grader.grammar.strengths,
            "improvements": grader.grammar.improvements,
            "evidence_quotes": grader.grammar.evidence_quotes,
            "reasoning": grader.grammar.reasoning,
        },
        "overall_summary": precise_summary,
        "next_steps": precise_next_steps,
        "vocabulary_suggestions": normalized_vocabulary[:_VOCAB_MAX_COUNT],
        "target_action_plan": target_action_plan,
        "band_boundaries": band_boundaries,
        "ielts_checklist": ielts_checklist,
        "error_taxonomy": error_taxonomy,
        "sentence_fixes": sentence_fixes,
        "score_boosters": score_boosters,
    }

    rubric_reasoning = {
        "task_achievement": grader.task_achievement.reasoning,
        "coherence": grader.coherence.reasoning,
        "lexical": grader.lexical.reasoning,
        "grammar": grader.grammar.reasoning,
        "overall_pre_penalty": overall_pre_penalty,
        "word_count_penalty": penalty,
    }
    evaluation_run = build_pipeline_run_payload(
        ta=ta,
        cc=cc,
        lr=lr,
        gra=gra,
        overall_pre_penalty=overall_pre_penalty,
        final_band=overall_after_penalty,
        word_count_penalty=penalty,
        descriptors=descriptors,
        benchmarks=benchmarks,
    )

    return {
        "task_achievement_band": ta,
        "coherence_band": cc,
        "lexical_band": lr,
        "grammar_band": gra,
        "overall_band": overall_after_penalty,
        "potential_band": None,
        "word_count_penalty": penalty,
        "feedback": feedback,
        "inline_annotations": annotations,
        "improved_version": None,
        "rubric_reasoning": rubric_reasoning,
        "roast_feedback": {},
        "model_version": model_version,
        "prompt_version": f"profile:{prompt_profile_version}",
        "anchors_version": f"anchor:{anchor_set_version}",
        "grader_profile_version": prompt_profile_version,
        "rubric_version": rubric_version,
        "anchor_set_version": anchor_set_version,
        "roast_profile_version": prompt_profile_version,
        "improved_profile_version": prompt_profile_version,
        "annotation_profile_version": prompt_profile_version,
        "latency_ms": latency_ms,
        "evaluation_run": evaluation_run,
    }


def grade_essay_sync(
    *,
    task: WritingTask,
    essay_text: str,
    word_count: int,
    essay_hash: str,
    desired_score: float | None,
    grader_config: ResolvedAiUseCaseConfig,
    improver_config: ResolvedAiUseCaseConfig,
    roast_config: ResolvedAiUseCaseConfig | None,
    prompts: WritingPromptBundle,
    rubric: WritingRubricBundle,
    anchors: WritingAnchorBundle,
    descriptors: WritingDescriptorBundle | None = None,
    benchmarks: WritingBenchmarkCardBundle | None = None,
) -> dict[str, Any]:
    task_type_value = (
        task.task_type.value if isinstance(task.task_type, WritingTaskType) else str(task.task_type)
    )
    system_instruction = _build_system_instruction(
        prompts=prompts,
        rubric=rubric,
        resolved_config=grader_config,
        task_type=task_type_value,
    )
    prompt = _build_grading_prompt(
        prompts=prompts,
        anchors=anchors,
        resolved_config=grader_config,
        task_type=task_type_value,
        task_prompt_text=_strip_html(task.prompt_html or ""),
        image_summary=task.image_summary or "",
        essay_text=essay_text,
        desired_score=desired_score,
    )
    seed = _seed_from_hash(essay_hash)

    started = time.perf_counter()
    grader = _call_grader(
        resolved_config=grader_config,
        prompts=prompts,
        system_instruction=system_instruction,
        prompt=prompt,
        essay_text=essay_text,
        seed=seed,
    )
    grader_annotations = _validate_annotations(grader.inline_annotations, essay_text)
    annotation_hints = [
        *grader.lexical.improvements,
        *grader.grammar.improvements,
        *grader.coherence.improvements,
        *grader.task_achievement.improvements,
        *grader.lexical.evidence_quotes,
        *grader.grammar.evidence_quotes,
        *(
            f"{item['original']} -> {(item['replacements'][:1] or [''])[0]} ({item['short_message']})"
            for item in grader_annotations
        ),
    ]
    annotations = grader_annotations
    if _skip_groq_aux_call(grader_config):
        annotations = _dedupe_annotations(grader_annotations)
        logger.info(
            "Skipping annotation recovery for Groq writing grader to stay within provider TPM limits."
        )
    else:
        try:
            recovered_annotations = _call_annotation_recovery(
                resolved_config=grader_config,
                prompts=prompts,
                essay_text=essay_text,
                hints=[hint for hint in annotation_hints if hint],
                seed=seed + 17,
            )
            annotations = _dedupe_annotations(
                _validate_annotations(recovered_annotations, essay_text) + grader_annotations
            )
        except Exception:  # noqa: BLE001
            logger.exception("Annotation recovery failed")
            annotations = _dedupe_annotations(grader_annotations)

    word_minimum = int(task.word_minimum or 0)
    elapsed_ms = int((time.perf_counter() - started) * 1000)

    payload = _build_payload(
        grader=grader,
        annotations=annotations,
        essay_text=essay_text,
        task_type=task_type_value,
        word_count=word_count,
        word_minimum=word_minimum,
        desired_score=desired_score,
        model_version=f"{grader_config.provider.value}:{grader_config.model_id}",
        prompt_profile_version=prompts.profile_version,
        rubric_version=rubric.version,
        anchor_set_version=anchors.version,
        latency_ms=elapsed_ms,
        descriptors=descriptors,
        benchmarks=benchmarks,
    )

    improved_text: str | None = None
    potential_band: float | None = None
    if _skip_groq_aux_call(improver_config):
        logger.info(
            "Skipping improved-version generation for Groq writing improver to stay within provider TPM limits."
        )
    else:
        try:
            improved_text = _generate_improved_version(
                resolved_config=improver_config,
                prompts=prompts,
                essay_text=essay_text,
                annotations=annotations,
                task_prompt_text=_strip_html(task.prompt_html or ""),
                overall_band=payload["overall_band"],
                desired_score=desired_score,
                word_count=word_count,
                word_minimum=word_minimum,
            )
            if improved_text and improved_text != essay_text:
                if _skip_groq_aux_call(grader_config):
                    logger.info(
                        "Skipping Groq improved-version regrade to stay within provider TPM limits."
                    )
                    potential_band = None
                else:
                    regrade_prompt = _build_grading_prompt(
                        prompts=prompts,
                        anchors=anchors,
                        task_type=task_type_value,
                        task_prompt_text=_strip_html(task.prompt_html or ""),
                        image_summary=task.image_summary or "",
                        essay_text=improved_text,
                        desired_score=desired_score,
                    )
                    improved_seed = _seed_from_hash(
                        hashlib.sha256(improved_text.encode("utf-8")).hexdigest()
                    )
                    regrade = _call_grader(
                        resolved_config=grader_config,
                        prompts=prompts,
                        system_instruction=system_instruction,
                        prompt=regrade_prompt,
                        essay_text=improved_text,
                        seed=improved_seed,
                    )
                    potential_band = calculate_overall_band(
                        round_to_ielts_band(regrade.task_achievement.band),
                        round_to_ielts_band(regrade.coherence.band),
                        round_to_ielts_band(regrade.lexical.band),
                        round_to_ielts_band(regrade.grammar.band),
                    )
                    potential_band = round_to_ielts_band(
                        min(potential_band, payload["overall_band"] + 1.0)
                    )
            else:
                potential_band = payload["overall_band"]
        except Exception:  # noqa: BLE001
            logger.exception("Improved version generation failed")
            improved_text = None
            potential_band = None

    payload["improved_version"] = improved_text
    payload["potential_band"] = potential_band

    # Roast feedback: completely independent call, must NOT affect bands.
    if _skip_groq_aux_call(roast_config):
        roast = {}
        logger.info("Skipping Groq roast generation to stay within provider TPM limits.")
    else:
        try:
            roast = generate_roast(
                resolved_config=roast_config,
                prompts=prompts,
                essay_text=essay_text,
                bands={
                    "task_achievement": payload["task_achievement_band"],
                    "coherence": payload["coherence_band"],
                    "lexical": payload["lexical_band"],
                    "grammar": payload["grammar_band"],
                    "overall": payload["overall_band"],
                },
                word_count=word_count,
                word_minimum=word_minimum,
                annotation_count=len(annotations),
                overall_summary=payload["feedback"].get("overall_summary", ""),
            )
        except Exception:  # noqa: BLE001
            logger.exception("Roast generation crashed; ignoring.")
            roast = {}
    payload["roast_feedback"] = roast or {}

    return payload


async def _set_submission_state(
    submission_id: UUID,
    *,
    status: WritingSubmissionStatus,
    error_message: str | None,
) -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        result = await session.execute(
            select(WritingSubmission).where(WritingSubmission.id == submission_id)
        )
        submission = result.scalar_one_or_none()
        if submission is None:
            return
        submission.status = status
        submission.error_message = error_message[:500] if error_message else None
        await session.commit()


async def mark_submission_retrying(submission_id: UUID) -> None:
    await _set_submission_state(
        submission_id,
        status=WritingSubmissionStatus.QUEUED,
        error_message=None,
    )


async def mark_submission_failed(submission_id: UUID, error_message: str) -> None:
    await _set_submission_state(
        submission_id,
        status=WritingSubmissionStatus.FAILED,
        error_message=error_message,
    )


async def grade_submission(submission_id: UUID, *, mark_failed: bool = True) -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        submission_result = await session.execute(
            select(WritingSubmission).where(WritingSubmission.id == submission_id)
        )
        submission = submission_result.scalar_one_or_none()
        if submission is None:
            return

        task_result = await session.execute(
            select(WritingTask).where(WritingTask.id == submission.task_id)
        )
        task = task_result.scalar_one_or_none()
        if task is None:
            submission.status = WritingSubmissionStatus.FAILED
            submission.error_message = "Writing task not found"
            await session.commit()
            return

        submission.status = WritingSubmissionStatus.GRADING
        submission.error_message = None
        await session.commit()

        task_id_str = str(task.id)
        task_type_value = (
            task.task_type.value
            if isinstance(task.task_type, WritingTaskType)
            else str(task.task_type)
        )
        essay_text = submission.essay_text
        word_count = submission.word_count
        essay_hash = submission.essay_hash or compute_essay_hash(
            task_id_str, essay_text, task_type_value
        )
        grader_config = await resolve_ai_use_case_config(session, AiUseCase.WRITING_GRADER)
        improver_config = await resolve_ai_use_case_config(session, AiUseCase.WRITING_IMPROVER)
        try:
            roast_config = await resolve_ai_use_case_config(session, AiUseCase.WRITING_ROAST)
        except Exception:
            roast_config = None
        prompts = await get_active_prompt_bundle(session, task.task_type)
        rubric = await get_active_rubric_bundle(session, task.task_type)
        anchors = await get_active_anchor_bundle(session, task.task_type)
        descriptors = await get_active_descriptor_bundle(session, task.task_type)
        benchmarks = await get_active_benchmark_card_bundle(session, task.task_type)

    try:
        payload = grade_essay_sync(
            task=task,
            essay_text=essay_text,
            word_count=word_count,
            essay_hash=essay_hash,
            desired_score=getattr(submission, "desired_score", None),
            grader_config=grader_config,
            improver_config=improver_config,
            roast_config=roast_config,
            prompts=prompts,
            rubric=rubric,
            anchors=anchors,
            descriptors=descriptors,
            benchmarks=benchmarks,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Writing grading failed for submission %s", submission_id)
        if mark_failed:
            await mark_submission_failed(submission_id, str(exc))
        raise

    async with session_maker() as session:
        existing_result = await session.execute(
            select(WritingEvaluation).where(
                WritingEvaluation.submission_id == submission_id
            )
        )
        evaluation = existing_result.scalar_one_or_none()
        graded_at = datetime.now(UTC)
        if evaluation is None:
            evaluation = WritingEvaluation(
                submission_id=submission_id,
                task_achievement_band=payload["task_achievement_band"],
                coherence_band=payload["coherence_band"],
                lexical_band=payload["lexical_band"],
                grammar_band=payload["grammar_band"],
                overall_band=payload["overall_band"],
                potential_band=payload.get("potential_band"),
                word_count_penalty=payload.get("word_count_penalty", 0.0),
                feedback=payload["feedback"],
                inline_annotations=payload["inline_annotations"],
                improved_version=payload.get("improved_version"),
                rubric_reasoning=payload.get("rubric_reasoning", {}),
                roast_feedback=payload.get("roast_feedback", {}),
                model_version=payload.get("model_version", ""),
                prompt_version=payload.get("prompt_version", "profile:1"),
                anchors_version=payload.get("anchors_version", "anchor:1"),
                grader_profile_version=payload.get("grader_profile_version"),
                rubric_version=payload.get("rubric_version"),
                anchor_set_version=payload.get("anchor_set_version"),
                roast_profile_version=payload.get("roast_profile_version"),
                improved_profile_version=payload.get("improved_profile_version"),
                annotation_profile_version=payload.get("annotation_profile_version"),
                latency_ms=payload.get("latency_ms", 0),
                cache_hit=False,
                graded_at=graded_at,
            )
            session.add(evaluation)
        else:
            evaluation.task_achievement_band = payload["task_achievement_band"]
            evaluation.coherence_band = payload["coherence_band"]
            evaluation.lexical_band = payload["lexical_band"]
            evaluation.grammar_band = payload["grammar_band"]
            evaluation.overall_band = payload["overall_band"]
            evaluation.potential_band = payload.get("potential_band")
            evaluation.word_count_penalty = payload.get("word_count_penalty", 0.0)
            evaluation.feedback = payload["feedback"]
            evaluation.inline_annotations = payload["inline_annotations"]
            evaluation.improved_version = payload.get("improved_version")
            evaluation.rubric_reasoning = payload.get("rubric_reasoning", {})
            evaluation.roast_feedback = payload.get("roast_feedback", {})
            evaluation.model_version = payload.get("model_version", "")
            evaluation.prompt_version = payload.get("prompt_version", "profile:1")
            evaluation.anchors_version = payload.get("anchors_version", "anchor:1")
            evaluation.grader_profile_version = payload.get("grader_profile_version")
            evaluation.rubric_version = payload.get("rubric_version")
            evaluation.anchor_set_version = payload.get("anchor_set_version")
            evaluation.roast_profile_version = payload.get("roast_profile_version")
            evaluation.improved_profile_version = payload.get("improved_profile_version")
            evaluation.annotation_profile_version = payload.get("annotation_profile_version")
            evaluation.latency_ms = payload.get("latency_ms", 0)
            evaluation.cache_hit = False
            evaluation.graded_at = graded_at

        await session.flush()

        evaluation_run_payload = payload.get("evaluation_run") or {}
        run_result = await session.execute(
            select(WritingEvaluationRun).where(WritingEvaluationRun.submission_id == submission_id)
        )
        evaluation_run = run_result.scalar_one_or_none()
        if evaluation_run is None:
            evaluation_run = WritingEvaluationRun(
                submission_id=submission_id,
                evaluation_id=evaluation.id,
                pipeline_version=str(evaluation_run_payload.get("pipeline_version") or "blueprint_v1"),
                mode=str(evaluation_run_payload.get("mode") or "full_diagnostic"),
                initial_scores=evaluation_run_payload.get("initial_scores") or {},
                selected_benchmarks=evaluation_run_payload.get("selected_benchmarks") or [],
                calibration_result=evaluation_run_payload.get("calibration_result") or {},
                audit_result=evaluation_run_payload.get("audit_result") or {},
                confidence=str(evaluation_run_payload.get("confidence") or "Medium"),
                possible_score_range=str(evaluation_run_payload.get("possible_score_range") or ""),
                meta_learning_note=str(evaluation_run_payload.get("meta_learning_note") or ""),
            )
            session.add(evaluation_run)
        else:
            evaluation_run.evaluation_id = evaluation.id
            evaluation_run.pipeline_version = str(evaluation_run_payload.get("pipeline_version") or "blueprint_v1")
            evaluation_run.mode = str(evaluation_run_payload.get("mode") or "full_diagnostic")
            evaluation_run.initial_scores = evaluation_run_payload.get("initial_scores") or {}
            evaluation_run.selected_benchmarks = evaluation_run_payload.get("selected_benchmarks") or []
            evaluation_run.calibration_result = evaluation_run_payload.get("calibration_result") or {}
            evaluation_run.audit_result = evaluation_run_payload.get("audit_result") or {}
            evaluation_run.confidence = str(evaluation_run_payload.get("confidence") or "Medium")
            evaluation_run.possible_score_range = str(evaluation_run_payload.get("possible_score_range") or "")
            evaluation_run.meta_learning_note = str(evaluation_run_payload.get("meta_learning_note") or "")

        submission_result = await session.execute(
            select(WritingSubmission).where(WritingSubmission.id == submission_id)
        )
        submission = submission_result.scalar_one_or_none()
        if submission is not None:
            submission.status = WritingSubmissionStatus.COMPLETED
            submission.error_message = None
            task = await session.get(WritingTask, submission.task_id)
            if task is not None:
                await award_xp_for_writing_submission(session, submission, evaluation, task)
        await session.commit()
