from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_checker_dependencies import *
from app.services.writing_checker_part_01 import _ALLOWED_SEVERITIES, _DEFAULT_ANNOTATION_MAX_OUTPUT_TOKENS, _DEFAULT_GRADER_MAX_OUTPUT_TOKENS, _DEFAULT_IMPROVED_MAX_OUTPUT_TOKENS, _DEFAULT_REPAIR_MAX_OUTPUT_TOKENS, _GROQ_ANNOTATION_MAX_OUTPUT_TOKENS, _GROQ_GRADER_MAX_OUTPUT_TOKENS, _GROQ_IMPROVED_MAX_OUTPUT_TOKENS, _GROQ_REPAIR_MAX_OUTPUT_TOKENS
from app.services.writing_checker_part_02 import _criterion_schema
from app.services.writing_checker_part_04 import _clean_text

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
