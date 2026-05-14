from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai import AiProviderConfig, AiUsageEvent
from app.models.enums import AiProvider, AiUseCase


@dataclass(slots=True)
class AiUsageEventDraft:
    provider: AiProvider
    use_case: AiUseCase
    model_id: str
    operation: str
    status: str
    provider_config_id: Any | None = None
    provider_model_id: Any | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    cached_prompt_tokens: int | None = None
    thoughts_tokens: int | None = None
    estimated_input_tokens: int | None = None
    requested_output_tokens: int | None = None
    effective_output_tokens: int | None = None
    request_characters: int | None = None
    response_characters: int | None = None
    latency_ms: int | None = None
    error_code: str | None = None
    error_message: str | None = None
    metadata_json: dict[str, Any] = field(default_factory=dict)


async def persist_ai_usage_events(
    session: AsyncSession,
    events: list[AiUsageEventDraft] | tuple[AiUsageEventDraft, ...],
) -> None:
    if not events:
        return
    for event in events:
        session.add(
            AiUsageEvent(
                provider_config_id=event.provider_config_id,
                provider_model_id=event.provider_model_id,
                provider=event.provider,
                use_case=event.use_case,
                model_id=event.model_id,
                operation=event.operation,
                status=event.status,
                prompt_tokens=event.prompt_tokens,
                completion_tokens=event.completion_tokens,
                total_tokens=event.total_tokens,
                cached_prompt_tokens=event.cached_prompt_tokens,
                thoughts_tokens=event.thoughts_tokens,
                estimated_input_tokens=event.estimated_input_tokens,
                requested_output_tokens=event.requested_output_tokens,
                effective_output_tokens=event.effective_output_tokens,
                request_characters=event.request_characters,
                response_characters=event.response_characters,
                latency_ms=event.latency_ms,
                error_code=event.error_code,
                error_message=(event.error_message or "")[:2000] or None,
                metadata_json=dict(event.metadata_json or {}),
            )
        )


async def build_ai_usage_dashboard(
    session: AsyncSession,
    *,
    window_days: int = 7,
    recent_limit: int = 40,
) -> dict[str, Any]:
    safe_window_days = max(1, min(int(window_days), 90))
    since = datetime.now(UTC) - timedelta(days=safe_window_days)

    provider_rows = (
        await session.execute(
            select(
                AiProviderConfig.id,
                AiProviderConfig.provider,
                AiProviderConfig.label,
                func.count(AiUsageEvent.id),
                func.sum(func.case((AiUsageEvent.status == "success", 1), else_=0)),
                func.sum(func.case((AiUsageEvent.status != "success", 1), else_=0)),
                func.sum(AiUsageEvent.prompt_tokens),
                func.sum(AiUsageEvent.completion_tokens),
                func.sum(AiUsageEvent.total_tokens),
                func.sum(AiUsageEvent.cached_prompt_tokens),
                func.sum(AiUsageEvent.thoughts_tokens),
                func.avg(AiUsageEvent.latency_ms),
                func.max(AiUsageEvent.created_at),
            )
            .select_from(AiProviderConfig)
            .join(AiUsageEvent, AiUsageEvent.provider_config_id == AiProviderConfig.id, isouter=True)
            .where((AiUsageEvent.created_at.is_(None)) | (AiUsageEvent.created_at >= since))
            .group_by(AiProviderConfig.id)
            .order_by(AiProviderConfig.label.asc())
        )
    ).all()

    use_case_rows = (
        await session.execute(
            select(
                AiUsageEvent.provider_config_id,
                AiUsageEvent.use_case,
                func.count(AiUsageEvent.id),
                func.sum(AiUsageEvent.total_tokens),
                func.avg(AiUsageEvent.latency_ms),
            )
            .where(AiUsageEvent.created_at >= since)
            .group_by(AiUsageEvent.provider_config_id, AiUsageEvent.use_case)
        )
    ).all()
    use_cases_by_provider: dict[Any, list[dict[str, Any]]] = {}
    for row in use_case_rows:
        provider_id = row[0]
        use_cases_by_provider.setdefault(provider_id, []).append(
            {
                "use_case": row[1],
                "requests_total": int(row[2] or 0),
                "total_tokens": int(row[3] or 0),
                "avg_latency_ms": int(row[4] or 0) if row[4] is not None else None,
            }
        )

    providers = [
        {
            "provider_config_id": row[0],
            "provider": row[1],
            "label": row[2],
            "window_days": safe_window_days,
            "requests_total": int(row[3] or 0),
            "success_total": int(row[4] or 0),
            "failed_total": int(row[5] or 0),
            "prompt_tokens": int(row[6] or 0),
            "completion_tokens": int(row[7] or 0),
            "total_tokens": int(row[8] or 0),
            "cached_prompt_tokens": int(row[9] or 0),
            "thoughts_tokens": int(row[10] or 0),
            "avg_latency_ms": int(row[11] or 0) if row[11] is not None else None,
            "last_used_at": row[12],
            "use_cases": sorted(
                use_cases_by_provider.get(row[0], []),
                key=lambda item: (-item["total_tokens"], item["use_case"].value),
            ),
        }
        for row in provider_rows
    ]

    recent_rows = (
        await session.scalars(
            select(AiUsageEvent)
            .where(AiUsageEvent.created_at >= since)
            .order_by(AiUsageEvent.created_at.desc())
            .limit(max(1, min(int(recent_limit), 200)))
        )
    ).all()
    recent_events = [
        {
            "id": row.id,
            "provider": row.provider,
            "use_case": row.use_case,
            "model_id": row.model_id,
            "operation": row.operation,
            "status": row.status,
            "total_tokens": row.total_tokens,
            "prompt_tokens": row.prompt_tokens,
            "completion_tokens": row.completion_tokens,
            "cached_prompt_tokens": row.cached_prompt_tokens,
            "latency_ms": row.latency_ms,
            "error_code": row.error_code,
            "error_message": row.error_message,
            "created_at": row.created_at,
        }
        for row in recent_rows
    ]

    return {
        "window_days": safe_window_days,
        "providers": providers,
        "recent_events": recent_events,
    }
