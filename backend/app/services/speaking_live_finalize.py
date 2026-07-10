from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select

from app.models.speaking import (
    SpeakingAudioAsset,
    SpeakingSession,
    SpeakingTurn,
)
from app.services.speaking_audio import (
    LIVE_INPUT_RATE,
    combine_pcm16_segments,
    persist_speaking_audio_asset,
)
from app.services.speaking_catalog import count_part1_questions_answered
from app.services.speaking_feedback import grade_speaking_session
from app.services.speaking_live_bridge import SpeakingLiveState
from app.services.speaking_live_support import (
    SpeakingLiveStart,
    build_full_transcript,
)


async def finalize_speaking_live_session(
    session_maker: Any,
    *,
    session_id: UUID,
    start: SpeakingLiveStart,
    state: SpeakingLiveState,
) -> None:
    async with session_maker() as db:
        speaking_session = await db.get(SpeakingSession, session_id)
        if speaking_session is None or speaking_session.status != "live":
            return

        now = datetime.now(UTC)
        candidate_text = state.transcript["candidate"].strip()
        examiner_text = state.transcript["examiner"].strip()
        full_transcript = build_full_transcript(
            candidate_text,
            examiner_text,
        )
        metadata = dict(speaking_session.session_metadata or {})
        session_audio_asset: SpeakingAudioAsset | None = None
        candidate_audio_asset: SpeakingAudioAsset | None = None
        try:
            session_audio_asset = await persist_speaking_audio_asset(
                db,
                session_id=session_id,
                speaker_role="session",
                channel_kind="session_audio",
                pcm_chunks=combine_pcm16_segments(
                    state.session_audio_segments,
                    LIVE_INPUT_RATE,
                ),
                sample_rate=LIVE_INPUT_RATE,
                source_mime_type=f"audio/pcm;rate={LIVE_INPUT_RATE}",
            )
            candidate_audio_asset = await persist_speaking_audio_asset(
                db,
                session_id=session_id,
                speaker_role="candidate",
                channel_kind="candidate_input",
                pcm_chunks=combine_pcm16_segments(
                    state.candidate_audio_segments,
                    LIVE_INPUT_RATE,
                ),
                sample_rate=LIVE_INPUT_RATE,
                source_mime_type=f"audio/pcm;rate={LIVE_INPUT_RATE}",
            )
        except Exception as exc:
            metadata["audio_storage_error"] = str(exc)

        metadata["live_result"] = {
            "ended_normally": state.stopped_normally,
            "ended_at": now.isoformat(),
            "mode": start.mode,
            "entry_mode": start.entry_mode,
            "part": start.part,
            "topic": start.topic,
            "transcript_fragments": state.transcript_fragments,
            "turn_count": state.turn_count,
            "planned_question_count": state.planned_question_count,
            "questions_answered": _questions_answered(state),
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
            select(SpeakingTurn.id)
            .where(SpeakingTurn.speaking_session_id == session_id)
            .limit(1)
        )
        if existing_turn is None:
            _add_transcript_turns(
                db,
                session_id=session_id,
                candidate_text=candidate_text,
                examiner_text=examiner_text,
                candidate_audio_asset=candidate_audio_asset,
                session_audio_asset=session_audio_asset,
            )

        try:
            evaluation = await grade_speaking_session(
                db,
                speaking_session=speaking_session,
                transcript=full_transcript,
            )
            if evaluation is not None:
                speaking_session.graded_at = (
                    speaking_session.graded_at or datetime.now(UTC)
                )
                speaking_session.status = "graded"
        except Exception as exc:
            metadata = dict(speaking_session.session_metadata or {})
            metadata["grading_error"] = str(exc)
            speaking_session.session_metadata = metadata
        await db.commit()


def _questions_answered(state: SpeakingLiveState) -> int:
    if state.planned_question_count is not None:
        return count_part1_questions_answered(state.transcript_fragments)
    return sum(
        1
        for fragment in state.transcript_fragments
        if str(fragment.get("role") or "").lower() == "candidate"
    )


def _add_transcript_turns(
    db: Any,
    *,
    session_id: UUID,
    candidate_text: str,
    examiner_text: str,
    candidate_audio_asset: SpeakingAudioAsset | None,
    session_audio_asset: SpeakingAudioAsset | None,
) -> None:
    if examiner_text:
        db.add(
            SpeakingTurn(
                speaking_session_id=session_id,
                speaker_role="examiner",
                turn_index=0,
                text_raw=examiner_text,
                text_normalized=examiner_text,
                language_code="en",
                turn_metadata={
                    "source": "gemini_live_output_transcription"
                },
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
                turn_metadata={
                    "source": "gemini_live_input_transcription"
                },
            )
        )
