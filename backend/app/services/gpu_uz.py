"""Bounded, secret-safe transport for GPU.uz's OpenAI-compatible API."""

from __future__ import annotations

import json
import time
from types import SimpleNamespace
from typing import Any
from urllib.parse import urlsplit

import httpx

DEFAULT_BASE_URL = "https://aisha-llmv1.inference.gpu.uz/v1"
RETRYABLE_STATUS = {429, 502, 503, 504}


def to_json_schema(value: Any) -> dict[str, Any]:
    # A Pydantic schema *instance* (Google Schema) is not a response model class.
    if isinstance(value, type) and hasattr(value, "model_json_schema"):
        value = value.model_json_schema()
    elif hasattr(value, "model_dump"):
        value = value.model_dump(mode="json", by_alias=True, exclude_none=True)
    if not isinstance(value, dict):
        raise ValueError("GPU.uz structured output requires a JSON schema object.")

    def convert(node: Any) -> Any:
        if isinstance(node, list):
            return [convert(item) for item in node]
        if not isinstance(node, dict):
            return node
        result = {}
        for key, item in node.items():
            if key in {"propertyOrdering", "property_ordering", "nullable"}:
                continue
            if key == "type" and isinstance(item, str):
                result[key] = item.lower()
            elif key in {"properties", "$defs", "definitions"} and isinstance(
                item, dict
            ):
                result[key] = {name: convert(schema) for name, schema in item.items()}
            elif key in {"items", "anyOf", "allOf", "oneOf", "additionalProperties"}:
                result[key] = convert(item)
            else:
                result[key] = item
        if node.get("nullable"):
            return {"anyOf": [result, {"type": "null"}]}
        return result

    return convert(value)


def normalize_base_url(value: str | None) -> str:
    base = (value or DEFAULT_BASE_URL).strip().rstrip("/")
    parsed = urlsplit(base)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError(
            "GPU.uz base URL must be HTTPS without credentials, query or fragment."
        )
    return base


def _headers(api_key: str) -> dict[str, str]:
    if not api_key.strip():
        raise ValueError("GPU.uz API key is required.")
    return {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json",
    }


def _decode(response: httpx.Response) -> dict[str, Any]:
    if not response.is_success:
        # Provider error bodies may echo prompts or credentials; never persist them.
        raise RuntimeError(f"GPU.uz request failed (HTTP {response.status_code}).")
    try:
        payload = response.json()
    except ValueError:
        raise RuntimeError("GPU.uz returned an invalid JSON response.") from None
    if not isinstance(payload, dict):
        raise RuntimeError("GPU.uz returned an invalid response object.")
    return payload


async def list_models(
    *, api_key: str, base_url: str | None = None
) -> list[dict[str, Any]]:
    url = normalize_base_url(base_url) + "/models"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(20, connect=10)) as client:
            response = await client.get(url, headers=_headers(api_key))
        payload = _decode(response)
    except httpx.HTTPError:
        raise RuntimeError(
            "GPU.uz model discovery could not connect within its timeout."
        ) from None
    data = payload.get("data")
    if not isinstance(data, list):
        raise RuntimeError("GPU.uz model discovery returned an invalid model list.")
    rows = []
    for item in data:
        if (
            not isinstance(item, dict)
            or not isinstance(item.get("id"), str)
            or not item["id"]
        ):
            raise RuntimeError(
                "GPU.uz model discovery returned an invalid model record."
            )
        context = item.get("max_model_len") or item.get("context_window")
        rows.append(
            {
                "model_id": item["id"],
                "display_name": item.get("display_name") or item["id"],
                "context_window": context
                if isinstance(context, int) and context > 0
                else None,
                # Only the text endpoint is integrated, regardless of model-name claims.
                "capabilities": {
                    "generate_content": True,
                    "vision": False,
                    "audio_input": False,
                    "audio_output": False,
                },
                "is_accessible": True,
                "is_selectable": True,
            }
        )
    return rows


def generate_completion(
    *,
    api_key: str,
    base_url: str | None,
    model: str,
    messages: list[dict[str, str]],
    max_tokens: int,
    temperature: float,
    top_p: float,
    response_schema: Any = None,
    json_mode: bool = False,
    seed: int | None = None,
    timeout_seconds: float = 120,
) -> SimpleNamespace:
    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "top_p": top_p,
    }
    if response_schema is not None:
        schema = to_json_schema(response_schema)
        body["response_format"] = {
            "type": "json_schema",
            "json_schema": {
                "name": "writing_response",
                "schema": schema,
            },
        }
    elif json_mode:
        body["response_format"] = {"type": "json_object"}
    if seed is not None:
        body["seed"] = seed
    url = normalize_base_url(base_url) + "/chat/completions"
    timeout = max(5, min(float(timeout_seconds), 180))
    try:
        with httpx.Client(timeout=httpx.Timeout(timeout, connect=10)) as client:
            for attempt in range(2):
                response = client.post(url, headers=_headers(api_key), json=body)
                if response.status_code not in RETRYABLE_STATUS or attempt == 1:
                    break
                time.sleep(1)
        payload = _decode(response)
    except httpx.HTTPError:
        # Do not retry ambiguous read timeouts: inference may already have completed.
        raise RuntimeError("GPU.uz inference connection failed or timed out.") from None
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
        raise RuntimeError("GPU.uz returned no completion.")
    choice = choices[0]
    if choice.get("finish_reason") != "stop":
        raise RuntimeError(
            "GPU.uz did not finish its response; incomplete feedback was rejected."
        )
    message = choice.get("message")
    content = message.get("content") if isinstance(message, dict) else None
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("GPU.uz returned empty feedback.")
    if json_mode or response_schema is not None:
        try:
            json.loads(content)
        except ValueError:
            raise RuntimeError("GPU.uz returned invalid structured feedback.") from None
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))],
        usage=payload.get("usage"),
    )
