from __future__ import annotations

import logging
from datetime import UTC, datetime
from urllib.parse import unquote
from uuid import UUID

from google import genai
from google.genai import types as genai_types
from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import get_session_maker
from app.models.writing import WritingTask
from app.services.object_storage import fetch_storage_object

logger = logging.getLogger(__name__)


_IMAGE_SUMMARY_PROMPT = (
    "Describe this IELTS Writing Task 1 visual. State the chart type, axes, "
    "units, time range, all numeric values, all categories, and the 3-5 most "
    "important trends or comparisons. Output as a detailed factual description "
    "(8-15 sentences). No commentary or interpretation."
)


def _build_gemini_client() -> genai.Client:
    settings = get_settings()
    if not (settings.gemini_api_key or "").strip():
        raise RuntimeError("GEMINI_API_KEY is not configured.")
    return genai.Client(api_key=settings.gemini_api_key)


def _parse_storage_path(image_storage_path: str) -> tuple[str, str]:
    raw = (image_storage_path or "").strip()
    if not raw:
        raise ValueError("image_storage_path is empty")
    if raw.startswith("/api/storage/"):
        raw = raw[len("/api/storage/") :]
    raw = raw.lstrip("/")
    if "/" not in raw:
        raise ValueError(f"image_storage_path missing object name: {image_storage_path!r}")
    bucket_name, object_name = raw.split("/", 1)
    return unquote(bucket_name), unquote(object_name)


def generate_image_summary(image_storage_path: str) -> str:
    try:
        bucket_name, object_name = _parse_storage_path(image_storage_path)
        payload, content_type = fetch_storage_object(
            bucket_name=bucket_name, object_name=object_name
        )
        if not payload:
            return ""
        mime_type = (content_type or "image/png").split(";")[0].strip() or "image/png"

        client = _build_gemini_client()
        config = genai_types.GenerateContentConfig(
            temperature=0,
            topP=1,
            maxOutputTokens=2048,
            thinkingConfig=genai_types.ThinkingConfig(
                thinkingLevel=genai_types.ThinkingLevel.MINIMAL,
            ),
        )
        writing_model = (get_settings().gemini_writing_model or get_settings().gemini_model).strip()
        response = client.models.generate_content(
            model=writing_model,
            contents=[
                genai_types.Content(
                    role="user",
                    parts=[
                        genai_types.Part.from_bytes(data=payload, mime_type=mime_type),
                        genai_types.Part(text=_IMAGE_SUMMARY_PROMPT),
                    ],
                )
            ],
            config=config,
        )
        text = (response.text or "").strip()
        return text
    except Exception:  # noqa: BLE001
        logger.exception("Failed to generate writing image summary for %s", image_storage_path)
        return ""


async def refresh_task_image_summary(task_id: UUID) -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        result = await session.execute(
            select(WritingTask).where(WritingTask.id == task_id)
        )
        task = result.scalar_one_or_none()
        if task is None:
            return
        if not task.image_storage_path:
            task.image_summary_status = "not_required"
            await session.commit()
            return

        task.image_summary_status = "processing"
        task.updated_at = datetime.now(UTC)
        await session.commit()

        summary = generate_image_summary(task.image_storage_path)

        result = await session.execute(
            select(WritingTask).where(WritingTask.id == task_id)
        )
        task = result.scalar_one_or_none()
        if task is None:
            return
        if summary:
            task.image_summary = summary
            task.image_summary_status = "ready"
        else:
            task.image_summary_status = "failed"
        task.updated_at = datetime.now(UTC)
        await session.commit()
