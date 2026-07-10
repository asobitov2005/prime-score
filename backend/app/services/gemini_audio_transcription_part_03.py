from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.gemini_audio_transcription_dependencies import *
from app.services.gemini_audio_transcription_part_01 import LOCATION_STOPWORDS, ListeningTranscriptQuestion, ListeningTranscriptWord
from app.services.gemini_audio_transcription_part_02 import _candidate_starts_for_chunk, _normalize_text_for_match, _tokenize_for_match, _window_similarity

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
        "Questions:\n" + "\n".join(question_lines)
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
