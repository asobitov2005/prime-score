from __future__ import annotations

import json
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from pydantic import BaseModel
from google.genai import types as genai_types

from app.models.enums import AiProvider, AiUseCase
from app.services import gpu_uz
from app.services.ai_config import (
    ResolvedAiUseCaseConfig,
    supports_use_case_binding,
    validate_provider_credentials,
)
from app.services.ai_generation import generate_text_sync


class Feedback(BaseModel):
    summary: str


def test_google_schema_instances_translate_to_json_schema_not_schema_meta_model():
    schema = genai_types.Schema(
        type=genai_types.Type.OBJECT,
        required=["summary"],
        properties={
            "summary": genai_types.Schema(type=genai_types.Type.STRING),
            "alternatives": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                nullable=True,
                items=genai_types.Schema(type=genai_types.Type.STRING),
            ),
        },
    )
    converted = gpu_uz.to_json_schema(schema)
    assert converted["type"] == "object"
    assert converted["required"] == ["summary"]
    assert converted["properties"]["summary"] == {"type": "string"}
    assert converted["properties"]["alternatives"] == {
        "anyOf": [{"type": "array", "items": {"type": "string"}}, {"type": "null"}]
    }


def config() -> ResolvedAiUseCaseConfig:
    return ResolvedAiUseCaseConfig(
        use_case=AiUseCase.WRITING_GRADER,
        provider=AiProvider.GPU_UZ,
        provider_config_id=None,
        provider_label="GPU.uz",
        api_key="private-test-key",
        base_url=None,
        model_id="org/test-model",
        model_record_id=None,
        settings_json={},
        context_window=131072,
    )


@pytest.mark.parametrize("use_case", list(AiUseCase))
def test_binding_eligibility(use_case):
    assert supports_use_case_binding(
        {"generate_content": True}, use_case, AiProvider.GPU_UZ
    ) == (
        use_case
        in {
            AiUseCase.WRITING_GRADER,
            AiUseCase.WRITING_IMPROVER,
            AiUseCase.WRITING_ROAST,
        }
    )


def install_transport(monkeypatch, handler):
    original_sync, original_async = httpx.Client, httpx.AsyncClient
    transport = httpx.MockTransport(handler)
    monkeypatch.setattr(
        gpu_uz.httpx, "Client", lambda **kw: original_sync(transport=transport, **kw)
    )
    monkeypatch.setattr(
        gpu_uz.httpx,
        "AsyncClient",
        lambda **kw: original_async(transport=transport, **kw),
    )


def test_structured_generation_preserves_context_and_usage(monkeypatch):
    def handler(request):
        body = json.loads(request.content)
        assert request.headers["authorization"] == "Bearer private-test-key"
        assert body["model"] == "org/test-model"
        assert body["messages"] == [
            {"role": "system", "content": "Official criteria"},
            {"role": "user", "content": "Full task and full essay"},
        ]
        assert (
            body["response_format"]["json_schema"]["schema"]
            == Feedback.model_json_schema()
        )
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "finish_reason": "stop",
                        "message": {"content": '{"summary":"clear"}'},
                    }
                ],
                "usage": {
                    "prompt_tokens": 12,
                    "completion_tokens": 8,
                    "total_tokens": 20,
                },
            },
        )

    install_transport(monkeypatch, handler)
    usage = []
    result = generate_text_sync(
        config=config(),
        prompt="Full task and full essay",
        system_instruction="Official criteria",
        response_schema=Feedback,
        usage_collector=usage,
    )
    assert json.loads(result) == {"summary": "clear"}
    assert usage[0].total_tokens == 20
    assert usage[0].provider == AiProvider.GPU_UZ


@pytest.mark.parametrize(
    "choice",
    [
        {"finish_reason": "length", "message": {"content": '{"summary":"partial"}'}},
        {"finish_reason": "stop", "message": {"content": ""}},
        {"finish_reason": "stop", "message": {"content": "not JSON"}},
    ],
)
def test_rejects_incomplete_or_invalid_feedback(monkeypatch, choice):
    install_transport(
        monkeypatch, lambda _: httpx.Response(200, json={"choices": [choice]})
    )
    usage = []
    with pytest.raises(RuntimeError):
        generate_text_sync(
            config=config(),
            prompt="Essay",
            response_schema=Feedback,
            usage_collector=usage,
        )
    assert usage[0].status == "failed"


def test_auth_failure_not_retried_or_leaked(monkeypatch):
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(401, json={"error": "private-test-key echoed"})

    install_transport(monkeypatch, handler)
    with pytest.raises(RuntimeError, match="HTTP 401") as exc:
        generate_text_sync(config=config(), prompt="Essay")
    assert "private-test-key" not in str(exc.value)
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_model_discovery_preserves_exact_model_id(monkeypatch):
    install_transport(
        monkeypatch,
        lambda _: httpx.Response(
            200, json={"data": [{"id": "org/model", "max_model_len": 131072}]}
        ),
    )
    rows = await gpu_uz.list_models(api_key="key")
    assert rows[0]["model_id"] == "org/model"
    assert rows[0]["context_window"] == 131072
    assert not rows[0]["capabilities"]["vision"]
    result = await validate_provider_credentials(
        provider=AiProvider.GPU_UZ, api_key="key"
    )
    assert result["models_seen"] == 1


def test_retries_transient_response_once(monkeypatch):
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(503, text="unavailable")

    install_transport(monkeypatch, handler)
    monkeypatch.setattr(gpu_uz.time, "sleep", lambda _: None)
    with pytest.raises(RuntimeError, match="HTTP 503"):
        generate_text_sync(config=config(), prompt="Essay")
    assert len(calls) == 2


@pytest.mark.parametrize(
    "url",
    [
        "http://example.com/v1",
        "https://user:secret@example.com/v1",
        "https://example.com/v1?key=secret",
    ],
)
def test_insecure_urls_rejected(url):
    with pytest.raises(ValueError):
        gpu_uz.normalize_base_url(url)


@pytest.mark.asyncio
async def test_disabled_gpu_binding_does_not_silently_send_essay_to_google():
    from app.models.ai import AiProviderConfig
    from app.services.ai_config import (
        invalidate_ai_config_cache,
        resolve_ai_use_case_config,
    )

    provider_id, model_id = uuid4(), uuid4()
    binding = SimpleNamespace(
        provider_config_id=provider_id, provider_model_id=model_id
    )
    provider = SimpleNamespace(
        id=provider_id, provider=AiProvider.GPU_UZ, api_key="key", is_enabled=False
    )
    model = SimpleNamespace(
        id=model_id,
        provider_config_id=provider_id,
        is_selectable=True,
        is_accessible=True,
    )

    class Session:
        async def scalar(self, statement):
            return binding

        async def get(self, cls, identity):
            return provider if cls is AiProviderConfig else model

    invalidate_ai_config_cache()
    with pytest.raises(RuntimeError, match="GPU.uz binding is unavailable"):
        await resolve_ai_use_case_config(Session(), AiUseCase.WRITING_GRADER)
