from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db_session
from app.models.speaking import (
    SpeakingAudioAsset,
    SpeakingEvaluation,
    SpeakingEvent,
    SpeakingSession,
    SpeakingSessionPart,
    SpeakingTest,
    SpeakingTurn,
)
from app.schemas.common import DebugPrincipal
from app.schemas.speaking import (
    SpeakingHistoryItem,
    SpeakingHistoryResponse,
    SpeakingSessionResultResponse,
)
from app.services.speaking_audio import (
    select_result_audio_assets,
    serialize_audio_asset,
)
from app.services.speaking_catalog import (
    count_part1_questions_answered,
    resolve_planned_question_count,
)
from app.services.speaking_feedback import (
    serialize_diarized_transcript,
    serialize_evaluation,
    serialize_structured_feedback,
)

router = APIRouter()


@router.get("/sessions/history", response_model=SpeakingHistoryResponse)
async def list_speaking_history(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> SpeakingHistoryResponse:
    rows = (
        await session.execute(
            select(SpeakingSession, SpeakingTest, SpeakingEvaluation)
            .join(
                SpeakingTest,
                SpeakingTest.id == SpeakingSession.speaking_test_id,
            )
            .outerjoin(
                SpeakingEvaluation,
                SpeakingEvaluation.speaking_session_id == SpeakingSession.id,
            )
            .where(SpeakingSession.user_id == current_user.id)
            .order_by(SpeakingSession.created_at.desc())
        )
    ).all()
    items: list[SpeakingHistoryItem] = []
    for speaking_session, test, evaluation in rows:
        time_spent_sec = None
        if speaking_session.started_at and speaking_session.ended_at:
            time_spent_sec = max(
                0,
                int(
                    (
                        speaking_session.ended_at
                        - speaking_session.started_at
                    ).total_seconds()
                ),
            )
        items.append(
            SpeakingHistoryItem(
                session_id=speaking_session.id,
                speaking_test_id=speaking_session.speaking_test_id,
                title=test.title,
                entry_mode=speaking_session.entry_mode,
                status=speaking_session.status,
                source=test.source,
                source_detail=test.source_detail,
                overall_band=(
                    evaluation.overall_band
                    if evaluation is not None
                    else None
                ),
                time_spent_sec=time_spent_sec,
                started_at=speaking_session.started_at,
                ended_at=speaking_session.ended_at,
                graded_at=speaking_session.graded_at,
            )
        )
    return SpeakingHistoryResponse(items=items)


@router.get(
    "/sessions/{session_id}/result",
    response_model=SpeakingSessionResultResponse,
)
async def get_speaking_session_result(
    session_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> SpeakingSessionResultResponse:
    row = (
        await session.execute(
            select(SpeakingSession, SpeakingTest, SpeakingEvaluation)
            .join(
                SpeakingTest,
                SpeakingTest.id == SpeakingSession.speaking_test_id,
            )
            .outerjoin(
                SpeakingEvaluation,
                SpeakingEvaluation.speaking_session_id == SpeakingSession.id,
            )
            .where(
                SpeakingSession.id == session_id,
                SpeakingSession.user_id == current_user.id,
            )
        )
    ).first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Speaking session not found.",
        )

    speaking_session, test, evaluation = row
    session_metadata = speaking_session.session_metadata or {}
    raw_transcript_payload = session_metadata.get("transcript")
    transcript_payload = (
        raw_transcript_payload
        if isinstance(raw_transcript_payload, dict)
        else {}
    )
    raw_live_result = session_metadata.get("live_result")
    live_result = raw_live_result if isinstance(raw_live_result, dict) else {}
    planned_question_count = live_result.get("planned_question_count")
    if not isinstance(planned_question_count, int):
        planned_question_count = resolve_planned_question_count(
            speaking_session.entry_mode,
            1,
        )
    turn_count = live_result.get("turn_count")
    if not isinstance(turn_count, int):
        turn_count = None
    questions_answered = live_result.get("questions_answered")
    if not isinstance(questions_answered, int):
        transcript_fragments = live_result.get("transcript_fragments")
        if (
            isinstance(transcript_fragments, list)
            and planned_question_count is not None
        ):
            questions_answered = count_part1_questions_answered(
                transcript_fragments
            )
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
        candidate_transcript=str(
            transcript_payload.get("candidate") or ""
        ),
        examiner_transcript=str(
            transcript_payload.get("examiner") or ""
        ),
        diarized_transcript=serialize_diarized_transcript(
            live_result.get("transcript_fragments")
        ),
        audio_assets=[
            serialize_audio_asset(asset)
            for asset in select_result_audio_assets(list(audio_assets))
        ],
        structured_feedback=serialize_structured_feedback(
            session_metadata.get("structured_feedback")
        ),
        evaluation=serialize_evaluation(evaluation),
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
        select(SpeakingSession).where(
            SpeakingSession.id == session_id,
            SpeakingSession.user_id == current_user.id,
        )
    )
    if speaking_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Speaking session not found.",
        )

    related_models = (
        SpeakingEvaluation,
        SpeakingEvent,
        SpeakingTurn,
        SpeakingAudioAsset,
        SpeakingSessionPart,
    )
    for model in related_models:
        await session.execute(
            delete(model).where(model.speaking_session_id == session_id)
        )
    await session.execute(
        delete(SpeakingSession).where(SpeakingSession.id == session_id)
    )
    await session.commit()
    return {"ok": True}
