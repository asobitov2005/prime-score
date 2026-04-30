from types import SimpleNamespace

from app.models.enums import AdminAiMessageRole
from app.services.admin_ai_agent import (
    _build_generation_config,
    _contains_unsupported_html_markup,
    _max_tool_loops,
    _message_history_to_contents,
    _sanitize_rich_text,
    _tool_declarations,
)


def test_generation_config_enables_server_side_tool_invocations() -> None:
    config = _build_generation_config(_tool_declarations())
    payload = config.model_dump(by_alias=True, exclude_none=True)

    assert payload["toolConfig"]["includeServerSideToolInvocations"] is True


def test_message_history_skips_status_updates() -> None:
    messages = [
        SimpleNamespace(
            content="User prompt",
            extra_payload={},
            role=AdminAiMessageRole.USER,
        ),
        SimpleNamespace(
            content="Internal status",
            extra_payload={"kind": "status_update"},
            role=AdminAiMessageRole.ASSISTANT,
        ),
        SimpleNamespace(
            content="Final answer",
            extra_payload={},
            role=AdminAiMessageRole.ASSISTANT,
        ),
    ]

    contents = _message_history_to_contents(messages)

    assert len(contents) == 2


def test_max_tool_loops_is_generous() -> None:
    assert _max_tool_loops() >= 80


def test_sanitize_rich_text_preserves_supported_passage_markers() -> None:
    value = "{<i><c>Passage heading}"

    assert _sanitize_rich_text(value) == value
    assert _contains_unsupported_html_markup(value) is False


def test_sanitize_rich_text_strips_unsupported_html_tags() -> None:
    value = "<p><b>Title</b></p>\n<i>Keep this"

    assert _sanitize_rich_text(value) == "Title\n<i>Keep this"
    assert _contains_unsupported_html_markup(value) is True
