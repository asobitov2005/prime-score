from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.models.enums import AiProvider, AiUseCase
from app.services.ai_config import ResolvedAiUseCaseConfig, supports_use_case_binding, validate_provider_credentials
from app.services.ai_generation import generate_text_sync


class _FakeGroqClient:
    def __init__(self, **kwargs: object) -> None:
        self.kwargs = kwargs
        self.models = SimpleNamespace(list=self._list_models)
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create_completion))
        self._created_kwargs: dict[str, object] | None = None

    def _list_models(self) -> SimpleNamespace:
        return SimpleNamespace(data=[SimpleNamespace(id="openai/gpt-oss-20b"), SimpleNamespace(id="whisper-large-v3")])

    def _create_completion(self, **kwargs: object) -> SimpleNamespace:
        self._created_kwargs = kwargs
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content="  trimmed reply  "))])


def test_groq_supports_text_only_bindings() -> None:
    assert not supports_use_case_binding({}, AiUseCase.ADMIN_CHAT, AiProvider.GROQ)
    assert supports_use_case_binding({}, AiUseCase.WRITING_GRADER, AiProvider.GROQ)
    assert not supports_use_case_binding({"vision": True}, AiUseCase.WRITING_IMAGE_SUMMARY, AiProvider.GROQ)


@pytest.mark.asyncio
async def test_groq_validate_and_generate(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_client = _FakeGroqClient(api_key="test-key", base_url="https://api.groq.com/openai/v1")
    monkeypatch.setattr("app.services.ai_config.Groq", _FakeGroqClient)
    monkeypatch.setattr("app.services.ai_generation.build_groq_client", lambda config: fake_client)

    validation = await validate_provider_credentials(provider=AiProvider.GROQ, api_key="test-key")
    assert validation["ok"] is True
    assert validation["models_seen"] == 2

    result = generate_text_sync(
        config=ResolvedAiUseCaseConfig(
            use_case=AiUseCase.WRITING_GRADER,
            provider=AiProvider.GROQ,
            provider_config_id=None,
            provider_label="Groq",
            api_key="test-key",
            base_url=None,
            model_id="openai/gpt-oss-20b",
            model_record_id=None,
            settings_json={},
        ),
        prompt="Return a short JSON object.",
        response_mime_type="application/json",
        max_output_tokens=256,
        seed=7,
    )

    assert result == "trimmed reply"
    assert fake_client._created_kwargs is not None
    assert fake_client._created_kwargs["max_completion_tokens"] == 256
    assert "response_format" in fake_client._created_kwargs
    assert fake_client._created_kwargs["response_format"] == {"type": "json_object"}
