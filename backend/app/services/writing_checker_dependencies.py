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

__all__ = [name for name in globals() if not name.startswith('__')]
