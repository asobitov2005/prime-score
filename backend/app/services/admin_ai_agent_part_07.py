from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.admin_ai_agent_dependencies import *
from app.services.admin_ai_agent_part_01 import _DB_INSPECTION_TOOL_NAMES, _draft_quality_report, _json_preview, _single_line
from app.services.admin_ai_agent_part_02 import AiDraftPayloadInput
from app.services.admin_ai_agent_part_03 import AiToolDefinition, EmptyToolArgs
from app.services.admin_ai_agent_part_04 import append_admin_ai_status_message

def _build_tool_args(tool: AiToolDefinition, raw_args: dict[str, Any] | None) -> BaseModel:
    payload = raw_args or {}
    if tool.args_model is EmptyToolArgs:
        return EmptyToolArgs()
    return tool.args_model.model_validate(payload)

def _tool_plan_line(name: str, args: dict[str, Any]) -> str:
    if name == "list_tests":
        parts = []
        if args.get("status"):
            parts.append(str(args["status"]))
        if args.get("test_type"):
            parts.append(str(args["test_type"]))
        qualifier = " ".join(parts).strip()
        limit = args.get("limit")
        return f"Search {qualifier or 'recent'} tests" + (f" (limit {limit})" if limit else "")
    if name == "get_test_draft":
        return f"Open draft {str(args.get('test_id') or '').strip()}"
    if name == "get_test_snapshot":
        return f"Open snapshot {str(args.get('test_id') or '').strip()}"
    if name == "find_question_group_examples":
        return f"Load DB examples for `{args.get('question_type')}`"
    if name == "validate_draft":
        return "Validate numbering, placeholders, and structure"
    if name == "compare_draft_with_examples":
        return "Compare the draft against existing DB examples"
    if name == "save_test_draft":
        draft = args.get("draft") or {}
        metadata = draft.get("metadata") if isinstance(draft, dict) else {}
        title = _single_line(str((metadata or {}).get("title") or "updated draft"))
        return f"Save draft: {title[:90]}"
    if name == "quick_fix_published_test":
        return f"Quick-fix published test {str(args.get('test_id') or '').strip()}"
    if name == "publish_test":
        return f"Publish test {str(args.get('test_id') or '').strip()}"
    if name == "list_question_types":
        return f"Load supported question types for `{args.get('test_type') or 'all'}`"
    if name == "get_builder_rules":
        return "Load PrimeScore builder rules"
    return f"Run `{name}` with {_json_preview(args, limit=120)}"

def _tool_result_line(name: str, result: dict[str, Any]) -> str:
    if name == "list_tests":
        tests = list(result.get("tests") or [])
        titles = [_single_line(str(item.get("title") or "")) for item in tests[:3] if item.get("title")]
        suffix = f" Top matches: {', '.join(titles)}." if titles else ""
        return f"Found {len(tests)} test(s).{suffix}"
    if name == "get_test_draft":
        draft = result.get("draft") or {}
        metadata = draft.get("metadata") or {}
        sections = list(draft.get("sections") or [])
        groups = list(draft.get("question_groups") or [])
        title = _single_line(str(metadata.get("title") or "Untitled draft"))
        return f"Loaded draft `{title}` with {len(sections)} section(s) and {len(groups)} group(s)."
    if name == "get_test_snapshot":
        snapshot = result.get("snapshot") or {}
        sections = list(snapshot.get("sections") or [])
        return f"Loaded snapshot with {len(sections)} section(s)."
    if name == "find_question_group_examples":
        examples = list(result.get("examples") or [])
        return f"Loaded {len(examples)} example group(s) for `{result.get('question_type')}`."
    if name == "validate_draft":
        validation = result.get("validation") or {}
        errors = list(validation.get("errors") or [])
        warnings = list(validation.get("warnings") or [])
        if errors:
            return f"Validation found {len(errors)} error(s) and {len(warnings)} warning(s)."
        return f"Validation passed with {len(warnings)} warning(s)."
    if name == "compare_draft_with_examples":
        comparisons = list(result.get("comparisons") or [])
        issue_count = sum(len(item.get("issues") or []) for item in comparisons if isinstance(item, dict))
        return f"Compared {len(comparisons)} group(s); found {issue_count} structural issue(s)."
    if name == "save_test_draft":
        saved = result.get("saved_test") or {}
        title = _single_line(str(saved.get("title") or "Untitled draft"))
        return f"Saved draft `{title}` at version {saved.get('version') or '?'}."
    if name == "quick_fix_published_test":
        saved = result.get("quick_fixed_test") or {}
        title = _single_line(str(saved.get("title") or "Untitled test"))
        return f"Applied quick fix to `{title}`."
    if name == "publish_test":
        saved = result.get("published_test") or {}
        title = _single_line(str(saved.get("title") or "Untitled test"))
        return f"Published `{title}`."
    if name == "list_question_types":
        rows = list(result.get("question_types") or [])
        return f"Loaded {len(rows)} supported question type(s)."
    if name == "get_builder_rules":
        rules = list(result.get("builder_rules") or [])
        return f"Loaded {len(rules)} builder rule(s)."
    return _json_preview(result, limit=180)

async def _append_job_status_message(
    *,
    job_id: UUID,
    content: str,
) -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        job = await session.get(AdminAiJob, job_id)
        if job is None:
            return
        thread = await session.get(AdminAiThread, job.thread_id)
        if thread is None:
            return
        admin = await _build_admin_principal_for_job(session, job)
        await append_admin_ai_status_message(
            session,
            thread=thread,
            admin=admin,
            content=content,
        )
        await session.commit()

async def _enforce_pre_save_requirements(
    session: AsyncSession,
    *,
    job_id: UUID,
    tool_name: str,
    args_obj: BaseModel,
) -> None:
    if tool_name not in {"save_test_draft", "quick_fix_published_test"}:
        return

    draft = getattr(args_obj, "draft", None)
    if not isinstance(draft, AiDraftPayloadInput):
        return

    report = _draft_quality_report(draft)
    if report["errors"]:
        raise ValueError("Draft validation failed: " + " | ".join(report["errors"][:6]))

    if not draft.question_groups:
        return

    job = await session.get(AdminAiJob, job_id)
    completed_tools = {
        str(item.get("name"))
        for item in list(job.tool_trace or [])
        if item.get("status") == "completed"
    } if job is not None else set()

    if not completed_tools.intersection(_DB_INSPECTION_TOOL_NAMES):
        raise ValueError(
            "Inspect DB-backed examples first. Call find_question_group_examples, get_test_draft, or compare_draft_with_examples before saving."
        )
    if "validate_draft" not in completed_tools:
        raise ValueError("Run validate_draft before saving the draft.")
    if "compare_draft_with_examples" not in completed_tools:
        raise ValueError("Run compare_draft_with_examples before saving question edits.")

async def _load_job_with_context(
    session: AsyncSession,
    *,
    job_id: UUID,
) -> tuple[AdminAiJob | None, AdminAiThread | None, list[AdminAiMessage], AdminPrincipal | None]:
    job = await session.get(AdminAiJob, job_id)
    if job is None:
        return None, None, [], None
    thread = await session.get(AdminAiThread, job.thread_id)
    if thread is None:
        return job, None, [], None
    messages = list(
        (
            await session.scalars(
                select(AdminAiMessage)
                .where(AdminAiMessage.thread_id == thread.id)
                .order_by(AdminAiMessage.created_at.asc())
            )
        ).all()
    )
    admin = None
    if thread.admin_id:
        admin = AdminPrincipal(id=thread.admin_id, username="admin", email="", role="admin", is_active=True)  # type: ignore[arg-type]
    return job, thread, messages, admin

async def _build_admin_principal_for_job(session: AsyncSession, job: AdminAiJob) -> AdminPrincipal:
    from app.models.admin import Admin  # local import to avoid cycle

    admin = await session.get(Admin, job.admin_id)
    if admin is None:
        raise RuntimeError("Admin account for AI job is missing.")
    return AdminPrincipal.model_validate(admin)
