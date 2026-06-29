from __future__ import annotations

import asyncio
import difflib
import json
import logging
import mimetypes
import os
import re
import subprocess
import tempfile
from dataclasses import dataclass
from typing import Any
from urllib.parse import unquote
from urllib.parse import urlparse

import httpx
from google import genai
from google.genai import types as genai_types

from app.core.config import get_settings
from app.db.session import get_session_maker
from app.models.enums import AiProvider, AiUseCase
from app.services.ai_config import (
    ResolvedAiUseCaseConfig,
    build_google_client,
    resolve_ai_use_case_config,
)
from app.services.object_storage import fetch_storage_object

logger = logging.getLogger(__name__)

LOCATION_STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "of", "for", "to", "in", "on", "at", "by", "with",
    "from", "into", "about", "than", "then", "that", "this", "these", "those", "is", "are",
    "was", "were", "be", "been", "being", "as", "it", "its", "their", "there", "what", "which",
    "who", "whom", "whose", "when", "where", "why", "how", "does", "do", "did", "has", "have",
    "had", "can", "could", "should", "would", "will", "may", "might", "must", "if", "not",
    "your", "you", "each", "following", "correct", "answer", "choose", "statement", "information",
    "questions", "question", "boxes", "sheet", "part", "section", "listening", "reading",
}


@dataclass(slots=True)
class ListeningTranscriptQuestion:
    question_id: str | None
    question_label: str
    question_prompt: str
    accepted_answers: list[str]


@dataclass(slots=True)
class ListeningTranscriptWord:
    word: str
    start_sec: float
    end_sec: float
    normalized: str


def _optimize_audio_file_for_transcription(
    *,
    input_path: str,
    audio_filename: str | None,
    audio_content_type: str,
) -> tuple[str, str]:
    output_suffix = ".mp3"
    with tempfile.NamedTemporaryFile(delete=False, suffix=output_suffix) as optimized_file:
        optimized_path = optimized_file.name

    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                input_path,
                "-ac",
                "1",
                "-ar",
                "16000",
                "-b:a",
                "48k",
                optimized_path,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=120,
        )
        return optimized_path, "audio/mpeg"
    except Exception:
        try:
            os.remove(optimized_path)
        except OSError:
            pass
        return input_path, audio_content_type


def _build_gemini_client(resolved_config: ResolvedAiUseCaseConfig) -> genai.Client:
    if resolved_config.provider != AiProvider.GOOGLE:
        raise RuntimeError("Audio transcription currently requires a Google provider binding.")
    # Use the shared Google client builder so transcription honours Vertex AI
    # (service-account) auth when GOOGLE_GENAI_USE_VERTEXAI is enabled, instead of
    # an AI Studio API key that the project may not have access to.
    return build_google_client(resolved_config)


def _guess_audio_content_type(
    provided_content_type: str | None,
    filename: str | None,
    audio_url: str,
) -> str:
    normalized = str(provided_content_type or "").strip().lower()
    if normalized.startswith("audio/"):
        return normalized

    guessed, _ = mimetypes.guess_type(filename or "")
    if guessed and guessed.startswith("audio/"):
        return guessed

    parsed = urlparse(audio_url)
    guessed_from_url, _ = mimetypes.guess_type(parsed.path)
    if guessed_from_url and guessed_from_url.startswith("audio/"):
        return guessed_from_url

    return "audio/mpeg"


async def _download_audio_bytes(audio_url: str) -> bytes:
    if audio_url.startswith("/api/storage/"):
        path = audio_url.removeprefix("/api/storage/").strip("/")
        bucket_name, _, object_name = path.partition("/")
        if not bucket_name or not object_name:
            raise FileNotFoundError("Invalid storage path.")
        payload, _ = await asyncio.to_thread(
            fetch_storage_object,
            bucket_name=unquote(bucket_name),
            object_name=unquote(object_name),
        )
        return payload

    async with httpx.AsyncClient(timeout=90.0, follow_redirects=True) as client:
        response = await client.get(audio_url)
        response.raise_for_status()
        return response.content


def _build_transcript_prompt(
    *,
    section_label: str | None,
    section_title: str | None,
) -> str:
    header = (
        "You are processing IELTS listening audio for PrimeScore.\n"
        "Return JSON only.\n"
        "Task 1: build a clean full transcript in transcript, with speaker diarization.\n"
        "Task 2: return semantic transcript chunks in segments, each labelled with its speaker.\n"
        "Rules:\n"
        "- Keep transcript faithful to the audio.\n"
        "- Perform speaker diarization: identify each distinct speaker and label them.\n"
        "- Use stable speaker labels reused consistently for the same voice across the whole audio.\n"
        "- Prefer descriptive labels when the role is clear (e.g. Narrator, Man, Woman, Interviewer,\n"
        "  Student, Tutor); otherwise use Speaker A, Speaker B, Speaker C.\n"
        "- Every segment must include the speaker field for who is talking in that chunk.\n"
        "- In the transcript field, prefix each speaker turn with 'Label: ' on its own line.\n"
        "- start_sec and end_sec must be numbers in seconds, keep 1-2 decimal precision.\n"
        "- end_sec must be >= start_sec.\n"
        "- segments must be sequential and reflect the actual spoken order.\n"
        "- each segment should be a short sentence or natural phrase, not a single word.\n"
        "- segment timestamps must cover the full audio from start to finish.\n"
        "- transcript must be readable plain text.\n"
    )

    section_context = []
    if section_label:
        section_context.append(f"Section label: {section_label}")
    if section_title:
        section_context.append(f"Section title: {section_title}")

    return header + ("\n".join(section_context) + "\n" if section_context else "")


def _response_schema() -> dict[str, Any]:
    return _segment_response_schema()


def _segment_response_schema() -> dict[str, Any]:
    return {
        "type": "OBJECT",
        "properties": {
            "transcript": {"type": "STRING"},
            "segments": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "text": {"type": "STRING"},
                        "speaker": {"type": "STRING"},
                        "start_sec": {"type": "NUMBER"},
                        "end_sec": {"type": "NUMBER"},
                    },
                    "required": ["text", "speaker", "start_sec", "end_sec"],
                },
            },
        },
        "required": ["transcript", "segments"],
    }


def _question_locations_response_schema() -> dict[str, Any]:
    return {
        "type": "OBJECT",
        "properties": {
            "question_locations": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "question_id": {"type": "STRING"},
                        "question_label": {"type": "STRING"},
                        "question_prompt": {"type": "STRING"},
                        "start_sec": {"type": "NUMBER"},
                        "end_sec": {"type": "NUMBER"},
                        "answer_text": {"type": "STRING"},
                        "correct_answer": {"type": "STRING"},
                    },
                    "required": [
                        "question_label",
                        "question_prompt",
                        "start_sec",
                        "end_sec",
                        "answer_text",
                        "correct_answer",
                    ],
                },
            },
        },
        "required": ["question_locations"],
    }


def _parse_json_object_from_model_response(response: object) -> dict[str, Any]:
    parsed = getattr(response, "parsed", None)
    if isinstance(parsed, dict):
        return parsed

    raw_text = str(getattr(response, "text", "") or "").strip()
    if not raw_text:
        return {}

    candidates = [raw_text]
    stripped = raw_text.replace("```json", "").replace("```", "").strip()
    if stripped != raw_text:
        candidates.append(stripped)

    first_brace = stripped.find("{")
    last_brace = stripped.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidates.append(stripped[first_brace : last_brace + 1])

    for candidate in candidates:
        try:
            payload = json.loads(candidate)
            if isinstance(payload, dict):
                return payload
        except json.JSONDecodeError:
            continue

    logger.warning("Gemini returned non-parseable JSON payload: %s", raw_text[:1200])
    raise ValueError("Gemini returned malformed transcript JSON.")


def _normalize_segment_rows(raw_segments: object) -> list[dict[str, object]]:
    normalized: list[dict[str, object]] = []
    if not isinstance(raw_segments, list):
        return normalized
    for index, raw_segment in enumerate(raw_segments, start=1):
        if not isinstance(raw_segment, dict):
            continue
        text = str(raw_segment.get("text") or "").strip()
        if not text:
            continue
        start_sec = max(0.0, float(raw_segment.get("start_sec") or 0))
        end_sec = max(start_sec, float(raw_segment.get("end_sec") or start_sec))
        item: dict[str, object] = {
            "id": str(raw_segment.get("id") or f"segment-{index}"),
            "start_sec": round(start_sec, 2),
            "end_sec": round(end_sec, 2),
            "text": text,
        }
        speaker = str(raw_segment.get("speaker") or "").strip()
        if speaker:
            item["speaker"] = speaker
        if raw_segment.get("confidence") is not None:
            item["confidence"] = round(max(0.0, min(1.0, float(raw_segment.get("confidence") or 0))), 4)
        if raw_segment.get("drift_start_sec") is not None:
            item["drift_start_sec"] = round(abs(float(raw_segment.get("drift_start_sec") or 0)), 2)
        if raw_segment.get("drift_end_sec") is not None:
            item["drift_end_sec"] = round(abs(float(raw_segment.get("drift_end_sec") or 0)), 2)
        if raw_segment.get("needs_review") is not None:
            item["needs_review"] = bool(raw_segment.get("needs_review"))
        normalized.append(item)
    return normalized


def _probe_audio_duration_seconds(path: str) -> float | None:
    try:
        proc = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                path,
            ],
            capture_output=True,
            text=True,
            timeout=30,
            check=True,
        )
        value = float((proc.stdout or "").strip() or 0)
        return value if value > 0 else None
    except Exception:
        return None


def _normalize_word_rows(raw_words: object) -> list[ListeningTranscriptWord]:
    normalized: list[ListeningTranscriptWord] = []
    if not isinstance(raw_words, list):
        return normalized
    for raw_word in raw_words:
        if not isinstance(raw_word, dict):
            continue
        word = str(raw_word.get("word") or "").strip()
        if not word:
            continue
        normalized_word = _normalize_text_for_match(word)
        if not normalized_word:
            continue
        start_sec = max(0.0, float(raw_word.get("start_sec") or 0))
        end_sec = max(start_sec, float(raw_word.get("end_sec") or start_sec))
        normalized.append(
            ListeningTranscriptWord(
                word=word,
                start_sec=round(start_sec, 2),
                end_sec=round(end_sec, 2),
                normalized=normalized_word,
            )
        )
    return normalized


def _normalize_text_for_match(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _tokenize_for_match(value: str) -> list[str]:
    return [token for token in re.findall(r"[a-z0-9]+", value.lower()) if token]


def _normalize_existing_segments(raw_segments: object) -> list[dict[str, object]]:
    return _normalize_segment_rows(raw_segments)


def _segments_cover_audio_reasonably(
    *,
    transcript_text: str,
    segments: list[dict[str, object]],
    audio_duration_seconds: float | None,
) -> bool:
    if not transcript_text.strip() or not segments:
        return False

    max_end = max(float(segment.get("end_sec") or 0) for segment in segments)
    if audio_duration_seconds and audio_duration_seconds > 0:
        if max_end < max(30.0, audio_duration_seconds * 0.7):
            return False

    # Guard against obviously truncated timing coverage for long transcripts.
    if len(transcript_text) > 1200 and max_end < 30:
        return False

    return True


def _fit_segments_to_audio_duration(
    segments: list[dict[str, object]],
    *,
    audio_duration_seconds: float | None,
) -> list[dict[str, object]]:
    if not segments or not audio_duration_seconds or audio_duration_seconds <= 0:
        return segments

    max_end = max(float(segment.get("end_sec") or 0) for segment in segments)
    if max_end <= 0:
        return segments

    if audio_duration_seconds * 0.9 <= max_end <= audio_duration_seconds * 1.08:
        return segments

    scale = audio_duration_seconds / max_end
    fitted: list[dict[str, object]] = []
    previous_end = 0.0
    for segment in segments:
        next_segment = dict(segment)
        start_sec = round(max(0.0, float(segment.get("start_sec") or 0) * scale), 2)
        end_sec = round(max(start_sec, float(segment.get("end_sec") or start_sec) * scale), 2)
        start_sec = max(previous_end, start_sec)
        end_sec = min(round(audio_duration_seconds, 2), max(start_sec, end_sec))
        next_segment["start_sec"] = round(start_sec, 2)
        next_segment["end_sec"] = round(end_sec, 2)
        fitted.append(next_segment)
        previous_end = end_sec
    return fitted


def _build_segment_sources(
    *,
    transcript_text: str,
    existing_segments: list[dict[str, object]],
    generated_segments: list[dict[str, object]],
) -> list[dict[str, object]]:
    if existing_segments:
        return existing_segments
    if generated_segments:
        return generated_segments

    parts = [
        part.strip()
        for part in re.split(r"(?<=[.!?])\s+|\n+", transcript_text)
        if part and part.strip()
    ]
    return [
        {
            "id": f"segment-{index}",
            "start_sec": 0.0,
            "end_sec": 0.0,
            "text": part,
        }
        for index, part in enumerate(parts, start=1)
    ]


def _window_similarity(target_tokens: list[str], candidate_tokens: list[str]) -> float:
    if not target_tokens or not candidate_tokens:
        return 0.0
    target_text = " ".join(target_tokens)
    candidate_text = " ".join(candidate_tokens)
    ratio = difflib.SequenceMatcher(None, target_text, candidate_text).ratio()
    target_set = set(target_tokens)
    candidate_set = set(candidate_tokens)
    overlap = len(target_set & candidate_set) / max(1, len(target_set | candidate_set))
    prefix_bonus = 0.05 if target_tokens[0] == candidate_tokens[0] else 0.0
    suffix_bonus = 0.05 if target_tokens[-1] == candidate_tokens[-1] else 0.0
    return (ratio * 0.65) + (overlap * 0.25) + prefix_bonus + suffix_bonus


def _candidate_starts_for_chunk(
    *,
    chunk_tokens: list[str],
    words: list[ListeningTranscriptWord],
    cursor: int,
) -> list[int]:
    anchors = []
    for token in chunk_tokens[:3]:
        if token not in anchors:
            anchors.append(token)

    candidate_indexes: list[int] = []
    seen: set[int] = set()
    for index in range(cursor, len(words)):
        if words[index].normalized in anchors:
            candidate_indexes.append(index)
            seen.add(index)

    upper_bound = min(len(words), cursor + 120)
    for index in range(cursor, upper_bound):
        if index not in seen:
            candidate_indexes.append(index)

    if not candidate_indexes:
        candidate_indexes = list(range(cursor, len(words)))
    return candidate_indexes


def _align_segments_to_words(
    *,
    source_segments: list[dict[str, object]],
    words: list[ListeningTranscriptWord],
) -> list[dict[str, object]]:
    if not source_segments or not words:
        return source_segments

    aligned: list[dict[str, object]] = []
    cursor = 0

    for index, segment in enumerate(source_segments, start=1):
        text = str(segment.get("text") or "").strip()
        if not text:
            continue

        chunk_tokens = _tokenize_for_match(text)
        if not chunk_tokens:
            continue

        if cursor >= len(words):
            last_word = words[-1]
            original_start = float(segment.get("start_sec") or last_word.end_sec)
            original_end = float(segment.get("end_sec") or original_start)
            fallback_start = max(0.0, original_start, last_word.end_sec)
            fallback_end = max(fallback_start, original_end, last_word.end_sec)
            aligned.append(
                {
                    "id": str(segment.get("id") or f"segment-{index}"),
                    "text": text,
                    "start_sec": round(fallback_start, 2),
                    "end_sec": round(fallback_end, 2),
                    "confidence": 0.0,
                    "drift_start_sec": round(abs(fallback_start - original_start), 2),
                    "drift_end_sec": round(abs(fallback_end - original_end), 2),
                    "needs_review": True,
                }
            )
            continue

        target_len = max(1, len(chunk_tokens))
        best_score = -1.0
        best_start = cursor
        best_end = min(len(words) - 1, max(cursor, cursor + target_len - 1))
        candidate_starts = _candidate_starts_for_chunk(chunk_tokens=chunk_tokens, words=words, cursor=cursor)

        expected_start = float(segment.get("start_sec") or 0)
        for start_index in candidate_starts:
            min_window = max(1, target_len - max(2, target_len // 3))
            max_window = min(len(words) - start_index, target_len + max(3, target_len // 2))
            for window_len in range(min_window, max_window + 1):
                end_index = start_index + window_len - 1
                candidate_tokens = [word.normalized for word in words[start_index : end_index + 1]]
                score = _window_similarity(chunk_tokens, candidate_tokens)
                if expected_start > 0:
                    drift_penalty = min(abs(words[start_index].start_sec - expected_start) / 12.0, 0.2)
                    score -= drift_penalty
                if score > best_score:
                    best_score = score
                    best_start = start_index
                    best_end = end_index

        best_start = min(max(best_start, 0), len(words) - 1)
        best_end = min(max(best_end, best_start), len(words) - 1)
        start_sec = words[best_start].start_sec
        end_sec = max(start_sec, words[best_end].end_sec)
        original_start = float(segment.get("start_sec") or 0)
        original_end = float(segment.get("end_sec") or original_start)
        confidence = round(max(0.0, min(0.9999, best_score)), 4)
        drift_start_sec = round(abs(start_sec - original_start), 2)
        drift_end_sec = round(abs(end_sec - original_end), 2)
        aligned.append(
            {
                "id": str(segment.get("id") or f"segment-{index}"),
                "text": text,
                "start_sec": round(start_sec, 2),
                "end_sec": round(end_sec, 2),
                "confidence": confidence,
                "drift_start_sec": drift_start_sec,
                "drift_end_sec": drift_end_sec,
                "needs_review": bool(confidence < 0.72 or drift_start_sec > 1.0 or drift_end_sec > 1.0),
            }
        )
        cursor = min(len(words), max(cursor, best_end + 1))

    return aligned or source_segments


def _normalize_question_locations(
    raw_locations: object,
    questions: list[ListeningTranscriptQuestion],
) -> list[dict[str, object]]:
    normalized: list[dict[str, object]] = []
    raw_by_label: dict[str, dict[str, Any]] = {}
    if isinstance(raw_locations, list):
        for raw_location in raw_locations:
            if not isinstance(raw_location, dict):
                continue
            label = str(raw_location.get("question_label") or "").strip()
            if label:
                raw_by_label[label] = raw_location

    for question in questions:
        raw_location = raw_by_label.get(question.question_label, {})
        start_sec = max(0.0, float(raw_location.get("start_sec") or 0))
        end_sec = max(start_sec, float(raw_location.get("end_sec") or start_sec))
        normalized.append(
            {
                "question_id": question.question_id,
                "question_label": question.question_label,
                "question_prompt": question.question_prompt,
                "start_sec": round(start_sec, 2),
                "end_sec": round(end_sec, 2),
                "answer_text": str(raw_location.get("answer_text") or "").strip(),
                "correct_answer": (
                    str(raw_location.get("correct_answer") or "").strip()
                    or " / ".join(answer.strip() for answer in question.accepted_answers if answer.strip())
                ),
            }
        )
    return normalized


def _build_question_location_prompt(
    *,
    transcript: str,
    segments: list[dict[str, object]],
    questions: list[ListeningTranscriptQuestion],
) -> str:
    segment_lines = [
        f"{segment['start_sec']}-{segment['end_sec']}: {segment['text']}"
        for segment in segments
    ]
    question_lines = []
    for index, question in enumerate(questions, start=1):
        answers = " | ".join(answer.strip() for answer in question.accepted_answers if answer.strip())
        question_lines.append(
            f"{index}. question_id={question.question_id or ''}; "
            f"question_label={question.question_label}; "
            f"question_prompt={question.question_prompt}; "
            f"accepted_answers={answers}"
        )

    return (
        "You are locating IELTS listening answers inside an existing transcript.\n"
        "Return JSON only.\n"
        "For each question, choose the shortest segment span that contains the spoken evidence or answer.\n"
        "Use the provided segment timestamps exactly.\n"
        "If a location is uncertain, choose the closest matching segment. If nothing matches, use start_sec 0 and end_sec 0.\n"
        "answer_text should be the short heard phrase from the transcript.\n"
        "correct_answer should echo the provided accepted answer(s).\n\n"
        f"Transcript:\n{transcript}\n\n"
        f"Segments:\n" + "\n".join(segment_lines) + "\n\n"
        f"Questions:\n" + "\n".join(question_lines)
    )


def _heuristic_question_locations(
    segments: list[dict[str, object]],
    questions: list[ListeningTranscriptQuestion],
) -> tuple[list[dict[str, object]], list[ListeningTranscriptQuestion]]:
    matched: list[dict[str, object]] = []
    remaining: list[ListeningTranscriptQuestion] = []
    cursor = 0
    normalized_segments = [
        {
            "segment": segment,
            "text": _normalize_text_for_match(str(segment.get("text") or "")),
            "tokens": [
                token
                for token in _tokenize_for_match(str(segment.get("text") or ""))
                if token not in LOCATION_STOPWORDS
            ],
        }
        for segment in segments
    ]

    def build_query_tokens(question: ListeningTranscriptQuestion) -> tuple[list[str], list[str]]:
      answer_tokens = [
          token
          for answer in question.accepted_answers
          for token in _tokenize_for_match(answer)
          if len(token) > 1 and token not in LOCATION_STOPWORDS
      ]
      prompt_tokens = [
          token
          for token in _tokenize_for_match(question.question_prompt)
          if len(token) > 2 and token not in LOCATION_STOPWORDS
      ]
      return answer_tokens, prompt_tokens

    def candidate_score(query_answer_tokens: list[str], query_prompt_tokens: list[str], candidate_tokens: list[str]) -> float:
      if not candidate_tokens:
          return 0.0
      candidate_set = set(candidate_tokens)
      answer_set = set(query_answer_tokens)
      prompt_set = set(query_prompt_tokens)
      answer_overlap = len(answer_set & candidate_set) / max(1, len(answer_set)) if answer_set else 0.0
      prompt_overlap = len(prompt_set & candidate_set) / max(1, len(prompt_set)) if prompt_set else 0.0
      answer_ratio = difflib.SequenceMatcher(None, " ".join(query_answer_tokens), " ".join(candidate_tokens)).ratio() if query_answer_tokens else 0.0
      prompt_ratio = difflib.SequenceMatcher(None, " ".join(query_prompt_tokens[:12]), " ".join(candidate_tokens)).ratio() if query_prompt_tokens else 0.0
      return (answer_overlap * 0.45) + (prompt_overlap * 0.3) + (answer_ratio * 0.15) + (prompt_ratio * 0.1)

    ordered_questions = sorted(
        questions,
        key=lambda item: [int(part) if part.isdigit() else part for part in re.findall(r"\d+|[A-Za-z]+", item.question_label or "")],
    )

    for question in ordered_questions:
        answer_tokens, prompt_tokens = build_query_tokens(question)
        best_match: dict[str, object] | None = None
        best_score = 0.0

        for start_index in range(cursor, len(normalized_segments)):
            for width in (1, 2):
                end_index = min(len(normalized_segments) - 1, start_index + width - 1)
                combined_tokens: list[str] = []
                combined_text_parts: list[str] = []
                for item in normalized_segments[start_index : end_index + 1]:
                    combined_tokens.extend(item["tokens"])
                    combined_text_parts.append(str(item["segment"].get("text") or "").strip())
                score = candidate_score(answer_tokens, prompt_tokens, combined_tokens)
                if score > best_score:
                    best_score = score
                    best_match = {
                        "start_index": start_index,
                        "end_index": end_index,
                        "answer_text": " ".join(combined_text_parts).strip(),
                    }

        if best_match and best_score >= 0.18:
            start_item = normalized_segments[int(best_match["start_index"])]
            end_item = normalized_segments[int(best_match["end_index"])]
            matched.append(
                {
                    "question_id": question.question_id,
                    "question_label": question.question_label,
                    "question_prompt": question.question_prompt,
                    "start_sec": float(start_item["segment"].get("start_sec") or 0),
                    "end_sec": float(end_item["segment"].get("end_sec") or float(end_item["segment"].get("start_sec") or 0)),
                    "answer_text": str(best_match["answer_text"] or "").strip(),
                    "correct_answer": " / ".join(answer.strip() for answer in question.accepted_answers if answer.strip()),
                }
            )
            cursor = max(cursor, int(best_match["end_index"]))
        else:
            remaining.append(question)

    return matched, remaining


def _locate_question_locations_sync(
    *,
    transcript: str,
    segments: list[dict[str, object]],
    questions: list[ListeningTranscriptQuestion],
) -> list[dict[str, object]]:
    if not questions:
        return []

    heuristic_matches, remaining_questions = _heuristic_question_locations(segments, questions)
    if not remaining_questions:
        return _normalize_question_locations(heuristic_matches, questions)

    # Keep transcript generation fast: do not issue a second LLM call here.
    # Unmatched questions are returned with empty/zero locations and can still
    # be rendered safely in the UI without blocking the primary transcript flow.
    combined_locations = heuristic_matches + [
        {
            "question_id": question.question_id,
            "question_label": question.question_label,
            "question_prompt": question.question_prompt,
            "start_sec": 0.0,
            "end_sec": 0.0,
            "answer_text": "",
            "correct_answer": " / ".join(answer.strip() for answer in question.accepted_answers if answer.strip()),
        }
        for question in remaining_questions
    ]
    return _normalize_question_locations(combined_locations, questions)


def _transcribe_audio_bytes_sync(
    *,
    resolved_config: ResolvedAiUseCaseConfig,
    audio_bytes: bytes,
    audio_filename: str | None,
    audio_content_type: str,
    section_label: str | None,
    section_title: str | None,
    existing_transcript: str | None,
    existing_transcript_segments: list[dict[str, object]] | None,
    questions: list[ListeningTranscriptQuestion],
) -> dict[str, object]:
    client = _build_gemini_client(resolved_config)
    suffix = os.path.splitext(audio_filename or "")[1] or mimetypes.guess_extension(audio_content_type) or ".mp3"
    uploaded_file_name: str | None = None
    temp_path: str | None = None
    prepared_audio_path: str | None = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        prepared_audio_path, prepared_content_type = _optimize_audio_file_for_transcription(
            input_path=temp_path,
            audio_filename=audio_filename,
            audio_content_type=audio_content_type,
        )
        prepared_audio_duration_seconds = _probe_audio_duration_seconds(prepared_audio_path)

        # Send the audio inline. The Files API is AI Studio only; Vertex AI (used
        # in production via the service account) requires inline bytes or a GCS URI.
        with open(prepared_audio_path, "rb") as audio_fh:
            prepared_audio_bytes = audio_fh.read()
        if len(prepared_audio_bytes) > 19 * 1024 * 1024:
            raise RuntimeError(
                "Audio is too large for inline transcription (>19MB after compression). "
                "Split the section audio into shorter parts and retry."
            )

        response = client.models.generate_content(
            model=resolved_config.model_id,
            contents=[
                genai_types.Content(
                    role="user",
                    parts=[
                        genai_types.Part(
                            text=_build_transcript_prompt(
                                section_label=section_label, section_title=section_title
                            )
                        ),
                        genai_types.Part.from_bytes(
                            data=prepared_audio_bytes, mime_type=prepared_content_type
                        ),
                    ],
                )
            ],
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=_response_schema(),
                temperature=0.1,
            ),
        )
        payload = _parse_json_object_from_model_response(response)
        generated_segments = _fit_segments_to_audio_duration(
            _normalize_segment_rows(payload.get("segments")),
            audio_duration_seconds=prepared_audio_duration_seconds,
        )
        transcript_text = str(payload.get("transcript") or existing_transcript or "").strip()
        if not transcript_text:
            transcript_text = " ".join(str(segment.get("text") or "").strip() for segment in generated_segments).strip()
        source_segments = _build_segment_sources(
            transcript_text=transcript_text,
            existing_segments=_normalize_existing_segments(existing_transcript_segments),
            generated_segments=generated_segments,
        )
        aligned_segments = (
            generated_segments
            if _segments_cover_audio_reasonably(
                transcript_text=transcript_text,
                segments=generated_segments,
                audio_duration_seconds=prepared_audio_duration_seconds,
            )
            else source_segments
        )
        question_locations = _locate_question_locations_sync(
            transcript=transcript_text,
            segments=aligned_segments,
            questions=questions,
        )
        return {
            "transcript": transcript_text,
            "transcript_segments": aligned_segments,
            "transcript_question_locations": question_locations,
        }
    finally:
        if uploaded_file_name:
            try:
                client.files.delete(name=uploaded_file_name)
            except Exception:
                pass
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
        if prepared_audio_path and prepared_audio_path != temp_path and os.path.exists(prepared_audio_path):
            try:
                os.remove(prepared_audio_path)
            except OSError:
                pass


async def transcribe_listening_audio_from_url(
    *,
    audio_url: str,
    audio_filename: str | None,
    audio_content_type: str | None,
    section_label: str | None,
    section_title: str | None,
    existing_transcript: str | None,
    existing_transcript_segments: list[dict[str, object]] | None,
    questions: list[ListeningTranscriptQuestion],
) -> dict[str, object]:
    session_maker = get_session_maker()
    async with session_maker() as session:
        resolved_config = await resolve_ai_use_case_config(session, AiUseCase.AUDIO_TRANSCRIPTION)
    # Pin transcription to the dedicated audio model (gemini-2.5-flash) for reliable
    # speaker diarization, overriding any general-purpose use-case binding.
    transcription_model = (get_settings().gemini_transcription_model or "").strip()
    if transcription_model:
        resolved_config.model_id = transcription_model
    normalized_existing_segments = _normalize_existing_segments(existing_transcript_segments)
    normalized_existing_transcript = str(existing_transcript or "").strip()
    has_calibrated_timing = bool(normalized_existing_segments) and all(
        segment.get("confidence") is not None or segment.get("needs_review") is not None
        for segment in normalized_existing_segments
    )
    audio_bytes = await _download_audio_bytes(audio_url)
    resolved_content_type = _guess_audio_content_type(audio_content_type, audio_filename, audio_url)

    if normalized_existing_segments and normalized_existing_transcript and has_calibrated_timing:
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_filename or "")[1] or ".mp3") as probe_file:
            probe_file.write(audio_bytes)
            probe_path = probe_file.name
        try:
            audio_duration_seconds = _probe_audio_duration_seconds(probe_path)
        finally:
            try:
                os.remove(probe_path)
            except OSError:
                pass

        if _segments_cover_audio_reasonably(
            transcript_text=normalized_existing_transcript,
            segments=normalized_existing_segments,
            audio_duration_seconds=audio_duration_seconds,
        ):
            question_locations = await asyncio.to_thread(
                _locate_question_locations_sync,
                transcript=normalized_existing_transcript,
                segments=normalized_existing_segments,
                questions=questions,
            )
            return {
                "transcript": normalized_existing_transcript,
                "transcript_segments": normalized_existing_segments,
                "transcript_question_locations": question_locations,
            }

    return await asyncio.to_thread(
        _transcribe_audio_bytes_sync,
        resolved_config=resolved_config,
        audio_bytes=audio_bytes,
        audio_filename=audio_filename,
        audio_content_type=resolved_content_type,
        section_label=section_label,
        section_title=section_title,
        existing_transcript=existing_transcript,
        existing_transcript_segments=existing_transcript_segments,
        questions=questions,
    )
