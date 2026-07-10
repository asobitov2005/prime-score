from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.admin_ai_agent_dependencies import *
from app.services.admin_ai_agent_part_01 import _now
from app.services.admin_ai_agent_part_02 import GetDraftTemplateArgs, ListQuestionTypesArgs, ListTestsArgs, _compare_group_against_examples, _load_question_group_examples
from app.services.admin_ai_agent_part_03 import AiToolDefinition, CompareDraftWithExamplesArgs, DeleteDraftArgs, EmptyToolArgs, FindQuestionGroupExamplesArgs, GetTestDraftArgs, GetTestSnapshotArgs, PublishTestArgs, QuickFixArgs, SaveDraftArgs, ValidateDraftArgs, _ai_payload_to_backend_draft
from app.services.admin_ai_agent_part_05 import _tool_find_question_group_examples, _tool_get_builder_rules, _tool_get_draft_template, _tool_get_test_draft, _tool_get_test_snapshot, _tool_list_question_types, _tool_list_tests, _tool_validate_draft

async def _tool_compare_draft_with_examples(session: AsyncSession, args: CompareDraftWithExamplesArgs) -> dict[str, Any]:
    comparisons: list[dict[str, Any]] = []
    section_map = {section.local_id: section for section in args.draft.sections}
    for group in args.draft.question_groups:
        section = section_map.get(group.section_local_id)
        if section is None:
            comparisons.append(
                {
                    "section_local_id": group.section_local_id,
                    "group_title": group.title,
                    "type_id": group.type_id,
                    "issues": [f"Unknown section_local_id '{group.section_local_id}'."],
                    "examples": [],
                }
            )
            continue
        examples = await _load_question_group_examples(
            session,
            question_type=group.type_id,
            test_type=args.draft.metadata.type,
            published_only=args.published_only,
            limit=args.limit_per_group,
            exclude_test_id=args.exclude_test_id,
        )
        comparisons.append(
            _compare_group_against_examples(
                section=section,
                group=group,
                examples=examples,
            )
        )
    return {
        "comparisons": comparisons,
    }

async def _tool_save_test_draft(session: AsyncSession, args: SaveDraftArgs) -> dict[str, Any]:
    payload = _ai_payload_to_backend_draft(args.draft)
    saved = await save_test_draft_to_db(session, draft=payload, test_id=UUID(args.test_id) if args.test_id else None)
    return {
        "saved_test": {
            "id": str(saved["id"]),
            "title": saved["title"],
            "status": saved["status"],
            "version": saved["version"],
            "review_status": saved["review_status"],
        }
    }

async def _tool_quick_fix_published_test(session: AsyncSession, args: QuickFixArgs) -> dict[str, Any]:
    payload = _ai_payload_to_backend_draft(args.draft)
    saved = await quick_fix_published_test_in_db(session, draft=payload, test_id=UUID(args.test_id))
    if saved is None:
        raise ValueError("Quick fix failed.")
    return {
        "quick_fixed_test": {
            "id": str(saved["id"]),
            "title": saved["title"],
            "status": saved["status"],
            "version": saved["version"],
            "review_status": saved["review_status"],
        }
    }

async def _tool_publish_test(session: AsyncSession, args: PublishTestArgs) -> dict[str, Any]:
    saved = await publish_test_in_db(session, test_id=UUID(args.test_id))
    if saved is None:
        raise ValueError("Publish failed.")
    return {
        "published_test": {
            "id": str(saved["id"]),
            "title": saved["title"],
            "status": saved["status"],
            "version": saved["version"],
            "review_status": saved["review_status"],
        }
    }

async def _tool_delete_draft_test(session: AsyncSession, args: DeleteDraftArgs) -> dict[str, Any]:
    result = await delete_draft_test_from_db(session, test_id=UUID(args.test_id))
    return {"result": result}

TOOL_REGISTRY: dict[str, AiToolDefinition] = {
    "get_builder_rules": AiToolDefinition(
        name="get_builder_rules",
        description="Get builder rules.",
        args_model=EmptyToolArgs,
        handler=_tool_get_builder_rules,
    ),
    "get_draft_template": AiToolDefinition(
        name="get_draft_template",
        description="Get a draft template.",
        args_model=GetDraftTemplateArgs,
        handler=_tool_get_draft_template,
    ),
    "list_question_types": AiToolDefinition(
        name="list_question_types",
        description="List supported question types.",
        args_model=ListQuestionTypesArgs,
        handler=_tool_list_question_types,
    ),
    "list_tests": AiToolDefinition(
        name="list_tests",
        description="List tests from the DB.",
        args_model=ListTestsArgs,
        handler=_tool_list_tests,
    ),
    "get_test_draft": AiToolDefinition(
        name="get_test_draft",
        description="Inspect an existing draft.",
        args_model=GetTestDraftArgs,
        handler=_tool_get_test_draft,
    ),
    "get_test_snapshot": AiToolDefinition(
        name="get_test_snapshot",
        description="Inspect user-facing snapshot shape.",
        args_model=GetTestSnapshotArgs,
        handler=_tool_get_test_snapshot,
    ),
    "find_question_group_examples": AiToolDefinition(
        name="find_question_group_examples",
        description="Inspect similar question groups from DB.",
        args_model=FindQuestionGroupExamplesArgs,
        handler=_tool_find_question_group_examples,
    ),
    "validate_draft": AiToolDefinition(
        name="validate_draft",
        description="Validate a draft before save.",
        args_model=ValidateDraftArgs,
        handler=_tool_validate_draft,
    ),
    "compare_draft_with_examples": AiToolDefinition(
        name="compare_draft_with_examples",
        description="Compare a draft against DB examples.",
        args_model=CompareDraftWithExamplesArgs,
        handler=_tool_compare_draft_with_examples,
    ),
    "save_test_draft": AiToolDefinition(
        name="save_test_draft",
        description="Create/update a draft.",
        args_model=SaveDraftArgs,
        handler=_tool_save_test_draft,
    ),
    "quick_fix_published_test": AiToolDefinition(
        name="quick_fix_published_test",
        description="Apply a quick fix.",
        args_model=QuickFixArgs,
        handler=_tool_quick_fix_published_test,
    ),
    "publish_test": AiToolDefinition(
        name="publish_test",
        description="Publish a test.",
        args_model=PublishTestArgs,
        handler=_tool_publish_test,
    ),
    "delete_draft_test": AiToolDefinition(
        name="delete_draft_test",
        description="Delete a draft test.",
        args_model=DeleteDraftArgs,
        handler=_tool_delete_draft_test,
    ),
}

async def _append_tool_trace_item(
    session: AsyncSession,
    *,
    job: AdminAiJob,
    name: str,
    arguments: dict[str, Any],
) -> dict[str, Any]:
    trace = copy.deepcopy(list(job.tool_trace or []))
    item = {
        "id": str(uuid4()),
        "name": name,
        "status": "running",
        "arguments": arguments,
        "result_preview": None,
        "error": None,
        "created_at": _now().isoformat(),
        "completed_at": None,
    }
    trace.append(item)
    job.tool_trace = trace
    job.updated_at = _now()
    await session.commit()
    return item

async def _append_tool_trace_item_for_job(
    *,
    job_id: UUID,
    name: str,
    arguments: dict[str, Any],
) -> dict[str, Any]:
    session_maker = get_session_maker()
    async with session_maker() as session:
        job = await session.get(AdminAiJob, job_id)
        if job is None:
            raise RuntimeError("Admin AI job not found while appending tool trace.")
        return await _append_tool_trace_item(session, job=job, name=name, arguments=arguments)

async def _finish_tool_trace_item(
    session: AsyncSession,
    *,
    job: AdminAiJob,
    trace_id: str,
    status: Literal["completed", "failed"],
    result_preview: str | None = None,
    error: str | None = None,
) -> None:
    trace = copy.deepcopy(list(job.tool_trace or []))
    for item in trace:
        if item.get("id") == trace_id:
            item["status"] = status
            item["result_preview"] = result_preview
            item["error"] = error
            item["completed_at"] = _now().isoformat()
            break
    job.tool_trace = trace
    job.updated_at = _now()
    await session.commit()

async def _finish_tool_trace_item_for_job(
    *,
    job_id: UUID,
    trace_id: str,
    status: Literal["completed", "failed"],
    result_preview: str | None = None,
    error: str | None = None,
) -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        job = await session.get(AdminAiJob, job_id)
        if job is None:
            return
        await _finish_tool_trace_item(
            session,
            job=job,
            trace_id=trace_id,
            status=status,
            result_preview=result_preview,
            error=error,
        )

def _message_history_to_contents(messages: list[AdminAiMessage]) -> list[Any]:
    contents: list[Any] = []
    for message in messages:
        if not message.content.strip():
            continue
        if str((message.extra_payload or {}).get("kind") or "") == "status_update":
            continue
        part = genai_types.Part(text=message.content)
        if message.role == AdminAiMessageRole.USER:
            contents.append(genai_types.UserContent(parts=[part]))
        else:
            contents.append(genai_types.ModelContent(parts=[part]))
    return contents
