from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.gemini_audio_transcription_dependencies import *
from app.services.gemini_audio_transcription_part_01 import ListeningTranscriptWord

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
