from __future__ import annotations

from types import SimpleNamespace
import pytest
from app.models.enums import AiProvider, AiUseCase, WritingTaskType
from app.services.ai_config import ResolvedAiUseCaseConfig
from app.services.writing_checker import (
    _AnnotationPayload,
    _CriterionPayload,
    _GraderPayload,
    _ScoreBoosterPayload,
    _augment_vocabulary_suggestions,
    _build_grading_prompt,
    _build_system_instruction,
    _build_payload,
    _call_annotation_recovery,
    _call_grader,
    _dedupe_annotations,
    _normalize_score_boosters,
    _skip_groq_aux_call,
    _validate_annotations,
)
from app.services.writing_blueprint import BLUEPRINT_BENCHMARK_CARDS, round_criterion_band, select_benchmark_cards
from app.services.writing_config import DEFAULT_PROMPT_ENTRIES

__all__ = [name for name in globals() if not name.startswith('__')]
