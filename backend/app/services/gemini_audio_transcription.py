from __future__ import annotations

import asyncio
import json
import mimetypes
import os
import re
import tempfile
from dataclasses import dataclass
from typing import Any
from urllib.parse import unquote
from urllib.parse import urlparse

import httpx
from google import genai
from google.genai import types as genai_types

from app.core.config import get_settings
from app.services.object_storage import fetch_storage_object


@dataclass(slots=True)
class ListeningTranscriptQuestion:
    question_id: str | None
    question_label: str
    question_prompt: str
    accepted_answers: list[str]


def _build_gemini_client() -> genai.Client:
    settings = get_settings()
    if not (settings.gemini_api_key or "").strip():
        raise RuntimeError("GEMINI_API_KEY is not configured.")
    return genai.Client(api_key=settings.gemini_api_key)


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
        "Task 1: transcribe the audio into short natural speech segments.\n"
        "Task 2: add integer second timestamps for every segment using start_sec and end_sec.\n"
        "Task 3: build a clean full transcript in transcript.\n"
        "Rules:\n"
        "- Keep segment text faithful to the audio.\n"
        "- Split by spoken sentence or short utterance, not by huge paragraphs.\n"
        "- start_sec and end_sec must be integers in seconds.\n"
        "- end_sec must be >= start_sec.\n"
        "- transcript must be readable plain text.\n"
    )

    section_context = []
    if section_label:
        section_context.append(f"Section label: {section_label}")
    if section_title:
        section_context.append(f"Section title: {section_title}")

    return header + ("\n".join(section_context) + "\n" if section_context else "")


def _response_schema() -> dict[str, Any]:
    return {
        "type": "OBJECT",
        "properties": {
            "transcript": {"type": "STRING"},
            "segments": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "id": {"type": "STRING"},
                        "start_sec": {"type": "INTEGER"},
                        "end_sec": {"type": "INTEGER"},
                        "text": {"type": "STRING"},
                    },
                    "required": ["start_sec", "end_sec", "text"],
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
                        "start_sec": {"type": "INTEGER"},
                        "end_sec": {"type": "INTEGER"},
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
        start_sec = max(0, int(raw_segment.get("start_sec") or 0))
        end_sec = max(start_sec, int(raw_segment.get("end_sec") or start_sec))
        normalized.append(
            {
                "id": str(raw_segment.get("id") or f"segment-{index}"),
                "start_sec": start_sec,
                "end_sec": end_sec,
                "text": text,
            }
        )
    return normalized


def _normalize_text_for_match(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _normalize_existing_segments(raw_segments: object) -> list[dict[str, object]]:
    return _normalize_segment_rows(raw_segments)


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
        start_sec = max(0, int(raw_location.get("start_sec") or 0))
        end_sec = max(start_sec, int(raw_location.get("end_sec") or start_sec))
        normalized.append(
            {
                "question_id": question.question_id,
                "question_label": question.question_label,
                "question_prompt": question.question_prompt,
                "start_sec": start_sec,
                "end_sec": end_sec,
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
    normalized_segments = [
        (segment, _normalize_text_for_match(str(segment.get("text") or "")))
        for segment in segments
    ]

    for question in questions:
        located = None
        for accepted_answer in question.accepted_answers:
            normalized_answer = _normalize_text_for_match(accepted_answer)
            if not normalized_answer:
                continue
            for segment, normalized_segment_text in normalized_segments:
                if normalized_answer in normalized_segment_text:
                    located = {
                        "question_id": question.question_id,
                        "question_label": question.question_label,
                        "question_prompt": question.question_prompt,
                        "start_sec": int(segment.get("start_sec") or 0),
                        "end_sec": int(segment.get("end_sec") or int(segment.get("start_sec") or 0)),
                        "answer_text": accepted_answer.strip(),
                        "correct_answer": " / ".join(answer.strip() for answer in question.accepted_answers if answer.strip()),
                    }
                    break
            if located:
                break

        if located:
            matched.append(located)
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

    settings = get_settings()
    client = _build_gemini_client()
    response = client.models.generate_content(
        model=settings.gemini_model or "gemini-3-flash-preview",
        contents=_build_question_location_prompt(
            transcript=transcript,
            segments=segments,
            questions=remaining_questions,
        ),
        config=genai_types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=_question_locations_response_schema(),
            temperature=0.1,
        ),
    )
    payload = json.loads(response.text or "{}")
    combined_locations = heuristic_matches + _normalize_question_locations(payload.get("question_locations"), remaining_questions)
    return _normalize_question_locations(combined_locations, questions)


def _transcribe_audio_bytes_sync(
    *,
    audio_bytes: bytes,
    audio_filename: str | None,
    audio_content_type: str,
    section_label: str | None,
    section_title: str | None,
    questions: list[ListeningTranscriptQuestion],
) -> dict[str, object]:
    settings = get_settings()
    client = _build_gemini_client()
    suffix = os.path.splitext(audio_filename or "")[1] or mimetypes.guess_extension(audio_content_type) or ".mp3"
    uploaded_file_name: str | None = None
    temp_path: str | None = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        uploaded_file = client.files.upload(
            file=temp_path,
            config=genai_types.UploadFileConfig(
                mime_type=audio_content_type,
                display_name=audio_filename or section_title or section_label or "listening-audio",
            ),
        )
        uploaded_file_name = uploaded_file.name

        response = client.models.generate_content(
            model=settings.gemini_model or "gemini-3-flash-preview",
            contents=[_build_transcript_prompt(section_label=section_label, section_title=section_title), uploaded_file],
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=_response_schema(),
                temperature=0.1,
            ),
        )
        payload = json.loads(response.text or "{}")
        segments = _normalize_segment_rows(payload.get("segments"))
        transcript_text = str(payload.get("transcript") or "").strip()
        if not transcript_text:
            transcript_text = "\n".join(segment["text"] for segment in segments)
        question_locations = _locate_question_locations_sync(
            transcript=transcript_text,
            segments=segments,
            questions=questions,
        )
        return {
            "transcript": transcript_text,
            "transcript_segments": segments,
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
    normalized_existing_segments = _normalize_existing_segments(existing_transcript_segments)
    normalized_existing_transcript = str(existing_transcript or "").strip()
    if normalized_existing_segments and normalized_existing_transcript:
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

    audio_bytes = await _download_audio_bytes(audio_url)
    resolved_content_type = _guess_audio_content_type(audio_content_type, audio_filename, audio_url)
    return await asyncio.to_thread(
        _transcribe_audio_bytes_sync,
        audio_bytes=audio_bytes,
        audio_filename=audio_filename,
        audio_content_type=resolved_content_type,
        section_label=section_label,
        section_title=section_title,
        questions=questions,
    )
