from __future__ import annotations

import logging
from datetime import UTC, datetime
from urllib.parse import unquote
from uuid import UUID

from sqlalchemy import select

from app.db.session import get_session_maker
from app.models.writing import WritingTask
from app.models.enums import AiUseCase
from app.services.ai_config import ResolvedAiUseCaseConfig, resolve_ai_use_case_config
from app.services.ai_generation import generate_image_text_sync
from app.services.object_storage import fetch_storage_object

logger = logging.getLogger(__name__)


_IMAGE_SUMMARY_PROMPT = (
    "Describe this IELTS Writing Task 1 visual. State the chart type, axes, "
    "units, time range, all numeric values, all categories, and the 3-5 most "
    "important trends or comparisons. Output as a detailed factual description "
    "(8-15 sentences). No commentary or interpretation."
)

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


def generate_image_summary(
    image_storage_path: str,
    *,
    resolved_config: ResolvedAiUseCaseConfig,
) -> str:
    try:
        bucket_name, object_name = _parse_storage_path(image_storage_path)
        payload, content_type = fetch_storage_object(
            bucket_name=bucket_name, object_name=object_name
        )
        if not payload:
            return ""
        mime_type = (content_type or "image/png").split(";")[0].strip() or "image/png"
        text = generate_image_text_sync(
            config=resolved_config,
            image_bytes=payload,
            mime_type=mime_type,
            prompt=_IMAGE_SUMMARY_PROMPT,
            temperature=0,
            top_p=1,
            max_output_tokens=2048,
        )
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

        resolved_config = await resolve_ai_use_case_config(session, AiUseCase.WRITING_IMAGE_SUMMARY)
        summary = generate_image_summary(task.image_storage_path, resolved_config=resolved_config)

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
