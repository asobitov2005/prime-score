from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.admin_ai_agent_dependencies import *
from app.services.admin_ai_agent_part_01 import _draft_quality_report, _now
from app.services.admin_ai_agent_part_02 import GetDraftTemplateArgs, ListQuestionTypesArgs, ListTestsArgs, _builder_rules, _load_question_group_examples, _question_type_definitions
from app.services.admin_ai_agent_part_03 import CompareDraftWithExamplesArgs, DeleteDraftArgs, EmptyToolArgs, FindQuestionGroupExamplesArgs, GetTestDraftArgs, GetTestSnapshotArgs, PublishTestArgs, QuickFixArgs, SaveDraftArgs, ValidateDraftArgs, _admin_draft_to_ai_payload, _build_ai_draft_template

def get_admin_ai_config() -> dict[str, Any]:
    settings = get_settings()
    return {
        "provider": "gemini",
        "model_name": settings.gemini_model,
        "has_api_key": bool((settings.gemini_api_key or "").strip()),
        "background_supported": True,
        "context_window_tokens": 1_048_576,
        "notes": [
            "Tasks are persisted in the database and run through Celery workers after the page closes.",
            "Multiple admin AI jobs can run in parallel when worker concurrency is available.",
            "Raw hidden model reasoning is not exposed; tool trace and activity timeline are shown instead.",
            "The chat includes concise job-status updates while long tool chains are running.",
            "Configure GEMINI_API_KEY in backend/.env before sending live jobs.",
        ],
    }

async def archive_admin_ai_thread(session: AsyncSession, *, admin_id: UUID, thread_id: UUID) -> bool:
    thread = await session.get(AdminAiThread, thread_id)
    if thread is None or thread.admin_id != admin_id:
        return False
    thread.status = AdminAiThreadStatus.ARCHIVED
    thread.updated_at = _now()
    await session.commit()
    return True

def _thinking_level() -> genai_types.ThinkingLevel:
    value = (get_settings().gemini_thinking_level or "HIGH").strip().upper()
    return {
        "MINIMAL": genai_types.ThinkingLevel.MINIMAL,
        "LOW": genai_types.ThinkingLevel.LOW,
        "MEDIUM": genai_types.ThinkingLevel.MEDIUM,
        "HIGH": genai_types.ThinkingLevel.HIGH,
    }.get(value, genai_types.ThinkingLevel.HIGH)

def _max_tool_loops() -> int:
    return max(10, int(get_settings().gemini_max_tool_loops or 80))

def _build_gemini_client(resolved_config: "ResolvedAiUseCaseConfig") -> genai.Client:
    # Honour Vertex AI (service-account) auth when enabled; the AI Studio API
    # key path fails in production where the key's project is denied access.
    return build_google_client(resolved_config)

def _build_generation_config(tool_declarations: list[genai_types.FunctionDeclaration]) -> genai_types.GenerateContentConfig:
    return genai_types.GenerateContentConfig(
        systemInstruction=(
            "You are PrimeScore Admin AI. Your job is to help admins inspect, author, normalize, save, quick-fix, and publish IELTS tests using the provided tools. "
            "Use tools aggressively before making structural assumptions. Save new content as draft first unless the admin clearly asks to publish. "
            "Before adding or changing question groups, inspect existing DB examples with find_question_group_examples or get_test_draft. "
            "Before saving, run validate_draft and compare_draft_with_examples so you check and compare the full structure. "
            "Use Google Search grounding when the admin asks for current facts, real-world references, recent examples, or anything that may have changed recently. "
            "Never invent unsupported question types or fields. Respect builder rules and numbering constraints. "
            "PrimeScore reading content supports styling markers like { }, <i>, and <c>; preserve those markers when the admin uses them. "
            "Do not write unsupported HTML tags like <b>, <p>, or similar markup into saved draft content."
        ),
        temperature=0.1,
        maxOutputTokens=8192,
        tools=[
            genai_types.Tool(functionDeclarations=tool_declarations),
            genai_types.Tool(googleSearch=genai_types.GoogleSearch()),
        ],
        toolConfig=genai_types.ToolConfig(
            include_server_side_tool_invocations=True,
            functionCallingConfig=genai_types.FunctionCallingConfig(
                mode=genai_types.FunctionCallingConfigMode.AUTO,
            )
        ),
        automaticFunctionCalling=genai_types.AutomaticFunctionCallingConfig(disable=True),
        thinkingConfig=genai_types.ThinkingConfig(
            thinkingLevel=_thinking_level(),
        ),
    )

def _tool_declarations() -> list[genai_types.FunctionDeclaration]:
    return [
        genai_types.FunctionDeclaration(
            name="get_builder_rules",
            description="Get the current PrimeScore builder rules and important authoring constraints.",
            parametersJsonSchema={"type": "object", "properties": {}, "additionalProperties": False},
        ),
        genai_types.FunctionDeclaration(
            name="get_draft_template",
            description="Get a minimal draft template for a reading or listening test in the saveable PrimeScore shape.",
            parametersJsonSchema=GetDraftTemplateArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="list_question_types",
            description="List supported PrimeScore question types and their short descriptions.",
            parametersJsonSchema=ListQuestionTypesArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="list_tests",
            description="Search recent tests already stored in the database.",
            parametersJsonSchema=ListTestsArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="get_test_draft",
            description="Fetch a stored test as an AI-friendly draft payload for inspection or editing.",
            parametersJsonSchema=GetTestDraftArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="get_test_snapshot",
            description="Fetch the stored user-facing snapshot shape used by practice/exam views.",
            parametersJsonSchema=GetTestSnapshotArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="find_question_group_examples",
            description="Read matching question group examples from DB so the model can compare against published patterns before editing questions.",
            parametersJsonSchema=FindQuestionGroupExamplesArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="validate_draft",
            description="Check a draft for structure, numbering, placeholder text, label usage, and save-readiness.",
            parametersJsonSchema=ValidateDraftArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="compare_draft_with_examples",
            description="Compare every draft question group against similar DB examples and report structural mismatches.",
            parametersJsonSchema=CompareDraftWithExamplesArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="save_test_draft",
            description="Create a new draft or replace an existing draft with a complete payload.",
            parametersJsonSchema=SaveDraftArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="quick_fix_published_test",
            description="Apply an in-place metadata/content quick-fix to a published test without a structural rewrite.",
            parametersJsonSchema=QuickFixArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="publish_test",
            description="Publish a draft test after it is ready.",
            parametersJsonSchema=PublishTestArgs.model_json_schema(),
        ),
        genai_types.FunctionDeclaration(
            name="delete_draft_test",
            description="Delete or archive a draft test.",
            parametersJsonSchema=DeleteDraftArgs.model_json_schema(),
        ),
    ]

async def _tool_get_builder_rules(session: AsyncSession, args: EmptyToolArgs) -> dict[str, Any]:
    _ = (session, args)
    return {
        "builder_rules": _builder_rules(),
    }

async def _tool_get_draft_template(session: AsyncSession, args: GetDraftTemplateArgs) -> dict[str, Any]:
    _ = session
    return {
        "draft_template": _build_ai_draft_template(
            test_type=args.test_type,
            title=args.title,
            access_type=args.access_type,
        )
    }

async def _tool_list_question_types(session: AsyncSession, args: ListQuestionTypesArgs) -> dict[str, Any]:
    _ = session
    rows = _question_type_definitions()
    if args.test_type != "all":
        prefix = f"{args.test_type}_"
        rows = [row for row in rows if row["id"].startswith(prefix)]
    return {
        "question_types": rows,
        "builder_rules": _builder_rules(),
    }

async def _tool_list_tests(session: AsyncSession, args: ListTestsArgs) -> dict[str, Any]:
    items = await list_tests_from_db(
        session,
        test_type=TestType(args.test_type) if args.test_type else None,
        status_filter=TestStatus(args.status) if args.status else None,
    )
    query = (args.query or "").strip().lower()
    if query:
        items = [
            item for item in items
            if query in str(item.get("title", "")).lower() or query in str(item.get("source_detail", "")).lower()
        ]
    items = items[: args.limit]
    return {
        "tests": [
            {
                "id": str(item["id"]),
                "title": item["title"],
                "test_type": item["test_type"],
                "format": item.get("format", "full"),
                "source": item["source"],
                "source_detail": item.get("source_detail", ""),
                "access_type": item["access_type"],
                "status": item["status"],
                "review_status": item.get("review_status", "needs_review"),
                "total_questions": item.get("total_questions", 0),
                "version": item.get("version", 1),
                "updated_at": item.get("updated_at"),
            }
            for item in items
        ]
    }

async def _tool_get_test_draft(session: AsyncSession, args: GetTestDraftArgs) -> dict[str, Any]:
    draft = await build_admin_draft_state_from_db(session, test_id=UUID(args.test_id))
    if draft is None:
        raise ValueError("Test draft not found.")
    return {
        "draft": _admin_draft_to_ai_payload(draft),
    }

async def _tool_get_test_snapshot(session: AsyncSession, args: GetTestSnapshotArgs) -> dict[str, Any]:
    snapshot = await build_test_snapshot_from_db(
        session,
        test_id=UUID(args.test_id),
        scope=TestScope(args.scope),
        mode=TestMode(args.mode),
    )
    if snapshot is None:
        raise ValueError("Test snapshot not found.")
    return {"snapshot": snapshot}

async def _tool_find_question_group_examples(session: AsyncSession, args: FindQuestionGroupExamplesArgs) -> dict[str, Any]:
    examples = await _load_question_group_examples(
        session,
        question_type=args.question_type,
        test_type=args.test_type,
        published_only=args.published_only,
        limit=args.limit,
        exclude_test_id=args.exclude_test_id,
    )
    return {
        "question_type": args.question_type,
        "examples": examples,
        "count": len(examples),
    }

async def _tool_validate_draft(session: AsyncSession, args: ValidateDraftArgs) -> dict[str, Any]:
    _ = session
    report = _draft_quality_report(args.draft)
    return {
        "validation": report,
    }
