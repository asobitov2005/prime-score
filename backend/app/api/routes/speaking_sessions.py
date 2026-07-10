from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db_session
from app.models.enums import AiUseCase
from app.models.speaking import (
    SpeakingSession,
    SpeakingSessionPart,
    SpeakingTest,
)
from app.schemas.common import DebugPrincipal
from app.schemas.speaking import (
    SpeakingSessionCreateRequest,
    SpeakingSessionCreateResponse,
)
from app.services.ai_config import resolve_ai_use_case_config
from app.services.speaking_catalog import entry_mode_parts

router = APIRouter()


@router.post(
    "/sessions",
    response_model=SpeakingSessionCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_speaking_session(
    payload: SpeakingSessionCreateRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> SpeakingSessionCreateResponse:
    test = await session.get(SpeakingTest, payload.speaking_test_id)
    if test is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Speaking test not found.",
        )

    try:
        examiner_config = await resolve_ai_use_case_config(
            session,
            AiUseCase.SPEAKING_EXAMINER,
        )
        grader_config = await resolve_ai_use_case_config(
            session,
            AiUseCase.SPEAKING_GRADER,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    examiner_metadata = _config_metadata(
        examiner_config,
        AiUseCase.SPEAKING_EXAMINER,
    )
    grader_metadata = _config_metadata(
        grader_config,
        AiUseCase.SPEAKING_GRADER,
    )
    speaking_session = SpeakingSession(
        user_id=current_user.id,
        speaking_test_id=payload.speaking_test_id,
        status="ready",
        entry_mode=payload.entry_mode,
        current_part=(
            None
            if payload.entry_mode == "full"
            else int(payload.entry_mode.rsplit("_", 1)[1])
        ),
        live_provider=examiner_config.provider.value,
        live_model_code=examiner_config.model_id,
        session_metadata={
            "examiner": examiner_metadata,
            "grader": grader_metadata,
        },
    )
    session.add(speaking_session)
    await session.flush()
    for part_number in entry_mode_parts(payload.entry_mode):
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


def _config_metadata(config, use_case: AiUseCase) -> dict[str, str | None]:
    return {
        "ai_use_case": use_case.value,
        "provider": config.provider.value,
        "model": config.model_id,
        "provider_config_id": (
            str(config.provider_config_id)
            if config.provider_config_id
            else None
        ),
        "provider_model_id": (
            str(config.model_record_id) if config.model_record_id else None
        ),
        "provider_label": config.provider_label,
        "resolved_source": config.source,
    }
