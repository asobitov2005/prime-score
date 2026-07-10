from __future__ import annotations

import asyncio
import re
import struct
import sys
from array import array
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.speaking import SpeakingAudioAsset
from app.schemas.speaking import SpeakingAudioAssetRead
from app.services.object_storage import upload_speaking_audio_asset

LIVE_INPUT_RATE = 16_000
LIVE_OUTPUT_RATE = 24_000
PCM_SAMPLE_WIDTH_BYTES = 2


def parse_audio_sample_rate(
    mime_type: str | None,
    fallback: int = LIVE_OUTPUT_RATE,
) -> int:
    match = re.search(r"rate=(\d+)", str(mime_type or ""), flags=re.IGNORECASE)
    if not match:
        return fallback
    try:
        return int(match.group(1))
    except ValueError:
        return fallback


def pcm16_duration_ms(byte_length: int, sample_rate: int) -> int:
    if sample_rate <= 0:
        return 0
    return max(
        0,
        round((byte_length / PCM_SAMPLE_WIDTH_BYTES / sample_rate) * 1000),
    )


def pcm16_to_wav(pcm_bytes: bytes, sample_rate: int) -> bytes:
    channels = 1
    bits_per_sample = 16
    byte_rate = sample_rate * channels * PCM_SAMPLE_WIDTH_BYTES
    block_align = channels * PCM_SAMPLE_WIDTH_BYTES
    data_size = len(pcm_bytes)
    header = b"".join(
        (
            b"RIFF",
            struct.pack("<I", 36 + data_size),
            b"WAVE",
            b"fmt ",
            struct.pack(
                "<IHHIIHH",
                16,
                1,
                channels,
                sample_rate,
                byte_rate,
                block_align,
                bits_per_sample,
            ),
            b"data",
            struct.pack("<I", data_size),
        )
    )
    return header + pcm_bytes


def resample_pcm16_mono(
    pcm_bytes: bytes,
    source_rate: int,
    target_rate: int,
) -> bytes:
    if source_rate <= 0 or target_rate <= 0 or source_rate == target_rate:
        return pcm_bytes
    byte_length = len(pcm_bytes) - (len(pcm_bytes) % PCM_SAMPLE_WIDTH_BYTES)
    if byte_length <= PCM_SAMPLE_WIDTH_BYTES:
        return pcm_bytes[:byte_length]

    samples = array("h")
    samples.frombytes(pcm_bytes[:byte_length])
    if sys.byteorder != "little":
        samples.byteswap()
    output_count = max(1, round(len(samples) * target_rate / source_rate))
    ratio = source_rate / target_rate
    output = array("h")
    for index in range(output_count):
        source_position = index * ratio
        left_index = min(len(samples) - 1, int(source_position))
        right_index = min(len(samples) - 1, left_index + 1)
        fraction = source_position - left_index
        sample = samples[left_index] + (
            samples[right_index] - samples[left_index]
        ) * fraction
        output.append(max(-32768, min(32767, round(sample))))
    if sys.byteorder != "little":
        output.byteswap()
    return output.tobytes()


def combine_pcm16_segments(
    segments: list[tuple[bytes, int]],
    target_rate: int,
) -> list[bytes]:
    chunks: list[bytes] = []
    for pcm_bytes, sample_rate in segments:
        if not pcm_bytes:
            continue
        if sample_rate > 0 and sample_rate != target_rate:
            pcm_bytes = resample_pcm16_mono(
                pcm_bytes,
                sample_rate,
                target_rate,
            )
        chunks.append(pcm_bytes)
    return chunks


async def persist_speaking_audio_asset(
    db: AsyncSession,
    *,
    session_id: UUID,
    speaker_role: str,
    channel_kind: str,
    pcm_chunks: list[bytes],
    sample_rate: int,
    source_mime_type: str,
) -> SpeakingAudioAsset | None:
    if not pcm_chunks:
        return None
    pcm_bytes = b"".join(pcm_chunks)
    if not pcm_bytes:
        return None

    wav_bytes = pcm16_to_wav(pcm_bytes, sample_rate)
    duration_ms = pcm16_duration_ms(len(pcm_bytes), sample_rate)
    storage_path = await asyncio.to_thread(
        upload_speaking_audio_asset,
        content=wav_bytes,
        filename=f"{speaker_role}.wav",
        content_type="audio/wav",
        session_id=str(session_id),
        speaker_role=speaker_role,
    )
    audio_asset = SpeakingAudioAsset(
        speaking_session_id=session_id,
        speaker_role=speaker_role,
        storage_path=storage_path,
        mime_type="audio/wav",
        duration_ms=duration_ms,
        channel_kind=channel_kind,
        asset_metadata={
            "sample_rate": sample_rate,
            "source_mime_type": source_mime_type,
            "source_encoding": "pcm_s16le",
            "byte_length": len(pcm_bytes),
        },
    )
    db.add(audio_asset)
    await db.flush()
    return audio_asset


def serialize_audio_asset(row: SpeakingAudioAsset) -> SpeakingAudioAssetRead:
    return SpeakingAudioAssetRead(
        id=row.id,
        speaker_role=row.speaker_role,
        storage_path=row.storage_path,
        mime_type=row.mime_type,
        duration_ms=row.duration_ms,
        channel_kind=row.channel_kind,
        metadata=dict(row.asset_metadata or {}),
    )


def select_result_audio_assets(
    rows: list[SpeakingAudioAsset],
) -> list[SpeakingAudioAsset]:
    if not rows:
        return []
    for channel_kind in ("session_audio", "candidate_input", "full_mix"):
        selected = next(
            (row for row in rows if row.channel_kind == channel_kind),
            None,
        )
        if selected is not None:
            return [selected]
    return [rows[0]]
