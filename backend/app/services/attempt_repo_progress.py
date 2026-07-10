from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import Attempt, AttemptEvent
from app.models.enums import AttemptMode as ModelAttemptMode
from app.services.attempt_repo_runtime import load_answers, to_runtime
from app.services.attempt_repo_support import (
    elapsed_attempt_seconds,
    normalize_section_time_spent_sec,
)
from app.services.attempt_runtime import AttemptRuntime


def normalize_text_highlights(
    text_highlights: dict[str, list[dict[str, object]]],
) -> dict[str, list[dict[str, object]]]:
    normalized_highlights: dict[str, list[dict[str, object]]] = {}
    for block_key, items in text_highlights.items():
        if not isinstance(block_key, str):
            continue
        normalized_items: list[dict[str, object]] = []
        for item in items:
            try:
                start = max(0, int(item.get("start", 0)))
                end = max(start, int(item.get("end", 0)))
            except (AttributeError, TypeError, ValueError):
                continue
            if end <= start:
                continue
            item_id = str(item.get("id") or f"{block_key}-{start}-{end}")
            normalized_items.append(
                {"id": item_id, "start": start, "end": end}
            )
        normalized_highlights[block_key] = normalized_items
    return normalized_highlights


def normalize_ui_state(ui_state: dict[str, object]) -> dict[str, object]:
    normalized: dict[str, object] = {}
    theme = ui_state.get("theme")
    if isinstance(theme, str) and theme in {"light", "dark"}:
        normalized["theme"] = theme

    split_ratio = ui_state.get("split_ratio")
    if split_ratio is not None:
        try:
            normalized["split_ratio"] = round(
                min(58, max(42, float(split_ratio))),
                1,
            )
        except (TypeError, ValueError):
            pass

    font_scale = ui_state.get("font_scale")
    if font_scale is not None:
        try:
            normalized["font_scale"] = round(
                min(1.2, max(0.9, float(font_scale))),
                2,
            )
        except (TypeError, ValueError):
            pass
    return normalized


async def save_progress_in_db(
    session: AsyncSession,
    *,
    attempt_id: UUID,
    time_spent_sec: int | None = None,
    section_time_spent_sec: dict[str, object] | None = None,
    active_question_id: str | None = None,
    text_highlights: dict[str, list[dict[str, object]]] | None = None,
    ui_state: dict[str, object] | None = None,
) -> AttemptRuntime:
    attempt = await session.get(Attempt, attempt_id)
    if attempt is None:
        raise KeyError("attempt_not_found")

    metadata = dict(attempt.attempt_metadata or {})
    if time_spent_sec is not None:
        normalized_time_spent = max(0, int(time_spent_sec))
        if attempt.mode == ModelAttemptMode.EXAM:
            normalized_time_spent = max(
                normalized_time_spent,
                elapsed_attempt_seconds(attempt),
            )
        if attempt.mode == ModelAttemptMode.EXAM and attempt.time_limit_seconds:
            normalized_time_spent = min(
                normalized_time_spent,
                int(attempt.time_limit_seconds),
            )
        metadata["time_spent_sec"] = normalized_time_spent

    if section_time_spent_sec is not None:
        metadata["section_time_spent_sec"] = normalize_section_time_spent_sec(
            section_time_spent_sec,
            snapshot=dict(attempt.test_snapshot or {}),
            time_limit_seconds=attempt.time_limit_seconds,
        )

    if active_question_id is not None:
        normalized_active_question_id = str(active_question_id).strip()
        if normalized_active_question_id:
            metadata["active_question_id"] = normalized_active_question_id
        else:
            metadata.pop("active_question_id", None)

    if text_highlights is not None:
        metadata["text_highlights"] = normalize_text_highlights(text_highlights)

    if ui_state is not None:
        metadata["ui_state"] = normalize_ui_state(ui_state)

    attempt.attempt_metadata = metadata
    session.add(
        AttemptEvent(
            attempt_id=attempt_id,
            event_type="progress_saved",
            payload={
                "time_spent_sec": metadata.get("time_spent_sec", 0),
                "has_section_time": section_time_spent_sec is not None,
                "has_highlights": text_highlights is not None,
                "has_ui_state": ui_state is not None,
            },
            created_at=datetime.now(timezone.utc),
        )
    )
    await session.commit()
    await session.refresh(attempt)
    answers = await load_answers(session, attempt_id)
    return to_runtime(attempt, answers=answers)
