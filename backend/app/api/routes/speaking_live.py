from __future__ import annotations

import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from google import genai

from app.core.config import get_settings
from app.db.session import get_session_maker
from app.models.enums import AiProvider, AiUseCase
from app.models.speaking import SpeakingEvent, SpeakingSession
from app.services.ai_config import build_google_client, resolve_ai_use_case_config
from app.services.speaking_catalog import resolve_planned_question_count
from app.services.speaking_live_bridge import (
    SpeakingLiveBridge,
    SpeakingLiveState,
)
from app.services.speaking_live_finalize import finalize_speaking_live_session
from app.services.speaking_live_support import (
    SpeakingLiveStart,
    live_config,
    websocket_user_id,
)
from app.services.speaking_prompt import build_live_system_instruction

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/sessions/{session_id}/live")
async def speaking_live_websocket(
    websocket: WebSocket,
    session_id: UUID,
) -> None:
    await websocket.accept()
    try:
        user_id = await websocket_user_id(websocket)
    except HTTPException as exc:
        await websocket.send_json({"type": "error", "message": exc.detail})
        await websocket.close(code=1008)
        return

    session_maker = get_session_maker()
    async with session_maker() as db:
        speaking_session = await db.get(SpeakingSession, session_id)
        if speaking_session is None or speaking_session.user_id != user_id:
            await websocket.send_json(
                {"type": "error", "message": "Speaking session not found."}
            )
            await websocket.close(code=1008)
            return
        try:
            examiner_config = await resolve_ai_use_case_config(
                db,
                AiUseCase.SPEAKING_EXAMINER,
            )
        except RuntimeError as exc:
            await websocket.send_json(
                {"type": "error", "message": str(exc)}
            )
            await websocket.close(code=1011)
            return
        if examiner_config.provider != AiProvider.GOOGLE:
            await websocket.send_json(
                {
                    "type": "error",
                    "message": (
                        "Speaking Live currently requires a Google Live model binding."
                    ),
                }
            )
            await websocket.close(code=1011)
            return

    try:
        first = await websocket.receive_json()
    except WebSocketDisconnect:
        return
    except Exception:
        await websocket.send_json(
            {"type": "error", "message": "Expected a start message."}
        )
        await websocket.close(code=1003)
        return
    if first.get("type") != "start":
        await websocket.close(code=1000)
        return

    start = SpeakingLiveStart.from_message(first)
    async with session_maker() as db:
        speaking_session = await db.get(SpeakingSession, session_id)
        if speaking_session is None or speaking_session.user_id != user_id:
            await websocket.send_json(
                {"type": "error", "message": "Speaking session not found."}
            )
            await websocket.close(code=1008)
            return
        speaking_session.status = "live"
        speaking_session.started_at = (
            speaking_session.started_at or datetime.now(UTC)
        )
        await db.commit()

    system_instruction = build_live_system_instruction(
        examiner_config.settings_json,
        mode=start.mode,
        entry_mode=start.entry_mode,
        part=start.part,
        topics=start.selected_topics,
        random_topic=start.random_topic,
    )
    client, live_model = _build_live_client(
        examiner_config,
        mode=start.mode,
    )
    config = live_config(
        examiner_config.settings_json,
        system_instruction,
        mode=start.mode,
    )
    live_started_at = datetime.now(UTC)
    async with session_maker() as db:
        db.add(
            SpeakingEvent(
                speaking_session_id=session_id,
                event_type="live_started",
                payload={
                    "mode": start.mode,
                    "entry_mode": start.entry_mode,
                    "part": start.part,
                    "topic": (
                        start.selected_topics[0]
                        if len(start.selected_topics) == 1
                        else None
                    ),
                    "topics": start.selected_topics,
                    "random_topic": start.random_topic,
                },
                created_at=live_started_at,
            )
        )
        await db.commit()

    state = SpeakingLiveState(
        started_at=live_started_at,
        planned_question_count=resolve_planned_question_count(
            start.entry_mode,
            start.part,
        ),
    )
    try:
        async with client.aio.live.connect(
            model=live_model,
            config=config,
        ) as live:
            bridge = SpeakingLiveBridge(
                websocket=websocket,
                live=live,
                model=live_model,
                start=start,
                state=state,
            )
            await bridge.run()
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.exception(
            "Speaking live session failed (session=%s mode=%s model=%s): %s",
            session_id,
            start.mode,
            live_model,
            exc,
        )
        try:
            await websocket.send_json(
                {"type": "error", "message": str(exc)}
            )
        except Exception:
            pass
    finally:
        await finalize_speaking_live_session(
            session_maker,
            session_id=session_id,
            start=start,
            state=state,
        )


def _build_live_client(examiner_config, *, mode: str):
    settings = get_settings()
    ai_studio_key = (settings.gemini_aistudio_api_key or "").strip()
    if mode == "uzbek_roast" and ai_studio_key:
        client = genai.Client(api_key=ai_studio_key, vertexai=False)
        live_model = (
            settings.gemini_speaking_roast_model
            or examiner_config.model_id
        ).strip()
        return client, live_model
    return build_google_client(examiner_config), examiner_config.model_id
