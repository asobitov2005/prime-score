"""Backward-compatible facade for speaking routes and helpers."""

from fastapi import APIRouter

from app.api.routes.speaking_catalog import (
    list_published_speaking_tests,
    list_speaking_topics,
    router as catalog_router,
)
from app.api.routes.speaking_live import (
    router as live_router,
    speaking_live_websocket,
)
from app.api.routes.speaking_results import (
    delete_speaking_session,
    get_speaking_session_result,
    list_speaking_history,
    router as results_router,
)
from app.api.routes.speaking_sessions import (
    create_speaking_session,
    router as sessions_router,
)
from app.services.speaking_audio import (
    LIVE_INPUT_RATE,
    LIVE_OUTPUT_RATE,
    PCM_SAMPLE_WIDTH_BYTES,
    combine_pcm16_segments,
    parse_audio_sample_rate,
    pcm16_duration_ms,
    pcm16_to_wav,
    persist_speaking_audio_asset,
    resample_pcm16_mono,
    select_result_audio_assets,
    serialize_audio_asset,
)
from app.services.speaking_catalog import (
    PART_1_PLANNED_QUESTIONS,
    PART_1_PREAMBLE_TURNS,
    SPEAKING_MODE_ALIASES,
    SPEAKING_MODES,
    count_part1_questions_answered,
    entry_mode_parts,
    extract_sample_questions,
    is_part1_closing_message,
    part1_fallback_questions,
    resolve_planned_question_count,
    serialize_test,
    serialize_topic,
)
from app.services.speaking_feedback import (
    build_structured_feedback,
    extract_json_object,
    grade_speaking_session,
    normalize_feedback_items,
    safe_band,
    serialize_diarized_transcript,
    serialize_evaluation,
    serialize_structured_feedback,
    string_list,
)
from app.services.speaking_live_support import (
    build_full_transcript,
    live_config,
    merge_transcript,
    websocket_user_id,
)
from app.services.speaking_prompt import (
    build_live_system_instruction,
    build_topic_policy,
    default_mode_instruction,
)

router = APIRouter()
router.include_router(catalog_router)
router.include_router(sessions_router)
router.include_router(live_router)
router.include_router(results_router)

# Legacy private aliases retained for tests and internal imports.
_entry_mode_parts = entry_mode_parts
_resolve_planned_question_count = resolve_planned_question_count
_is_part1_closing_message = is_part1_closing_message
_count_part1_questions_answered = count_part1_questions_answered
_serialize_test = serialize_test
_part1_fallback_questions = part1_fallback_questions
_extract_sample_questions = extract_sample_questions
_serialize_topic = serialize_topic
_default_mode_instruction = default_mode_instruction
_build_topic_policy = build_topic_policy
_build_live_system_instruction = build_live_system_instruction
_merge_transcript = merge_transcript
_build_full_transcript = build_full_transcript
_parse_audio_sample_rate = parse_audio_sample_rate
_pcm16_duration_ms = pcm16_duration_ms
_pcm16_to_wav = pcm16_to_wav
_resample_pcm16_mono = resample_pcm16_mono
_combine_pcm16_segments = combine_pcm16_segments
_normalize_feedback_items = normalize_feedback_items
_build_structured_feedback = build_structured_feedback
_safe_band = safe_band
_string_list = string_list
_extract_json_object = extract_json_object
_serialize_evaluation = serialize_evaluation
_serialize_audio_asset = serialize_audio_asset
_select_result_audio_assets = select_result_audio_assets
_serialize_diarized_transcript = serialize_diarized_transcript
_serialize_structured_feedback = serialize_structured_feedback
_grade_speaking_session = grade_speaking_session
_live_config = live_config
_persist_speaking_audio_asset = persist_speaking_audio_asset
_websocket_user_id = websocket_user_id

__all__ = [
    "router",
    "list_published_speaking_tests",
    "list_speaking_topics",
    "create_speaking_session",
    "speaking_live_websocket",
    "list_speaking_history",
    "get_speaking_session_result",
    "delete_speaking_session",
]
