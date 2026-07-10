from datetime import UTC, datetime

from app.api.routes import speaking
from app.services.speaking_audio import pcm16_duration_ms, pcm16_to_wav
from app.services.speaking_feedback import extract_json_object, safe_band
from app.services.speaking_live_bridge import SpeakingLiveState
from app.services.speaking_live_support import SpeakingLiveStart
from app.services.speaking_prompt import build_live_system_instruction


def test_speaking_router_keeps_existing_paths() -> None:
    route_paths = [getattr(route, "path", None) for route in speaking.router.routes]
    expected_paths = {
        "/tests",
        "/topics",
        "/sessions",
        "/sessions/{session_id}/live",
        "/sessions/history",
        "/sessions/{session_id}/result",
        "/sessions/{session_id}",
    }

    assert expected_paths.issubset(set(route_paths))
    assert len(route_paths) == len(set(route_paths))


def test_speaking_facade_keeps_legacy_helpers() -> None:
    assert speaking._entry_mode_parts is speaking.entry_mode_parts
    assert speaking._build_live_system_instruction is speaking.build_live_system_instruction
    assert speaking._pcm16_to_wav is speaking.pcm16_to_wav
    assert speaking._grade_speaking_session is speaking.grade_speaking_session
    assert speaking._websocket_user_id is speaking.websocket_user_id


def test_live_start_normalizes_invalid_input() -> None:
    start = SpeakingLiveStart.from_message(
        {
            "mode": "practice",
            "entryMode": "invalid",
            "part": 10,
            "topics": ["Work", "Study", "Travel", "Ignored"],
            "randomTopic": True,
        }
    )

    assert start.mode == "free_talk"
    assert start.entry_mode == "full"
    assert start.part == 3
    assert start.selected_topics == ["Work", "Study", "Travel"]
    assert start.random_topic is True


def test_live_state_merges_transcript_fragments() -> None:
    state = SpeakingLiveState(
        started_at=datetime.now(UTC),
        planned_question_count=8,
    )

    state.remember_fragment("candidate", "I live in Tashkent.")
    state.remember_fragment("candidate", "I live in Tashkent.")
    state.remember_fragment("candidate", "It is a busy city.")

    assert state.transcript["candidate"] == (
        "I live in Tashkent. It is a busy city."
    )
    assert len(state.transcript_fragments) == 2


def test_audio_helpers_create_valid_wav_header() -> None:
    pcm = b"\x00\x00" * 16_000
    wav = pcm16_to_wav(pcm, 16_000)

    assert wav.startswith(b"RIFF")
    assert wav[8:12] == b"WAVE"
    assert pcm16_duration_ms(len(pcm), 16_000) == 1000


def test_feedback_helpers_clamp_and_extract_json() -> None:
    assert safe_band(10) == 9.0
    assert safe_band(-1) == 0.0
    assert safe_band("7.24") == 7.0
    assert extract_json_object("prefix {\"overall_band\": 7.5} suffix") == {
        "overall_band": 7.5
    }


def test_prompt_builder_keeps_selected_topic() -> None:
    prompt = build_live_system_instruction(
        {},
        mode="strict_exam",
        entry_mode="part_1",
        part=1,
        topics=["Work and studies"],
        random_topic=False,
    )

    assert "Selected topic: Work and studies" in prompt
    assert "ask exactly 8 short questions" in prompt
    assert "IELTS Speaking Part 1" in prompt
