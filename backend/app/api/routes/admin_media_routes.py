from __future__ import annotations

# Generated from the former monolithic admin router. Keep imports centralized
# while domain modules are gradually tightened to explicit dependencies.
# ruff: noqa: F401,F403,F405
from app.api.routes.admin_dependencies import *
from app.api.routes.admin_contracts import *
from app.api.routes.admin_common import *
from app.api.routes.admin_commerce_support import *
from app.api.routes.admin_auth_support import *
from app.api.routes.admin_user_support import *

router = APIRouter()

@router.post("/audio/upload-url", response_model=AdminUploadUrlResponse)
async def create_audio_upload_url(
    payload: AdminUploadUrlRequest, current_admin: AdminPrincipal = Depends(get_current_admin)
) -> AdminUploadUrlResponse:
    _ = (payload, current_admin)
    return AdminUploadUrlResponse(
        upload_url="https://storage.example.invalid/upload/audio",
        public_url="https://storage.example.invalid/audio/example.mp3",
        fields={"filename": payload.filename, "content_type": payload.content_type},
    )

@router.post("/audio/upload", response_model=AdminUploadedAssetResponse)
async def upload_audio_file(
    file: UploadFile = File(...),
    current_admin: AdminPrincipal = Depends(get_current_admin),
) -> AdminUploadedAssetResponse:
    _ = current_admin
    content_type = (file.content_type or "").lower()
    if not content_type.startswith("audio/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only audio files are allowed.")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded audio is empty.")
    if len(payload) > 50 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Audio size must be under 50 MB.")

    try:
        public_url = upload_test_audio_asset(
            content=payload,
            filename=file.filename or "audio-file",
            content_type=file.content_type or "audio/mpeg",
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return AdminUploadedAssetResponse(
        public_url=public_url,
        filename=file.filename or "audio-file",
        content_type=file.content_type or "audio/mpeg",
    )

@router.post("/audio/transcribe", response_model=AdminAudioTranscriptResponse)
async def transcribe_audio_file(
    payload: AdminAudioTranscriptRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
) -> AdminAudioTranscriptResponse:
    _ = current_admin
    if not str(payload.audio_url or "").strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="audio_url is required.")

    try:
        transcript_payload = await asyncio.wait_for(
            transcribe_listening_audio_from_url(
                audio_url=str(payload.audio_url),
                audio_filename=payload.audio_filename,
                audio_content_type=payload.audio_content_type,
                section_label=payload.section_label,
                section_title=payload.section_title,
                existing_transcript=payload.transcript,
                existing_transcript_segments=[segment.model_dump() for segment in payload.transcript_segments],
                questions=[
                    ListeningTranscriptQuestion(
                        question_id=item.question_id,
                        question_label=item.question_label,
                        question_prompt=item.question_prompt,
                        accepted_answers=list(item.accepted_answers),
                    )
                    for item in payload.questions
                ],
            ),
            timeout=150,
        )
    except TimeoutError as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Transcript generation exceeded 150 seconds. Retry once or shorten the audio.",
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Audio file could not be fetched.") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Transcription failed.") from exc

    return AdminAudioTranscriptResponse(**transcript_payload)

async def _run_transcript_job(job_id: str, payload: AdminAudioTranscriptRequest) -> None:
    try:
        mark_transcript_job_running(job_id)
        transcript_payload = await transcribe_listening_audio_from_url(
            audio_url=str(payload.audio_url),
            audio_filename=payload.audio_filename,
            audio_content_type=payload.audio_content_type,
            section_label=payload.section_label,
            section_title=payload.section_title,
            existing_transcript=payload.transcript,
            existing_transcript_segments=[segment.model_dump() for segment in payload.transcript_segments],
            questions=[
                ListeningTranscriptQuestion(
                    question_id=item.question_id,
                    question_label=item.question_label,
                    question_prompt=item.question_prompt,
                    accepted_answers=list(item.accepted_answers),
                )
                for item in payload.questions
            ],
        )
        mark_transcript_job_completed(job_id, transcript_payload)
    except asyncio.CancelledError:
        mark_transcript_job_failed(job_id, "Cancelled by admin.")
        raise
    except Exception as exc:
        logger.exception("Listening transcript job %s failed", job_id)
        mark_transcript_job_failed(job_id, str(exc))

@router.post("/audio/transcribe/jobs", response_model=AdminAudioTranscriptJobCreateResponse, status_code=202)
async def create_transcribe_audio_job(
    payload: AdminAudioTranscriptRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
) -> AdminAudioTranscriptJobCreateResponse:
    _ = current_admin
    if not str(payload.audio_url or "").strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="audio_url is required.")

    job = create_transcript_job()
    task = asyncio.create_task(_run_transcript_job(job.id, payload))
    attach_transcript_job_task(job.id, task)
    return AdminAudioTranscriptJobCreateResponse(job_id=job.id, status=job.status)

@router.get("/audio/transcribe/jobs/{job_id}", response_model=AdminAudioTranscriptJobRead)
async def get_transcribe_audio_job(
    job_id: str,
    current_admin: AdminPrincipal = Depends(get_current_admin),
) -> AdminAudioTranscriptJobRead:
    _ = current_admin
    job = get_transcript_job(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transcript job not found.")
    return AdminAudioTranscriptJobRead(
        job_id=job.id,
        status=job.status,
        created_at=job.created_at,
        updated_at=job.updated_at,
        result=AdminAudioTranscriptResponse(**job.result) if job.result else None,
        error=job.error,
    )

@router.post("/audio/transcribe/jobs/{job_id}/cancel", response_model=AdminAudioTranscriptJobRead)
async def cancel_transcribe_audio_job(
    job_id: str,
    current_admin: AdminPrincipal = Depends(get_current_admin),
) -> AdminAudioTranscriptJobRead:
    _ = current_admin
    job = cancel_transcript_job(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transcript job not found.")
    return AdminAudioTranscriptJobRead(
        job_id=job.id,
        status=job.status,
        created_at=job.created_at,
        updated_at=job.updated_at,
        result=AdminAudioTranscriptResponse(**job.result) if job.result else None,
        error=job.error,
    )

@router.post("/images/upload-url", response_model=AdminUploadUrlResponse)
async def create_image_upload_url(
    payload: AdminUploadUrlRequest, current_admin: AdminPrincipal = Depends(get_current_admin)
) -> AdminUploadUrlResponse:
    _ = (payload, current_admin)
    return AdminUploadUrlResponse(
        upload_url="https://storage.example.invalid/upload/image",
        public_url="https://storage.example.invalid/image/example.png",
        fields={"filename": payload.filename, "content_type": payload.content_type},
    )

@router.post("/images/upload", response_model=AdminUploadedAssetResponse)
async def upload_image_file(
    file: UploadFile = File(...),
    current_admin: AdminPrincipal = Depends(get_current_admin),
) -> AdminUploadedAssetResponse:
    _ = current_admin
    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are allowed.")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded image is empty.")
    if len(payload) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image size must be under 10 MB.")

    try:
        public_url = upload_test_diagram_image(
            content=payload,
            filename=file.filename or "diagram-image",
            content_type=file.content_type or "application/octet-stream",
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return AdminUploadedAssetResponse(
        public_url=public_url,
        filename=file.filename or "diagram-image",
        content_type=file.content_type or "application/octet-stream",
    )
