from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.gemini_audio_transcription_dependencies import *

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

class ListeningTranscriptQuestion:
    question_id: str | None
    question_label: str
    question_prompt: str
    accepted_answers: list[str]

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
