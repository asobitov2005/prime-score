from __future__ import annotations

import asyncio
import base64
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from fastapi import WebSocket
from google.genai import types

from app.services.speaking_audio import (
    LIVE_INPUT_RATE,
    LIVE_OUTPUT_RATE,
    parse_audio_sample_rate,
)
from app.services.speaking_live_support import SpeakingLiveStart, merge_transcript


@dataclass(slots=True)
class SpeakingLiveState:
    started_at: datetime
    planned_question_count: int | None
    transcript: dict[str, str] = field(
        default_factory=lambda: {"candidate": "", "examiner": ""}
    )
    transcript_fragments: list[dict[str, Any]] = field(default_factory=list)
    session_audio_segments: list[tuple[bytes, int]] = field(default_factory=list)
    candidate_audio_segments: list[tuple[bytes, int]] = field(default_factory=list)
    stopped_normally: bool = False
    turn_count: int = 0

    def remember_fragment(self, role: str, text: str) -> None:
        merged = merge_transcript(self.transcript.get(role, ""), text)
        if merged == self.transcript.get(role, ""):
            return
        fragment_at = datetime.now(UTC)
        self.transcript[role] = merged
        self.transcript_fragments.append(
            {
                "role": role,
                "text": text.strip(),
                "at": fragment_at.isoformat(),
                "offset_ms": max(
                    0,
                    round(
                        (fragment_at - self.started_at).total_seconds() * 1000
                    ),
                ),
            }
        )


class SpeakingLiveBridge:
    def __init__(
        self,
        *,
        websocket: WebSocket,
        live: Any,
        model: str,
        start: SpeakingLiveStart,
        state: SpeakingLiveState,
    ) -> None:
        self.websocket = websocket
        self.live = live
        self.model = model
        self.start = start
        self.state = state
        self.user_activity_open = False

    async def send_ready(self) -> None:
        ready_payload: dict[str, Any] = {
            "type": "ready",
            "mode": self.start.mode,
            "part": self.start.part,
            "model": self.model,
        }
        if self.state.planned_question_count is not None:
            ready_payload["planned_questions"] = (
                self.state.planned_question_count
            )
        await self.websocket.send_json(ready_payload)

        if not self.start.selected_topics and not self.start.random_topic:
            return
        topic_label = (
            ", ".join(self.start.selected_topics)
            if self.start.selected_topics
            else "choose a random realistic IELTS topic"
        )
        if self.start.mode == "free_talk":
            session_label = "a free conversation"
        elif self.start.mode == "uzbek_roast":
            session_label = "a harsh Uzbek roast session"
        elif self.start.entry_mode == "full":
            session_label = "IELTS Speaking full test from Part 1"
        else:
            session_label = f"IELTS Speaking Part {self.start.part}"
        topic_suffix = "s" if len(self.start.selected_topics) > 1 else ""
        await self.live.send_realtime_input(
            text=(
                f"Start {session_label}. Mode: {self.start.mode}. "
                f"Topic{topic_suffix}: {topic_label}."
            )
        )

    async def receive_browser(self) -> None:
        while True:
            message = await self.websocket.receive_json()
            message_type = message.get("type")
            if message_type == "begin_audio":
                await self._open_activity()
            elif message_type == "audio":
                data = base64.b64decode(str(message.get("data") or ""))
                if data:
                    await self._open_activity()
                    self.state.session_audio_segments.append(
                        (data, LIVE_INPUT_RATE)
                    )
                    self.state.candidate_audio_segments.append(
                        (data, LIVE_INPUT_RATE)
                    )
                    await self.live.send_realtime_input(
                        audio=types.Blob(
                            data=data,
                            mime_type=f"audio/pcm;rate={LIVE_INPUT_RATE}",
                        )
                    )
            elif message_type == "end_audio":
                await self._close_activity()
            elif message_type == "text":
                text = str(message.get("text") or "").strip()
                if text:
                    await self.live.send_realtime_input(text=text)
            elif message_type == "stop":
                await self._close_activity()
                self.state.stopped_normally = True
                break

    async def send_google(self) -> None:
        turn_index = 0
        try:
            async for response in self.live.receive():
                go_away = getattr(response, "go_away", None)
                if go_away is not None:
                    time_left = getattr(go_away, "time_left", None)
                    await self.websocket.send_json(
                        {
                            "type": "session_ending",
                            "reason": "time_limit",
                            "time_left": (
                                str(time_left)
                                if time_left is not None
                                else None
                            ),
                        }
                    )
                    self.state.stopped_normally = True
                    break

                server_content = getattr(response, "server_content", None)
                if not server_content:
                    continue
                await self._send_transcriptions(server_content)
                await self._send_audio(server_content)
                if getattr(server_content, "turn_complete", False):
                    turn_index += 1
                    self.state.turn_count = turn_index
                    await self.websocket.send_json(
                        {"type": "turn_complete", "turn": turn_index}
                    )
                    await self.websocket.send_json(
                        {"type": "your_turn", "turn": turn_index}
                    )
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            await self.websocket.send_json(
                {"type": "error", "message": str(exc)}
            )

    async def run(self) -> None:
        await self.send_ready()
        receiver = asyncio.create_task(self.receive_browser())
        sender = asyncio.create_task(self.send_google())
        done, pending = await asyncio.wait(
            {receiver, sender},
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
        for task in done:
            task.result()

    async def _open_activity(self) -> None:
        if self.user_activity_open:
            return
        await self.live.send_realtime_input(activity_start=types.ActivityStart())
        self.user_activity_open = True

    async def _close_activity(self) -> None:
        if not self.user_activity_open:
            return
        await self.live.send_realtime_input(activity_end=types.ActivityEnd())
        self.user_activity_open = False

    async def _send_transcriptions(self, server_content: Any) -> None:
        input_transcription = getattr(
            server_content,
            "input_transcription",
            None,
        )
        if input_transcription and getattr(input_transcription, "text", None):
            self.state.remember_fragment("candidate", input_transcription.text)
            await self.websocket.send_json(
                {
                    "type": "input_transcript",
                    "text": input_transcription.text,
                }
            )
        output_transcription = getattr(
            server_content,
            "output_transcription",
            None,
        )
        if output_transcription and getattr(output_transcription, "text", None):
            self.state.remember_fragment("examiner", output_transcription.text)
            await self.websocket.send_json(
                {"type": "transcript", "text": output_transcription.text}
            )

    async def _send_audio(self, server_content: Any) -> None:
        model_turn = getattr(server_content, "model_turn", None)
        if not model_turn or not getattr(model_turn, "parts", None):
            return
        for item in model_turn.parts:
            inline_data = getattr(item, "inline_data", None)
            if not inline_data or not getattr(inline_data, "data", None):
                continue
            mime_type = getattr(
                inline_data,
                "mime_type",
                "audio/pcm;rate=24000",
            )
            audio_payload = bytes(inline_data.data)
            self.state.session_audio_segments.append(
                (
                    audio_payload,
                    parse_audio_sample_rate(mime_type, LIVE_OUTPUT_RATE),
                )
            )
            await self.websocket.send_json(
                {
                    "type": "audio",
                    "mimeType": mime_type,
                    "data": base64.b64encode(audio_payload).decode("ascii"),
                }
            )
