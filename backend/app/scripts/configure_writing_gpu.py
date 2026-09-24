"""Validate GPU.uz, then atomically register its model and optional Writing bindings.

Run from backend: python -m app.scripts.configure_writing_gpu --model MODEL --activate
The key is read from a hidden prompt or GPU_UZ_API_KEY, never a command argument.
"""

from __future__ import annotations

import argparse
import asyncio
import getpass
import json
import os
from datetime import UTC, datetime

from pydantic import BaseModel
from sqlalchemy import select, text

from app.db.session import get_engine, get_session_maker
from app.models.ai import AiProviderConfig, AiProviderModel, AiUseCaseBinding
from app.models.enums import AiProvider, AiUseCase
from app.services.ai_config import invalidate_ai_config_cache
from app.services.gpu_uz import (
    DEFAULT_BASE_URL,
    generate_completion,
    list_models,
    normalize_base_url,
)

WRITING_BINDINGS = (
    AiUseCase.WRITING_GRADER,
    AiUseCase.WRITING_IMPROVER,
    AiUseCase.WRITING_ROAST,
)


class ConnectionCheck(BaseModel):
    ok: bool


async def configure(
    *, api_key: str, model_id: str, base_url: str, activate: bool
) -> dict:
    base_url = normalize_base_url(base_url)
    models = await list_models(api_key=api_key, base_url=base_url)
    model_payload = next(
        (item for item in models if item["model_id"] == model_id), None
    )
    if model_payload is None:
        raise ValueError(
            "Requested model was not returned by GPU.uz; no database changes made."
        )
    completion = await asyncio.to_thread(
        generate_completion,
        api_key=api_key,
        base_url=base_url,
        model=model_id,
        messages=[{"role": "user", "content": 'Return a JSON object with "ok": true.'}],
        max_tokens=80,
        temperature=0,
        top_p=1,
        response_schema=ConnectionCheck,
    )
    if not ConnectionCheck.model_validate_json(
        completion.choices[0].message.content
    ).ok:
        raise ValueError("Structured output check failed; no database changes made.")
    async with get_session_maker()() as session, session.begin():
        await session.execute(text("SELECT pg_advisory_xact_lock(71925304)"))
        provider = await session.scalar(
            select(AiProviderConfig).where(
                AiProviderConfig.provider == AiProvider.GPU_UZ
            )
        )
        if provider is None:
            provider = AiProviderConfig(
                provider=AiProvider.GPU_UZ, label="GPU.uz", api_key=""
            )
            session.add(provider)
        provider.api_key = api_key
        provider.base_url = base_url
        provider.is_enabled = True
        provider.last_sync_at = datetime.now(UTC)
        provider.last_sync_status = "success"
        provider.last_sync_error = None
        await session.flush()
        selected_model = None
        for index, item in enumerate(models):
            model = await session.scalar(
                select(AiProviderModel).where(
                    AiProviderModel.provider_config_id == provider.id,
                    AiProviderModel.model_id == item["model_id"],
                )
            )
            if model is None:
                model = AiProviderModel(
                    provider_config_id=provider.id, model_id=item["model_id"]
                )
                session.add(model)
            for field, value in item.items():
                setattr(model, field, value)
            model.sort_order = index
            if model.model_id == model_id:
                selected_model = model
        await session.flush()
        assert selected_model is not None
        if activate:
            for use_case in WRITING_BINDINGS:
                binding = await session.scalar(
                    select(AiUseCaseBinding).where(
                        AiUseCaseBinding.use_case == use_case
                    )
                )
                if binding is None:
                    binding = AiUseCaseBinding(use_case=use_case, settings_json={})
                    session.add(binding)
                binding.provider_config_id = provider.id
                binding.provider_model_id = selected_model.id
                binding.settings_json = {
                    **(binding.settings_json or {}),
                    "http_timeout_ms": 120000,
                }
        result = {
            "provider": "gpu_uz",
            "model": model_id,
            "context_window": selected_model.context_window,
            "bindings": [item.value for item in WRITING_BINDINGS] if activate else [],
        }
    invalidate_ai_config_cache()
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument(
        "--activate",
        action="store_true",
        help="Replace only the three Writing text bindings.",
    )
    args = parser.parse_args()
    api_key = os.environ.get("GPU_UZ_API_KEY") or getpass.getpass("GPU.uz API key: ")

    async def run() -> None:
        try:
            result = await configure(
                api_key=api_key,
                model_id=args.model,
                base_url=args.base_url,
                activate=args.activate,
            )
            print(json.dumps(result))
        finally:
            await get_engine().dispose()

    asyncio.run(run())


if __name__ == "__main__":
    main()
