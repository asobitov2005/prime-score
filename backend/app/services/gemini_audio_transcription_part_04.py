from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.gemini_audio_transcription_dependencies import *
from app.services.gemini_audio_transcription_part_01 import ListeningTranscriptQuestion, _build_gemini_client, _build_transcript_prompt, _download_audio_bytes, _guess_audio_content_type, _optimize_audio_file_for_transcription, _parse_json_object_from_model_response, _response_schema
from app.services.gemini_audio_transcription_part_02 import _build_segment_sources, _fit_segments_to_audio_duration, _normalize_existing_segments, _normalize_segment_rows, _probe_audio_duration_seconds, _segments_cover_audio_reasonably
from app.services.gemini_audio_transcription_part_03 import _heuristic_question_locations, _normalize_question_locations

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
