from __future__ import annotations

import base64
import asyncio
import json
import re
import struct
import sys
from array import array
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from google.genai import types
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.security import decode_token
from app.db.session import get_db_session
from app.db.session import get_session_maker
from app.models.enums import AiProvider, AiUseCase
from app.models.speaking import (
    SpeakingAudioAsset,
    SpeakingEvaluation,
    SpeakingEvent,
    SpeakingSession,
    SpeakingSessionPart,
    SpeakingTest,
    SpeakingTopic,
    SpeakingTurn,
)
from app.schemas.common import DebugPrincipal
from app.schemas.speaking import (
    SpeakingAudioAssetRead,
    SpeakingDiarizedTranscriptItem,
    SpeakingEvaluationRead,
    SpeakingHistoryItem,
    SpeakingHistoryResponse,
    SpeakingSessionCreateRequest,
    SpeakingSessionCreateResponse,
    SpeakingSessionResultResponse,
    SpeakingStructuredFeedbackRead,
    SpeakingTestListItem,
    SpeakingTestListResponse,
    SpeakingTopicListItem,
    SpeakingTopicListResponse,
)
from app.services.ai_generation import generate_text_sync
from app.services.ai_config import build_google_client, resolve_ai_use_case_config
from app.services.speaking_roast_prompt import (
    ROAST_SPEECH_CONFIG,
    UZBEK_ROAST_MODE_INSTRUCTION,
    UZBEK_ROAST_ROAST_BASE_INSTRUCTION,
)


router = APIRouter()

SPEAKING_MODES = {"strict_exam", "free_talk", "uzbek_roast"}
SPEAKING_MODE_ALIASES = {
    "practice": "free_talk",
    "strict_roast": "uzbek_roast",
}
LIVE_INPUT_RATE = 16_000
LIVE_OUTPUT_RATE = 24_000
PCM_SAMPLE_WIDTH_BYTES = 2
PART_1_PLANNED_QUESTIONS = 8
PART_1_PREAMBLE_TURNS = 3


def _entry_mode_parts(entry_mode: str) -> list[int]:
    if entry_mode == "full":
        return [1, 2, 3]
    return [int(entry_mode.rsplit("_", 1)[1])]


def _resolve_planned_question_count(entry_mode: str, part: int) -> int | None:
    if entry_mode == "part_1" or (entry_mode == "full" and part == 1):
        return PART_1_PLANNED_QUESTIONS
    return None


def _is_part1_closing_message(text: str) -> bool:
    normalized = text.strip()
    if not normalized:
        return False
    return bool(
        re.search(
            r"part\s*1.{0,48}(complete|finished|conclud|over|done|end)|that'?s (the )?end of part\s*1|end of part\s*1|this concludes part\s*1|we'?ve finished part\s*1|no more questions.{0,24}part\s*1",
            normalized,
            re.I,
        )
    )


def _count_part1_questions_answered(transcript_fragments: list[dict[str, Any]]) -> int:
    examiner_questions = 0
    for fragment in transcript_fragments:
        role = str(fragment.get("role") or "").strip().lower()
        if role not in {"examiner", "assistant", "ai"}:
            continue
        text = str(fragment.get("text") or "").strip()
        if "?" not in text or _is_part1_closing_message(text):
            continue
        examiner_questions += 1
    return max(0, examiner_questions - PART_1_PREAMBLE_TURNS)


def _serialize_test(row: object) -> SpeakingTestListItem:
    return SpeakingTestListItem(
        id=row.id,
        title=row.title,
        slug=row.slug,
        status=row.status,
        access_type=row.access_type,
        mode_kind=row.mode_kind,
        source=getattr(row, "source", None),
        source_detail=getattr(row, "source_detail", None),
        description=getattr(row, "description", None),
        estimated_minutes=int(getattr(row, "estimated_minutes", 14) or 14),
        version=int(getattr(row, "version", 1) or 1),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _part1_fallback_questions(topic_title: str, prompt_text: str) -> list[str]:
    subject = topic_title.strip().rstrip(".")
    if not subject:
        subject = prompt_text.strip().rstrip(".")
    if not subject:
        return []

    lowered = subject.lower()
    return [
        f"Do you enjoy talking about {lowered}?",
        f"How important is {lowered} in your daily life?",
        f"Has your view of {lowered} changed over time?",
        f"Would you like to learn more about {lowered}?",
    ]


def _extract_sample_questions(row: SpeakingTopic) -> list[str]:
    metadata = dict(row.topic_metadata or {})
    question_items = metadata.get("question_items")
    if isinstance(question_items, list):
        questions = [str(item).strip() for item in question_items if str(item).strip()]
        if questions:
            return questions[:6]

    prompt_text = str(row.prompt_text or "").strip()
    bullet_points = [str(item).strip() for item in (row.bullet_points or []) if str(item).strip()]
    topic_title = str(row.topic_title or "").strip()

    if row.part_number == 2:
        questions: list[str] = []
        if prompt_text:
            questions.append(prompt_text)
        questions.extend(bullet_points)
        return questions[:6]

    if row.part_number == 3:
        questions = []
        if prompt_text:
            questions.append(prompt_text)
        questions.extend(bullet_points)
        return questions[:6]

    if prompt_text:
        split_questions = [part.strip() for part in re.split(r"(?<=[?])\s+", prompt_text) if part.strip()]
        if len(split_questions) > 1:
            return split_questions[:6]

        sentence_questions = [
            part.strip()
            for part in re.split(r"(?<=[?.])\s+", prompt_text)
            if part.strip() and "?" in part
        ]
        if len(sentence_questions) > 1:
            return sentence_questions[:6]

        if "?" in prompt_text:
            return [prompt_text]

        comma_parts = [part.strip() for part in prompt_text.split(",") if part.strip()]
        if len(comma_parts) > 1:
            return [f"Let's talk about {part.lower()}." for part in comma_parts[:6]]

        normalized_prompt = prompt_text.lower()
        normalized_title = topic_title.lower()
        if not normalized_prompt or normalized_prompt == normalized_title or len(prompt_text.split()) <= 4:
            return _part1_fallback_questions(topic_title, prompt_text)

        return [prompt_text]

    if topic_title:
        return _part1_fallback_questions(topic_title, prompt_text)

    return bullet_points[:6]


def _serialize_topic(row: SpeakingTopic) -> SpeakingTopicListItem:
    metadata = dict(row.topic_metadata or {})
    icon = metadata.get("icon") if isinstance(metadata.get("icon"), str) else None
    icon_tone = metadata.get("icon_tone") if isinstance(metadata.get("icon_tone"), str) else None
    is_new_topic = metadata.get("is_new_topic") is True
    return SpeakingTopicListItem(
        id=row.id,
        part_number=row.part_number,
        topic_title=row.topic_title,
        prompt_text=row.prompt_text,
        bullet_points=list(row.bullet_points or []),
        difficulty_label=row.difficulty_label,
        category_tags=list(row.category_tags or []),
        sample_questions=_extract_sample_questions(row),
        icon=icon,
        icon_tone=icon_tone,
        is_new_topic=is_new_topic,
        followup_group_key=row.followup_group_key,
    )


def _default_mode_instruction(mode: str) -> str:
    if mode == "free_talk":
        return (
            "Mode: free talk. This is not an IELTS exam. Have an open, natural conversation about any topic the candidate chooses. "
            "Match the candidate's language when reasonable, keep the flow relaxed, ask curious follow-up questions, and let the topic move naturally. "
            "Do not grade, do not follow IELTS timing, and do not force the conversation back to exam structure unless the candidate asks."
        )
    if mode == "uzbek_roast":
        return (
            UZBEK_ROAST_MODE_INSTRUCTION
        )
    return (
        "Mode: strict exam. Behave like a real IELTS Speaking examiner: professional, calm, human, and lightly encouraging. "
        "Ask one question at a time, do not coach, do not reveal scores, and keep timing/control exam-like."
    )


def _build_topic_policy(selected_topics: list[str], random_topic: bool) -> str:
    if len(selected_topics) > 1:
        joined = "; ".join(selected_topics)
        return (
            f"Selected topics ({len(selected_topics)}): {joined}. "
            "Ask questions across these topics during the session. Rotate naturally between them and do not force every topic in the first minute."
        )
    if len(selected_topics) == 1:
        return f"Selected topic: {selected_topics[0]}. Use this topic and do not switch unless the user asks."
    if random_topic:
        return "No topic was selected. Choose a realistic IELTS topic yourself."
    return "Use a standard IELTS Speaking topic."


def _build_live_system_instruction(
    settings: dict[str, Any],
    *,
    mode: str,
    entry_mode: str,
    part: int,
    topic: str | None = None,
    topics: list[str] | None = None,
    random_topic: bool,
) -> str:
    base = str(settings.get("system_instruction") or "").strip() or (
        "You are the PrimeScore IELTS Speaking examiner. Run a realistic IELTS Speaking interview."
    )
    mode_instructions = dict(settings.get("mode_instructions") or {})
    mode_text = str(mode_instructions.get(mode) or "").strip() or _default_mode_instruction(mode)
    part_instructions = dict(settings.get("part_instructions") or {})
    part_key = f"part_{part}"
    part_text = str(part_instructions.get(part_key) or "").strip()
    selected_topics = [value.strip() for value in (topics or []) if str(value).strip()]
    if not selected_topics and topic:
        selected_topics = [topic.strip()]
    topic_policy = _build_topic_policy(selected_topics, random_topic)
    scope_text = (
        "Session scope: run the complete IELTS Speaking test in order: Part 1, Part 2 cue card with preparation, then Part 3. "
        "Move between parts yourself and clearly announce each part."
        if entry_mode == "full"
        else f"Session scope: run only IELTS Speaking Part {part} and finish naturally when the part is complete."
    )
    part_one_question_plan = ""
    if entry_mode == "part_1" or (entry_mode == "full" and part == 1):
        part_one_question_plan = (
            "Part 1 question plan: after the brief introduction and ID check, ask exactly 8 short questions about the topic, "
            "one question at a time. Do not ask a ninth question. After the candidate answers the 8th question, give one brief "
            "spoken closing such as 'That is the end of Part 1. Thank you.' and stop asking questions."
        )
    part_two_delivery = ""
    if entry_mode == "part_2" or part == 2:
        part_two_delivery = (
            "Part 2 delivery: announce that this is Part 2 and the long turn. "
            "Say 'Here is your topic' immediately before you read the cue card prompt and bullet points aloud. "
            "Then tell the candidate they have one minute to prepare and may make notes. "
            "Do not mention pencil, pen, or paper. "
            "After preparation, invite them to speak for one to two minutes and stop them politely when time is up."
        )
    exam_protocol = (
        "Official IELTS interview protocol: begin every session with one brief procedural instruction before the first identity question, then give a short greeting, introduce yourself as the examiner, "
        "ask the candidate for their full name, and ask to see or confirm identification before the first test question. "
        "Part 1: say that you will ask questions about familiar topics, then ask one question at a time. "
        "Part 2: clearly announce the long turn, give a cue card with one topic plus three or four bullet prompts, say the candidate has one minute to prepare, "
        "then invite them to speak for one to two minutes, stop them politely when time is up, and ask one or two rounding-off questions. "
        "Part 3: ask broader, more abstract follow-up questions linked to the Part 2 topic. "
        "Keep the role examiner-like: no teaching, no scoring, no explanations of the test unless a procedural instruction is needed."
    )
    natural_voice = (
        "Voice and personality: sound like a real person, not a script. Use a warm professional tone with small natural reactions "
        "such as 'Right', 'I see', 'That's interesting', 'Mm-hmm', 'Alright', or 'Thank you' when they fit. "
        "Vary your wording, pace, and follow-ups so the interview feels live. You may show light curiosity or empathy, "
        "but never overpraise, flirt, joke too much, or become casual like a friend. Keep emotional reactions brief and believable."
    )
    turn_style = (
        "Turn style: keep most examiner turns to one or two short sentences. After an answer, acknowledge it briefly, then ask the next question. "
        "If the candidate hesitates or gives a very short answer, gently prompt with one natural follow-up like 'Could you tell me a little more about that?' "
        "Do not monologue, do not explain your instructions repeatedly, and do not sound robotic."
    )
    if mode == "free_talk":
        return "\n".join(
            item
            for item in (
                base,
                mode_text,
                topic_policy,
                "Conversation control: keep it like a normal voice chat. Ask one clear question at a time and wait for the candidate.",
                "If the candidate switches topic, follow them. If they are quiet, suggest a few simple topic options.",
                "Keep responses short enough for a live voice interface.",
            )
            if item
        )
    if mode == "uzbek_roast":
        return "\n".join(
            item
            for item in (
                base,
                UZBEK_ROAST_ROAST_BASE_INSTRUCTION,
                mode_text,
                topic_policy,
                "Conversation control: roast first, then one sharp question. Wait for their answer before the next roast.",
                "Keep every spoken turn short, punchy, and live-voice friendly.",
            )
            if item
        )
    return "\n".join(
        item
        for item in (
            base,
            mode_text,
            scope_text,
            exam_protocol,
            natural_voice,
            turn_style,
            part_one_question_plan,
            part_two_delivery,
            f"Current part: IELTS Speaking Part {part}.",
            part_text,
            topic_policy,
            "Conversation control: wait for the candidate answer, then continue with the next examiner prompt.",
            "Use natural examiner wording such as: 'Good morning. My name is Alex. Can you tell me your full name, please?' or 'Alright, let's talk about work and studies.'",
            "Keep responses short enough for a live voice interface.",
        )
        if item
    )


def _merge_transcript(current: str, next_text: str) -> str:
    clean_next = " ".join(str(next_text or "").split())
    if not clean_next:
        return current
    clean_current = " ".join(str(current or "").split())
    if not clean_current:
        return clean_next
    if clean_current.endswith(clean_next) or clean_next in clean_current:
        return clean_current
    return f"{clean_current} {clean_next}".strip()


def _build_full_transcript(candidate_text: str, examiner_text: str) -> str:
    parts = []
    if examiner_text.strip():
        parts.append(f"Examiner:\n{examiner_text.strip()}")
    if candidate_text.strip():
        parts.append(f"Candidate:\n{candidate_text.strip()}")
    return "\n\n".join(parts).strip()


def _parse_audio_sample_rate(mime_type: str | None, fallback: int = LIVE_OUTPUT_RATE) -> int:
    match = re.search(r"rate=(\d+)", str(mime_type or ""), flags=re.IGNORECASE)
    if not match:
        return fallback
    try:
        return int(match.group(1))
    except ValueError:
        return fallback


def _pcm16_duration_ms(byte_length: int, sample_rate: int) -> int:
    if sample_rate <= 0:
        return 0
    return max(0, round((byte_length / PCM_SAMPLE_WIDTH_BYTES / sample_rate) * 1000))


def _pcm16_to_wav(pcm_bytes: bytes, sample_rate: int) -> bytes:
    channels = 1
    bits_per_sample = 16
    byte_rate = sample_rate * channels * PCM_SAMPLE_WIDTH_BYTES
    block_align = channels * PCM_SAMPLE_WIDTH_BYTES
    data_size = len(pcm_bytes)
    header = b"".join(
        (
            b"RIFF",
            struct.pack("<I", 36 + data_size),
            b"WAVE",
            b"fmt ",
            struct.pack("<IHHIIHH", 16, 1, channels, sample_rate, byte_rate, block_align, bits_per_sample),
            b"data",
            struct.pack("<I", data_size),
        )
    )
    return header + pcm_bytes


def _resample_pcm16_mono(pcm_bytes: bytes, source_rate: int, target_rate: int) -> bytes:
    if source_rate <= 0 or target_rate <= 0 or source_rate == target_rate:
        return pcm_bytes
    byte_length = len(pcm_bytes) - (len(pcm_bytes) % PCM_SAMPLE_WIDTH_BYTES)
    if byte_length <= PCM_SAMPLE_WIDTH_BYTES:
        return pcm_bytes[:byte_length]
    samples = array("h")
    samples.frombytes(pcm_bytes[:byte_length])
    if sys.byteorder != "little":
        samples.byteswap()
    output_count = max(1, round(len(samples) * target_rate / source_rate))
    ratio = source_rate / target_rate
    output = array("h")
    for index in range(output_count):
        source_position = index * ratio
        left_index = min(len(samples) - 1, int(source_position))
        right_index = min(len(samples) - 1, left_index + 1)
        fraction = source_position - left_index
        sample = samples[left_index] + (samples[right_index] - samples[left_index]) * fraction
        output.append(max(-32768, min(32767, round(sample))))
    if sys.byteorder != "little":
        output.byteswap()
    return output.tobytes()


def _combine_pcm16_segments(segments: list[tuple[bytes, int]], target_rate: int) -> list[bytes]:
    chunks: list[bytes] = []
    for pcm_bytes, sample_rate in segments:
        if not pcm_bytes:
            continue
        if sample_rate > 0 and sample_rate != target_rate:
            pcm_bytes = _resample_pcm16_mono(pcm_bytes, sample_rate, target_rate)
        chunks.append(pcm_bytes)
    return chunks


def _normalize_feedback_items(value: Any, category: str) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []
    items: list[dict[str, str]] = []
    for raw_item in value:
        if isinstance(raw_item, dict):
            issue = str(raw_item.get("issue") or raw_item.get("text") or raw_item.get("problem") or "").strip()
            if not issue:
                continue
            items.append(
                {
                    "category": str(raw_item.get("category") or category).strip() or category,
                    "issue": issue,
                    "why_it_matters": str(raw_item.get("why_it_matters") or raw_item.get("why") or "").strip(),
                    "example": str(raw_item.get("example") or raw_item.get("example_from_transcript") or "").strip(),
                    "fix": str(raw_item.get("fix") or raw_item.get("suggested_fix") or "").strip(),
                    "practice": str(raw_item.get("practice") or raw_item.get("practice_drill") or "").strip(),
                }
            )
        else:
            issue = str(raw_item).strip()
            if issue:
                items.append(
                    {
                        "category": category,
                        "issue": issue,
                        "why_it_matters": "",
                        "example": "",
                        "fix": "",
                        "practice": "",
                    }
                )
    return items


def _build_structured_feedback(payload: dict[str, Any]) -> dict[str, Any]:
    criteria_feedback_raw = payload.get("criteria_feedback")
    criteria_feedback = criteria_feedback_raw if isinstance(criteria_feedback_raw, dict) else {}
    error_feedback = _normalize_feedback_items(payload.get("error_feedback"), "General")
    if not error_feedback:
        error_feedback = [
            *_normalize_feedback_items(payload.get("critical_issues"), "Critical"),
            *_normalize_feedback_items(payload.get("pronunciation_issues"), "Pronunciation"),
            *_normalize_feedback_items(payload.get("grammar_issues"), "Grammar"),
            *_normalize_feedback_items(payload.get("lexical_issues"), "Lexical resource"),
        ]
    return {
        "criteria_feedback": criteria_feedback,
        "error_feedback": error_feedback,
        "strengths": _string_list(payload.get("strengths")),
        "improvement_actions": _string_list(payload.get("improvement_actions")),
    }


def _safe_band(value: Any) -> float | None:
    try:
        number = round(float(value) * 2) / 2
    except (TypeError, ValueError):
        return None
    return min(9.0, max(0.0, number))


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _extract_json_object(text: str) -> dict[str, Any]:
    try:
        payload = json.loads(text)
        return payload if isinstance(payload, dict) else {}
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                payload = json.loads(text[start : end + 1])
                return payload if isinstance(payload, dict) else {}
            except json.JSONDecodeError:
                return {}
    return {}


def _serialize_evaluation(row: SpeakingEvaluation | None) -> SpeakingEvaluationRead | None:
    if row is None:
        return None
    return SpeakingEvaluationRead(
        overall_band=row.overall_band,
        fluency_band=row.fluency_band,
        lexical_band=row.lexical_band,
        grammar_band=row.grammar_band,
        pronunciation_band=row.pronunciation_band,
        summary_feedback=row.summary_feedback or "",
        strengths=_string_list(row.strengths),
        critical_issues=_string_list(row.critical_issues),
        pronunciation_issues=_string_list(row.pronunciation_issues),
        grammar_issues=_string_list(row.grammar_issues),
        lexical_issues=_string_list(row.lexical_issues),
        improvement_actions=_string_list(row.improvement_actions),
        deep_feedback_markdown=row.deep_feedback_markdown or "",
        evaluator_model=row.evaluator_model,
        rubric_version=row.rubric_version,
    )


def _serialize_audio_asset(row: SpeakingAudioAsset) -> SpeakingAudioAssetRead:
    return SpeakingAudioAssetRead(
        id=row.id,
        speaker_role=row.speaker_role,
        storage_path=row.storage_path,
        mime_type=row.mime_type,
        duration_ms=row.duration_ms,
        channel_kind=row.channel_kind,
        metadata=dict(row.asset_metadata or {}),
    )


def _select_result_audio_assets(rows: list[SpeakingAudioAsset]) -> list[SpeakingAudioAsset]:
    if not rows:
        return []
    for channel_kind in ("session_audio", "candidate_input", "full_mix"):
        selected = next((row for row in rows if row.channel_kind == channel_kind), None)
        if selected is not None:
            return [selected]
    return [rows[0]]


def _serialize_diarized_transcript(value: Any) -> list[SpeakingDiarizedTranscriptItem]:
    if not isinstance(value, list):
        return []
    items: list[SpeakingDiarizedTranscriptItem] = []
    for raw_item in value:
        if not isinstance(raw_item, dict):
            continue
        text = str(raw_item.get("text") or "").strip()
        role = str(raw_item.get("role") or "").strip()
        if not text or not role:
            continue
        offset_raw = raw_item.get("offset_ms")
        try:
            offset_ms = int(offset_raw) if offset_raw is not None else None
        except (TypeError, ValueError):
            offset_ms = None
        items.append(
            SpeakingDiarizedTranscriptItem(
                role=role,
                text=text,
                at=str(raw_item.get("at") or "") or None,
                offset_ms=offset_ms,
            )
        )
    return items


def _serialize_structured_feedback(value: Any) -> SpeakingStructuredFeedbackRead:
    payload = value if isinstance(value, dict) else {}
    return SpeakingStructuredFeedbackRead(
        criteria_feedback=payload.get("criteria_feedback") if isinstance(payload.get("criteria_feedback"), dict) else {},
        error_feedback=payload.get("error_feedback") if isinstance(payload.get("error_feedback"), list) else [],
        strengths=_string_list(payload.get("strengths")),
        improvement_actions=_string_list(payload.get("improvement_actions")),
    )


async def _grade_speaking_session(
    db: AsyncSession,
    *,
    speaking_session: SpeakingSession,
    transcript: str,
) -> SpeakingEvaluation | None:
    if not transcript.strip():
        return None
    existing = await db.scalar(
        select(SpeakingEvaluation).where(SpeakingEvaluation.speaking_session_id == speaking_session.id)
    )
    if existing is not None:
        return existing

    grader_config = await resolve_ai_use_case_config(db, AiUseCase.SPEAKING_GRADER)
    settings = grader_config.settings_json or {}
    system_prompt = str(settings.get("system_prompt") or "You are a strict IELTS Speaking examiner. Return valid JSON.")
    prompt_template = str(
        settings.get("user_prompt_template")
        or (
            "Evaluate this IELTS Speaking session transcript. Return overall_band, fluency_band, "
            "lexical_band, grammar_band, pronunciation_band, summary_feedback, strengths, critical_issues, "
            "pronunciation_issues, grammar_issues, lexical_issues, improvement_actions, deep_feedback_markdown, "
            "criteria_feedback, and error_feedback. criteria_feedback must contain fluency, lexical, grammar, "
            "and pronunciation objects with feedback and next_step. error_feedback must be an array where each "
            "item has category, issue, why_it_matters, example_from_transcript, suggested_fix, and practice_drill. "
            "Be specific to the candidate's transcript.\n\n{transcript}"
        )
    )
    prompt = prompt_template.replace("{transcript}", transcript)
    max_output_tokens = int((settings.get("cost_controls") or {}).get("max_output_tokens") or 1800)
    text = await asyncio.to_thread(
        generate_text_sync,
        config=grader_config,
        prompt=prompt,
        system_instruction=system_prompt,
        temperature=0,
        max_output_tokens=max_output_tokens,
        response_mime_type="application/json",
        operation="speaking_grading",
    )
    payload = _extract_json_object(text)
    metadata = dict(speaking_session.session_metadata or {})
    metadata["structured_feedback"] = _build_structured_feedback(payload)
    speaking_session.session_metadata = metadata
    evaluation = SpeakingEvaluation(
        speaking_session_id=speaking_session.id,
        overall_band=_safe_band(payload.get("overall_band")),
        fluency_band=_safe_band(payload.get("fluency_band")),
        lexical_band=_safe_band(payload.get("lexical_band")),
        grammar_band=_safe_band(payload.get("grammar_band")),
        pronunciation_band=_safe_band(payload.get("pronunciation_band")),
        summary_feedback=str(payload.get("summary_feedback") or "").strip(),
        strengths=_string_list(payload.get("strengths")),
        critical_issues=_string_list(payload.get("critical_issues")),
        pronunciation_issues=_string_list(payload.get("pronunciation_issues")),
        grammar_issues=_string_list(payload.get("grammar_issues")),
        lexical_issues=_string_list(payload.get("lexical_issues")),
        improvement_actions=_string_list(payload.get("improvement_actions")),
        deep_feedback_markdown=str(payload.get("deep_feedback_markdown") or "").strip(),
        evaluator_model=grader_config.model_id,
        rubric_version=str(settings.get("rubric_version") or "ielts-speaking-v1"),
    )
    db.add(evaluation)
    await db.flush()
    return evaluation


def _live_config(settings: dict[str, Any], system_instruction: str, *, mode: str = "strict_exam") -> dict[str, Any]:
    modalities = settings.get("response_modalities")
    if not isinstance(modalities, list) or not modalities:
        modalities = ["AUDIO"]
    payload: dict[str, Any] = {
        "response_modalities": modalities,
        "system_instruction": system_instruction,
        "output_audio_transcription": {},
        "input_audio_transcription": {},
        # The client drives turn boundaries explicitly via activity_start/activity_end
        # signals. Disable server-side automatic VAD so the two detectors do not fight
        # each other (double turn-ends, premature cut-offs, missed barge-in).
        "realtime_input_config": {
            "automatic_activity_detection": {"disabled": True},
        },
        # Without compression a live audio session hits a hard duration limit and Gemini
        # sends GoAway, then force-closes with 1008. Sliding-window context compression
        # lets a full IELTS interview run past that limit instead of being cut off.
        "context_window_compression": {"sliding_window": {}},
        # Issue resumption handles so a dropped session can be reconnected/continued.
        "session_resumption": {},
    }
    speech_config = settings.get("speech_config")
    if isinstance(speech_config, dict) and speech_config:
        payload["speech_config"] = speech_config
    elif mode == "uzbek_roast":
        payload["speech_config"] = ROAST_SPEECH_CONFIG
    return payload


async def _persist_speaking_audio_asset(
    db: AsyncSession,
    *,
    session_id: UUID,
    speaker_role: str,
    channel_kind: str,
    pcm_chunks: list[bytes],
    sample_rate: int,
    source_mime_type: str,
) -> SpeakingAudioAsset | None:
    if not pcm_chunks:
        return None
    pcm_bytes = b"".join(pcm_chunks)
    if not pcm_bytes:
        return None
    wav_bytes = _pcm16_to_wav(pcm_bytes, sample_rate)
    duration_ms = _pcm16_duration_ms(len(pcm_bytes), sample_rate)
    storage_path = await asyncio.to_thread(
        upload_speaking_audio_asset,
        content=wav_bytes,
        filename=f"{speaker_role}.wav",
        content_type="audio/wav",
        session_id=str(session_id),
        speaker_role=speaker_role,
    )
    audio_asset = SpeakingAudioAsset(
        speaking_session_id=session_id,
        speaker_role=speaker_role,
        storage_path=storage_path,
        mime_type="audio/wav",
        duration_ms=duration_ms,
        channel_kind=channel_kind,
        asset_metadata={
            "sample_rate": sample_rate,
            "source_mime_type": source_mime_type,
            "source_encoding": "pcm_s16le",
            "byte_length": len(pcm_bytes),
        },
    )
    db.add(audio_asset)
    await db.flush()
    return audio_asset


async def _websocket_user_id(websocket: WebSocket) -> UUID:
    token = websocket.query_params.get("token")
    debug_user_id = websocket.query_params.get("debug_user_id")
    if token:
        try:
            payload = decode_token(token)
            if payload.get("scope") == "admin":
                raise ValueError("admin token")
            return UUID(str(payload["sub"]))
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid websocket token.") from exc
    if debug_user_id:
        try:
            return UUID(debug_user_id)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid debug user id.") from exc
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required.")


@router.get("/tests", response_model=SpeakingTestListResponse)
async def list_published_speaking_tests(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> SpeakingTestListResponse:
    _ = current_user
    statement = select(SpeakingTest).where(SpeakingTest.status == "published").order_by(SpeakingTest.created_at.desc())
    total = await session.scalar(select(func.count()).select_from(SpeakingTest).where(SpeakingTest.status == "published")) or 0
    rows = (await session.scalars(statement)).all()
    return SpeakingTestListResponse(items=[_serialize_test(row) for row in rows], total=int(total))


@router.get("/topics", response_model=SpeakingTopicListResponse)
async def list_speaking_topics(
    part_number: int | None = None,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> SpeakingTopicListResponse:
    _ = current_user
    statement = select(SpeakingTopic).where(SpeakingTopic.active.is_(True)).order_by(
        SpeakingTopic.seed_rank.asc(),
        SpeakingTopic.created_at.desc(),
    )
    count_statement = select(func.count()).select_from(SpeakingTopic).where(SpeakingTopic.active.is_(True))
    if part_number is not None:
        statement = statement.where(SpeakingTopic.part_number == part_number)
        count_statement = count_statement.where(SpeakingTopic.part_number == part_number)
    rows = (await session.scalars(statement.limit(80))).all()
    total = await session.scalar(count_statement) or 0
    return SpeakingTopicListResponse(items=[_serialize_topic(row) for row in rows], total=int(total))


@router.post("/sessions", response_model=SpeakingSessionCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_speaking_session(
    payload: SpeakingSessionCreateRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> SpeakingSessionCreateResponse:
    test = await session.get(SpeakingTest, payload.speaking_test_id)
    if test is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Speaking test not found.")

    try:
        examiner_config = await resolve_ai_use_case_config(session, AiUseCase.SPEAKING_EXAMINER)
        grader_config = await resolve_ai_use_case_config(session, AiUseCase.SPEAKING_GRADER)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    examiner_metadata = {
        "ai_use_case": AiUseCase.SPEAKING_EXAMINER.value,
        "provider": examiner_config.provider.value,
        "model": examiner_config.model_id,
        "provider_config_id": str(examiner_config.provider_config_id) if examiner_config.provider_config_id else None,
        "provider_model_id": str(examiner_config.model_record_id) if examiner_config.model_record_id else None,
        "provider_label": examiner_config.provider_label,
        "resolved_source": examiner_config.source,
    }
    grader_metadata = {
        "ai_use_case": AiUseCase.SPEAKING_GRADER.value,
        "provider": grader_config.provider.value,
        "model": grader_config.model_id,
        "provider_config_id": str(grader_config.provider_config_id) if grader_config.provider_config_id else None,
        "provider_model_id": str(grader_config.model_record_id) if grader_config.model_record_id else None,
        "provider_label": grader_config.provider_label,
        "resolved_source": grader_config.source,
    }
    speaking_session = SpeakingSession(
        user_id=current_user.id,
        speaking_test_id=payload.speaking_test_id,
        status="ready",
        entry_mode=payload.entry_mode,
        current_part=None if payload.entry_mode == "full" else int(payload.entry_mode.rsplit("_", 1)[1]),
        live_provider=examiner_config.provider.value,
        live_model_code=examiner_config.model_id,
        session_metadata={
            "examiner": examiner_metadata,
            "grader": grader_metadata,
        },
    )
    session.add(speaking_session)
    await session.flush()
    for part_number in _entry_mode_parts(payload.entry_mode):
        session.add(
            SpeakingSessionPart(
                speaking_session_id=speaking_session.id,
                part_number=part_number,
                status="queued",
                part_metadata={
                    "examiner": examiner_metadata,
                    "grader": grader_metadata,
                    "examiner_role": "ai_examiner",
                    "entry_mode": payload.entry_mode,
                },
            )
        )
    await session.commit()
    await session.refresh(speaking_session)
    return SpeakingSessionCreateResponse(
        session_id=speaking_session.id,
        speaking_test_id=speaking_session.speaking_test_id,
        entry_mode=speaking_session.entry_mode,
        status=speaking_session.status,
    )


@router.websocket("/sessions/{session_id}/live")
async def speaking_live_websocket(websocket: WebSocket, session_id: UUID) -> None:
    await websocket.accept()
    try:
        user_id = await _websocket_user_id(websocket)
    except HTTPException as exc:
        await websocket.send_json({"type": "error", "message": exc.detail})
        await websocket.close(code=1008)
        return

    session_maker = get_session_maker()
    async with session_maker() as db:
        speaking_session = await db.get(SpeakingSession, session_id)
        if speaking_session is None or speaking_session.user_id != user_id:
            await websocket.send_json({"type": "error", "message": "Speaking session not found."})
            await websocket.close(code=1008)
            return
        try:
            examiner_config = await resolve_ai_use_case_config(db, AiUseCase.SPEAKING_EXAMINER)
        except RuntimeError as exc:
            await websocket.send_json({"type": "error", "message": str(exc)})
            await websocket.close(code=1011)
            return
        if examiner_config.provider != AiProvider.GOOGLE:
            await websocket.send_json({"type": "error", "message": "Speaking Live currently requires a Google Live model binding."})
            await websocket.close(code=1011)
            return

    try:
        first = await websocket.receive_json()
    except WebSocketDisconnect:
        return
    except Exception:
        await websocket.send_json({"type": "error", "message": "Expected a start message."})
        await websocket.close(code=1003)
        return

    if first.get("type") != "start":
        await websocket.close(code=1000)
        return

    mode = str(first.get("mode") or "strict_exam")
    mode = SPEAKING_MODE_ALIASES.get(mode, mode)
    if mode not in SPEAKING_MODES:
        mode = "strict_exam"
    entry_mode = str(first.get("entryMode") or "full")
    if entry_mode not in {"full", "part_1", "part_2", "part_3"}:
        entry_mode = "full"
    try:
        part = int(first.get("part") or 1)
    except (TypeError, ValueError):
        part = 1
    part = min(3, max(1, part))
    topic = str(first.get("topic") or "").strip() or None
    topics_raw = first.get("topics")
    if isinstance(topics_raw, list):
        selected_topics = [str(item).strip() for item in topics_raw if str(item).strip()][:3]
    elif topic:
        selected_topics = [topic]
    else:
        selected_topics = []
    random_topic = bool(first.get("randomTopic"))

    async with session_maker() as db:
        speaking_session = await db.get(SpeakingSession, session_id)
        if speaking_session is None or speaking_session.user_id != user_id:
            await websocket.send_json({"type": "error", "message": "Speaking session not found."})
            await websocket.close(code=1008)
            return
        speaking_session.status = "live"
        speaking_session.started_at = speaking_session.started_at or datetime.now(UTC)
        await db.commit()

    system_instruction = _build_live_system_instruction(
        examiner_config.settings_json,
        mode=mode,
        entry_mode=entry_mode,
        part=part,
        topics=selected_topics,
        random_topic=random_topic,
    )
    client = build_google_client(examiner_config)
    config = _live_config(examiner_config.settings_json, system_instruction, mode=mode)

    live_started_at = datetime.now(UTC)
    async with session_maker() as db:
        db.add(
            SpeakingEvent(
                speaking_session_id=session_id,
                event_type="live_started",
                payload={
                    "mode": mode,
                    "entry_mode": entry_mode,
                    "part": part,
                    "topic": selected_topics[0] if len(selected_topics) == 1 else None,
                    "topics": selected_topics,
                    "random_topic": random_topic,
                },
                created_at=live_started_at,
            )
        )
        await db.commit()

    transcript_state = {"candidate": "", "examiner": ""}
    transcript_fragments: list[dict[str, Any]] = []
    session_audio_segments: list[tuple[bytes, int]] = []
    candidate_audio_segments: list[tuple[bytes, int]] = []
    stopped_normally = False
    session_turn_count = 0
    planned_question_count = _resolve_planned_question_count(entry_mode, part)

    def remember_fragment(role: str, text: str) -> None:
        merged = _merge_transcript(transcript_state.get(role, ""), text)
        if merged != transcript_state.get(role, ""):
            fragment_at = datetime.now(UTC)
            transcript_state[role] = merged
            transcript_fragments.append(
                {
                    "role": role,
                    "text": text.strip(),
                    "at": fragment_at.isoformat(),
                    "offset_ms": max(0, round((fragment_at - live_started_at).total_seconds() * 1000)),
                }
            )

    try:
        async with client.aio.live.connect(model=examiner_config.model_id, config=config) as live:
            ready_payload: dict[str, Any] = {
                "type": "ready",
                "mode": mode,
                "part": part,
                "model": examiner_config.model_id,
            }
            if planned_question_count is not None:
                ready_payload["planned_questions"] = planned_question_count
            await websocket.send_json(ready_payload)
            if selected_topics or random_topic:
                topic_label = ", ".join(selected_topics) if selected_topics else "choose a random realistic IELTS topic"
                await live.send_realtime_input(
                    text=(
                        f"Start {'a free conversation' if mode == 'free_talk' else 'a harsh Uzbek roast session' if mode == 'uzbek_roast' else ('IELTS Speaking full test from Part 1' if entry_mode == 'full' else f'IELTS Speaking Part {part}')}. "
                        f"Mode: {mode}. "
                        f"Topic{'s' if len(selected_topics) > 1 else ''}: {topic_label}."
                    )
                )

            user_activity_open = False

            async def receive_browser() -> None:
                nonlocal stopped_normally, user_activity_open
                while True:
                    message = await websocket.receive_json()
                    message_type = message.get("type")
                    if message_type == "begin_audio":
                        if not user_activity_open:
                            await live.send_realtime_input(activity_start=types.ActivityStart())
                            user_activity_open = True
                    elif message_type == "audio":
                        data = base64.b64decode(str(message.get("data") or ""))
                        if data:
                            if not user_activity_open:
                                await live.send_realtime_input(activity_start=types.ActivityStart())
                                user_activity_open = True
                            session_audio_segments.append((data, LIVE_INPUT_RATE))
                            candidate_audio_segments.append((data, LIVE_INPUT_RATE))
                            await live.send_realtime_input(
                                audio=types.Blob(data=data, mime_type=f"audio/pcm;rate={LIVE_INPUT_RATE}")
                            )
                    elif message_type == "end_audio":
                        if user_activity_open:
                            await live.send_realtime_input(activity_end=types.ActivityEnd())
                            user_activity_open = False
                    elif message_type == "text":
                        text = str(message.get("text") or "").strip()
                        if text:
                            await live.send_realtime_input(text=text)
                    elif message_type == "stop":
                        if user_activity_open:
                            await live.send_realtime_input(activity_end=types.ActivityEnd())
                            user_activity_open = False
                        stopped_normally = True
                        break

            async def send_google() -> None:
                nonlocal session_turn_count, stopped_normally
                turn_index = 0
                try:
                    async for response in live.receive():
                        # Gemini warns it is about to end the session (duration limit /
                        # server drain). Acknowledge it and close from our side cleanly;
                        # ignoring it makes Gemini force-close the socket with 1008.
                        go_away = getattr(response, "go_away", None)
                        if go_away is not None:
                            time_left = getattr(go_away, "time_left", None)
                            await websocket.send_json({
                                "type": "session_ending",
                                "reason": "time_limit",
                                "time_left": str(time_left) if time_left is not None else None,
                            })
                            stopped_normally = True
                            break
                        server_content = getattr(response, "server_content", None)
                        if not server_content:
                            continue
                        input_transcription = getattr(server_content, "input_transcription", None)
                        if input_transcription and getattr(input_transcription, "text", None):
                            remember_fragment("candidate", input_transcription.text)
                            await websocket.send_json({"type": "input_transcript", "text": input_transcription.text})
                        output_transcription = getattr(server_content, "output_transcription", None)
                        if output_transcription and getattr(output_transcription, "text", None):
                            remember_fragment("examiner", output_transcription.text)
                            await websocket.send_json({"type": "transcript", "text": output_transcription.text})
                        model_turn = getattr(server_content, "model_turn", None)
                        if model_turn and getattr(model_turn, "parts", None):
                            for item in model_turn.parts:
                                inline_data = getattr(item, "inline_data", None)
                                if inline_data and getattr(inline_data, "data", None):
                                    mime_type = getattr(inline_data, "mime_type", "audio/pcm;rate=24000")
                                    audio_payload = bytes(inline_data.data)
                                    session_audio_segments.append((audio_payload, _parse_audio_sample_rate(mime_type, LIVE_OUTPUT_RATE)))
                                    await websocket.send_json({
                                        "type": "audio",
                                        "mimeType": mime_type,
                                        "data": base64.b64encode(audio_payload).decode("ascii"),
                                    })
                        if getattr(server_content, "turn_complete", False):
                            turn_index += 1
                            session_turn_count = turn_index
                            await websocket.send_json({"type": "turn_complete", "turn": turn_index})
                            await websocket.send_json({"type": "your_turn", "turn": turn_index})
                except asyncio.CancelledError:
                    raise
                except Exception as exc:  # noqa: BLE001
                    await websocket.send_json({"type": "error", "message": str(exc)})

            receiver = asyncio.create_task(receive_browser())
            sender = asyncio.create_task(send_google())
            done, pending = await asyncio.wait(
                {receiver, sender},
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()
            for task in done:
                task.result()
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001
        try:
            await websocket.send_json({"type": "error", "message": str(exc)})
        except Exception:  # noqa: BLE001
            pass
    finally:
        async with session_maker() as db:
            speaking_session = await db.get(SpeakingSession, session_id)
            if speaking_session is not None and speaking_session.status == "live":
                now = datetime.now(UTC)
                candidate_text = transcript_state["candidate"].strip()
                examiner_text = transcript_state["examiner"].strip()
                full_transcript = _build_full_transcript(candidate_text, examiner_text)
                metadata = dict(speaking_session.session_metadata or {})
                session_audio_asset: SpeakingAudioAsset | None = None
                candidate_audio_asset: SpeakingAudioAsset | None = None
                try:
                    session_audio_asset = await _persist_speaking_audio_asset(
                        db,
                        session_id=session_id,
                        speaker_role="session",
                        channel_kind="session_audio",
                        pcm_chunks=_combine_pcm16_segments(session_audio_segments, LIVE_INPUT_RATE),
                        sample_rate=LIVE_INPUT_RATE,
                        source_mime_type=f"audio/pcm;rate={LIVE_INPUT_RATE}",
                    )
                    # Candidate-only track so the candidate turn plays back just the
                    # candidate's voice, not the full two-speaker conversation.
                    candidate_audio_asset = await _persist_speaking_audio_asset(
                        db,
                        session_id=session_id,
                        speaker_role="candidate",
                        channel_kind="candidate_input",
                        pcm_chunks=_combine_pcm16_segments(candidate_audio_segments, LIVE_INPUT_RATE),
                        sample_rate=LIVE_INPUT_RATE,
                        source_mime_type=f"audio/pcm;rate={LIVE_INPUT_RATE}",
                    )
                except Exception as exc:  # noqa: BLE001
                    metadata["audio_storage_error"] = str(exc)
                metadata["live_result"] = {
                    "ended_normally": stopped_normally,
                    "ended_at": now.isoformat(),
                    "mode": mode,
                    "entry_mode": entry_mode,
                    "part": part,
                    "topic": topic,
                    "transcript_fragments": transcript_fragments,
                    "turn_count": session_turn_count,
                    "planned_question_count": planned_question_count,
                    "questions_answered": (
                        _count_part1_questions_answered(transcript_fragments)
                        if planned_question_count is not None
                        else sum(1 for fragment in transcript_fragments if str(fragment.get("role") or "").lower() == "candidate")
                    ),
                }
                metadata["transcript"] = {
                    "candidate": candidate_text,
                    "examiner": examiner_text,
                    "full": full_transcript,
                }
                speaking_session.session_metadata = metadata
                speaking_session.ended_at = speaking_session.ended_at or now
                speaking_session.status = "completed"

                existing_turn = await db.scalar(
                    select(SpeakingTurn.id).where(SpeakingTurn.speaking_session_id == session_id).limit(1)
                )
                if existing_turn is None:
                    if examiner_text:
                        db.add(
                            SpeakingTurn(
                                speaking_session_id=session_id,
                                speaker_role="examiner",
                                turn_index=0,
                                text_raw=examiner_text,
                                text_normalized=examiner_text,
                                language_code="en",
                                turn_metadata={"source": "gemini_live_output_transcription"},
                            )
                        )
                    if candidate_text:
                        db.add(
                            SpeakingTurn(
                                speaking_session_id=session_id,
                                speaker_role="candidate",
                                turn_index=1,
                                text_raw=candidate_text,
                                text_normalized=candidate_text,
                                language_code="en",
                                audio_asset_id=(
                                    candidate_audio_asset.id
                                    if candidate_audio_asset is not None
                                    else session_audio_asset.id
                                    if session_audio_asset is not None
                                    else None
                                ),
                                turn_metadata={"source": "gemini_live_input_transcription"},
                            )
                        )

                try:
                    evaluation = await _grade_speaking_session(
                        db,
                        speaking_session=speaking_session,
                        transcript=full_transcript,
                    )
                    if evaluation is not None:
                        speaking_session.graded_at = speaking_session.graded_at or datetime.now(UTC)
                        speaking_session.status = "graded"
                except Exception as exc:  # noqa: BLE001
                    metadata = dict(speaking_session.session_metadata or {})
                    metadata["grading_error"] = str(exc)
                    speaking_session.session_metadata = metadata
                await db.commit()


@router.get("/sessions/history", response_model=SpeakingHistoryResponse)
async def list_speaking_history(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> SpeakingHistoryResponse:
    rows = (
        await session.execute(
            select(SpeakingSession, SpeakingTest, SpeakingEvaluation)
            .join(SpeakingTest, SpeakingTest.id == SpeakingSession.speaking_test_id)
            .outerjoin(SpeakingEvaluation, SpeakingEvaluation.speaking_session_id == SpeakingSession.id)
            .where(SpeakingSession.user_id == current_user.id)
            .order_by(SpeakingSession.created_at.desc())
        )
    ).all()
    items: list[SpeakingHistoryItem] = []
    for speaking_session, test, evaluation in rows:
        time_spent_sec = None
        if speaking_session.started_at and speaking_session.ended_at:
            time_spent_sec = max(0, int((speaking_session.ended_at - speaking_session.started_at).total_seconds()))
        items.append(
            SpeakingHistoryItem(
                session_id=speaking_session.id,
                speaking_test_id=speaking_session.speaking_test_id,
                title=test.title,
                entry_mode=speaking_session.entry_mode,
                status=speaking_session.status,
                source=test.source,
                source_detail=test.source_detail,
                overall_band=evaluation.overall_band if evaluation is not None else None,
                time_spent_sec=time_spent_sec,
                started_at=speaking_session.started_at,
                ended_at=speaking_session.ended_at,
                graded_at=speaking_session.graded_at,
            )
        )
    return SpeakingHistoryResponse(items=items)


@router.get("/sessions/{session_id}/result", response_model=SpeakingSessionResultResponse)
async def get_speaking_session_result(
    session_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> SpeakingSessionResultResponse:
    row = (
        await session.execute(
            select(SpeakingSession, SpeakingTest, SpeakingEvaluation)
            .join(SpeakingTest, SpeakingTest.id == SpeakingSession.speaking_test_id)
            .outerjoin(SpeakingEvaluation, SpeakingEvaluation.speaking_session_id == SpeakingSession.id)
            .where(SpeakingSession.id == session_id, SpeakingSession.user_id == current_user.id)
        )
    ).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Speaking session not found.")

    speaking_session, test, evaluation = row
    session_metadata = speaking_session.session_metadata or {}
    raw_transcript_payload = session_metadata.get("transcript")
    transcript_payload = raw_transcript_payload if isinstance(raw_transcript_payload, dict) else {}
    raw_live_result = session_metadata.get("live_result")
    live_result = raw_live_result if isinstance(raw_live_result, dict) else {}
    planned_question_count = live_result.get("planned_question_count")
    if not isinstance(planned_question_count, int):
        planned_question_count = _resolve_planned_question_count(speaking_session.entry_mode, 1)
    turn_count = live_result.get("turn_count")
    if not isinstance(turn_count, int):
        turn_count = None
    questions_answered = live_result.get("questions_answered")
    if not isinstance(questions_answered, int):
        transcript_fragments = live_result.get("transcript_fragments")
        if isinstance(transcript_fragments, list) and planned_question_count is not None:
            questions_answered = _count_part1_questions_answered(transcript_fragments)
        else:
            questions_answered = None
    audio_assets = (
        await session.scalars(
            select(SpeakingAudioAsset)
            .where(SpeakingAudioAsset.speaking_session_id == session_id)
            .order_by(SpeakingAudioAsset.created_at.asc())
        )
    ).all()
    return SpeakingSessionResultResponse(
        session_id=speaking_session.id,
        speaking_test_id=speaking_session.speaking_test_id,
        title=test.title,
        entry_mode=speaking_session.entry_mode,
        status=speaking_session.status,
        started_at=speaking_session.started_at,
        ended_at=speaking_session.ended_at,
        graded_at=speaking_session.graded_at,
        transcript=str(transcript_payload.get("full") or ""),
        candidate_transcript=str(transcript_payload.get("candidate") or ""),
        examiner_transcript=str(transcript_payload.get("examiner") or ""),
        diarized_transcript=_serialize_diarized_transcript(live_result.get("transcript_fragments")),
        audio_assets=[_serialize_audio_asset(asset) for asset in _select_result_audio_assets(list(audio_assets))],
        structured_feedback=_serialize_structured_feedback(session_metadata.get("structured_feedback")),
        evaluation=_serialize_evaluation(evaluation),
        turn_count=turn_count,
        planned_question_count=planned_question_count,
        questions_answered=questions_answered,
    )


@router.delete("/sessions/{session_id}")
async def delete_speaking_session(
    session_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, bool]:
    speaking_session = await session.scalar(
        select(SpeakingSession).where(SpeakingSession.id == session_id, SpeakingSession.user_id == current_user.id)
    )
    if speaking_session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Speaking session not found.")

    await session.execute(delete(SpeakingEvaluation).where(SpeakingEvaluation.speaking_session_id == session_id))
    await session.execute(delete(SpeakingEvent).where(SpeakingEvent.speaking_session_id == session_id))
    await session.execute(delete(SpeakingTurn).where(SpeakingTurn.speaking_session_id == session_id))
    await session.execute(delete(SpeakingAudioAsset).where(SpeakingAudioAsset.speaking_session_id == session_id))
    await session.execute(delete(SpeakingSessionPart).where(SpeakingSessionPart.speaking_session_id == session_id))
    await session.execute(delete(SpeakingSession).where(SpeakingSession.id == session_id))
    await session.commit()
    return {"ok": True}
