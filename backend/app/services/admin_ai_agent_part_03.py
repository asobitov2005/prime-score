from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.admin_ai_agent_dependencies import *
from app.services.admin_ai_agent_part_01 import _build_section_paragraphs, _json_safe_value, _sanitize_plain_text, _sanitize_rich_text, _section_requires_paragraph_labels
from app.services.admin_ai_agent_part_02 import AiDraftPayloadInput, AiDraftQuestionGroupInput

class GetTestDraftArgs(BaseModel):
    test_id: str

class GetTestSnapshotArgs(BaseModel):
    test_id: str
    scope: Literal["full", "section"] = "full"
    mode: Literal["practice", "exam"] = "practice"

class SaveDraftArgs(BaseModel):
    draft: AiDraftPayloadInput
    test_id: str | None = None

class ValidateDraftArgs(BaseModel):
    draft: AiDraftPayloadInput

class FindQuestionGroupExamplesArgs(BaseModel):
    question_type: str
    test_type: Literal["reading", "listening"] | None = None
    published_only: bool = True
    limit: int = Field(default=3, ge=1, le=8)
    exclude_test_id: str | None = None

class CompareDraftWithExamplesArgs(BaseModel):
    draft: AiDraftPayloadInput
    published_only: bool = True
    limit_per_group: int = Field(default=2, ge=1, le=4)
    exclude_test_id: str | None = None

class QuickFixArgs(BaseModel):
    test_id: str
    draft: AiDraftPayloadInput

class PublishTestArgs(BaseModel):
    test_id: str

class DeleteDraftArgs(BaseModel):
    test_id: str

class EmptyToolArgs(BaseModel):
    pass

class AiToolDefinition:
    name: str
    description: str
    args_model: type[BaseModel]
    handler: Any

def _build_ai_draft_template(
    *,
    test_type: Literal["reading", "listening"] = "reading",
    title: str | None = None,
    access_type: Literal["public", "premium"] = "public",
) -> dict[str, Any]:
    section_label = "Passage 1" if test_type == "reading" else "Part 1"
    section_title = "Reading Passage 1" if test_type == "reading" else "Listening Part 1"
    return {
        "metadata": {
            "title": title or "",
            "type": test_type,
            "format": "full",
            "source": "custom",
            "source_detail": "",
            "access_type": access_type,
            "time_limit_label": "60 min exam" if test_type == "reading" else "Audio duration + 2 min",
        },
        "sections": [
            {
                "local_id": "section-1",
                "id": None,
                "label": section_label,
                "title": section_title,
                "subtitle": "",
                "content": "",
                "paragraphs": [],
                "show_labels": test_type == "reading",
                "media_kind": "text" if test_type == "reading" else "audio",
                "marker_count": 0,
            }
        ],
        "question_groups": [],
    }

def _admin_draft_to_ai_payload(draft: dict[str, Any]) -> dict[str, Any]:
    sections = []
    section_map: dict[str, str] = {}
    for section in draft.get("content", {}).get("sections", []):
        section_id = str(section["id"])
        section_map[section_id] = section_id
        sections.append(
            {
                "local_id": section_id,
                "id": section_id,
                "label": section["label"],
                "title": section["title"],
                "subtitle": section["subtitle"],
                "content": section["content"],
                "paragraphs": section.get("paragraphs", []),
                "show_labels": bool(section.get("showLabels", False)),
                "media_kind": section["media_kind"],
                "marker_count": int(section.get("marker_count", 0)),
            }
        )

    groups = []
    for group in draft.get("questionGroups", []):
        groups.append(
            {
                "id": str(group["id"]),
                "section_local_id": section_map.get(str(group["section_id"]), str(group["section_id"])),
                "title": group["title"],
                "instructions": group["instructions"],
                "type_id": group["type_id"],
                "question_start": group["question_start"],
                "question_end": group["question_end"],
                "shared_options": list(group.get("shared_options", [])),
                "question_block": group.get("question_block", ""),
                "answer_block": group.get("answer_block", ""),
                "secondary_block": group.get("secondary_block", ""),
                "diagram_title": group.get("diagram_title", ""),
                "diagram_image_url": group.get("diagram_image_url", ""),
                "questions": [
                    {
                        "id": str(question["id"]) if question.get("id") else None,
                        "label": question["label"],
                        "prompt": question["prompt"],
                        "accepted_answers": list(question.get("accepted_answers", [])),
                        "explanation": question.get("explanation", ""),
                        "variants": list(question.get("variants", [])),
                    }
                    for question in group.get("questions", [])
                ],
            }
        )

    metadata = draft["metadata"]
    return {
        "metadata": {
            "title": metadata["title"],
            "type": metadata["type"],
            "format": metadata.get("format", "full"),
            "source": metadata["source"],
            "source_detail": metadata.get("source_detail", ""),
            "access_type": metadata["access_type"],
            "time_limit_label": metadata["time_limit_label"],
        },
        "sections": sections,
        "question_groups": groups,
    }

def _ai_payload_to_backend_draft(payload: AiDraftPayloadInput) -> dict[str, Any]:
    groups_by_section: dict[str, list[AiDraftQuestionGroupInput]] = {}
    for group in payload.question_groups:
        groups_by_section.setdefault(group.section_local_id, []).append(group)

    section_uuid_map: dict[str, str] = {}
    section_rows = []
    for index, section in enumerate(payload.sections, start=1):
        raw_id = section.id or section.local_id or f"section-{index}"
        section_uuid_map[section.local_id] = raw_id
        recommended_show_labels = _section_requires_paragraph_labels(
            [group.type_id for group in groups_by_section.get(section.local_id, [])]
        )
        normalized_paragraphs = _build_section_paragraphs(
            content=section.content,
            paragraphs=section.paragraphs,
            show_labels=recommended_show_labels,
        )
        section_rows.append(
            {
                "id": raw_id,
                "label": _sanitize_plain_text(section.label),
                "title": _sanitize_plain_text(section.title),
                "subtitle": _sanitize_rich_text(section.subtitle),
                "content": _sanitize_rich_text(section.content),
                "paragraphs": _json_safe_value(normalized_paragraphs),
                "showLabels": recommended_show_labels,
                "media_kind": section.media_kind,
                "marker_count": section.marker_count,
            }
        )

    group_rows = []
    for group in payload.question_groups:
        section_ref = section_uuid_map.get(group.section_local_id)
        if section_ref is None:
            raise ValueError(f"Unknown section_local_id: {group.section_local_id}")
        group_rows.append(
            {
                "id": group.id,
                "section_id": section_ref,
                "title": _sanitize_plain_text(group.title),
                "instructions": _sanitize_rich_text(group.instructions),
                "type_id": group.type_id,
                "question_start": group.question_start,
                "question_end": group.question_end,
                "shared_options": [_sanitize_plain_text(option) for option in group.shared_options],
                "question_block": _sanitize_rich_text(group.question_block),
                "answer_block": _sanitize_rich_text(group.answer_block),
                "secondary_block": _sanitize_rich_text(group.secondary_block),
                "diagram_title": _sanitize_plain_text(group.diagram_title),
                "diagram_image_url": group.diagram_image_url.strip(),
                "questions": [
                    {
                        "id": question.id,
                        "label": _sanitize_plain_text(question.label),
                        "prompt": _sanitize_rich_text(question.prompt),
                        "accepted_answers": [_sanitize_plain_text(answer) for answer in question.accepted_answers],
                        "explanation": _sanitize_rich_text(question.explanation),
                        "variants": [_sanitize_plain_text(option) for option in question.variants],
                    }
                    for question in group.questions
                ],
            }
        )

    backend_payload = {
        "metadata": payload.metadata.model_dump(),
        "content": section_rows,
        "question_groups": group_rows,
    }
    AdminTestDraftUpsertRequest.model_validate(backend_payload)
    return backend_payload

def _map_thread_summary(thread: AdminAiThread) -> dict[str, Any]:
    return {
        "id": thread.id,
        "title": thread.title,
        "summary": thread.summary,
        "provider": thread.provider,
        "model_name": thread.model_name,
        "task_kind": thread.task_kind,
        "status": thread.status.value,
        "last_job_status": thread.last_job_status.value if thread.last_job_status else None,
        "updated_at": thread.updated_at,
        "created_at": thread.created_at,
    }

def _map_message(message: AdminAiMessage) -> dict[str, Any]:
    return {
        "id": message.id,
        "thread_id": message.thread_id,
        "role": message.role.value,
        "content": message.content,
        "tool_calls": list(message.tool_calls or []),
        "created_at": message.created_at,
    }
