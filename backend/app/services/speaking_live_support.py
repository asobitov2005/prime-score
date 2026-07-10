from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from fastapi import HTTPException, WebSocket, status

from app.core.security import decode_token
from app.services.speaking_catalog import SPEAKING_MODE_ALIASES, SPEAKING_MODES
from app.services.speaking_roast_prompt import ROAST_SPEECH_CONFIG


def merge_transcript(current: str, next_text: str) -> str:
    clean_next = " ".join(str(next_text or "").split())
    if not clean_next:
        return current
    clean_current = " ".join(str(current or "").split())
    if not clean_current:
        return clean_next
    if clean_current.endswith(clean_next) or clean_next in clean_current:
        return clean_current
    return f"{clean_current} {clean_next}".strip()


def build_full_transcript(candidate_text: str, examiner_text: str) -> str:
    parts = []
    if examiner_text.strip():
        parts.append(f"Examiner:\n{examiner_text.strip()}")
    if candidate_text.strip():
        parts.append(f"Candidate:\n{candidate_text.strip()}")
    return "\n\n".join(parts).strip()


def live_config(
    settings: dict[str, Any],
    system_instruction: str,
    *,
    mode: str = "strict_exam",
) -> dict[str, Any]:
    modalities = settings.get("response_modalities")
    if not isinstance(modalities, list) or not modalities:
        modalities = ["AUDIO"]
    payload: dict[str, Any] = {
        "response_modalities": modalities,
        "system_instruction": system_instruction,
        "output_audio_transcription": {},
        "input_audio_transcription": {},
        "realtime_input_config": {
            "automatic_activity_detection": {"disabled": True},
        },
        "context_window_compression": {"sliding_window": {}},
        "session_resumption": {},
    }
    speech_config = settings.get("speech_config")
    if isinstance(speech_config, dict) and speech_config:
        payload["speech_config"] = speech_config
    elif mode == "uzbek_roast":
        payload["speech_config"] = ROAST_SPEECH_CONFIG
    return payload


async def websocket_user_id(websocket: WebSocket) -> UUID:
    token = websocket.query_params.get("token")
    debug_user_id = websocket.query_params.get("debug_user_id")
    if token:
        try:
            payload = decode_token(token)
            if payload.get("scope") == "admin":
                raise ValueError("admin token")
            return UUID(str(payload["sub"]))
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid websocket token.",
            ) from exc
    if debug_user_id:
        try:
            return UUID(debug_user_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid debug user id.",
            ) from exc
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication is required.",
    )


@dataclass(slots=True)
class SpeakingLiveStart:
    mode: str
    entry_mode: str
    part: int
    topic: str | None
    selected_topics: list[str]
    random_topic: bool

    @classmethod
    def from_message(cls, message: dict[str, Any]) -> "SpeakingLiveStart":
        mode = str(message.get("mode") or "strict_exam")
        mode = SPEAKING_MODE_ALIASES.get(mode, mode)
        if mode not in SPEAKING_MODES:
            mode = "strict_exam"

        entry_mode = str(message.get("entryMode") or "full")
        if entry_mode not in {"full", "part_1", "part_2", "part_3"}:
            entry_mode = "full"
        try:
            part = int(message.get("part") or 1)
        except (TypeError, ValueError):
            part = 1
        part = min(3, max(1, part))

        topic = str(message.get("topic") or "").strip() or None
        topics_raw = message.get("topics")
        if isinstance(topics_raw, list):
            selected_topics = [
                str(item).strip()
                for item in topics_raw
                if str(item).strip()
            ][:3]
        elif topic:
            selected_topics = [topic]
        else:
            selected_topics = []
        return cls(
            mode=mode,
            entry_mode=entry_mode,
            part=part,
            topic=topic,
            selected_topics=selected_topics,
            random_topic=bool(message.get("randomTopic")),
        )
