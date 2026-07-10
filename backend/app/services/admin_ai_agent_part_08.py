from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.admin_ai_agent_dependencies import *
from app.services.admin_ai_agent_part_01 import _MODEL_CALL_TIMEOUT_SECONDS, _TOOL_CALL_TIMEOUT_SECONDS, _json_preview, _json_safe_value, _now
from app.services.admin_ai_agent_part_02 import _append_grounding_sources_to_text, _extract_grounding_summary
from app.services.admin_ai_agent_part_04 import append_admin_ai_message
from app.services.admin_ai_agent_part_05 import _build_gemini_client, _build_generation_config, _max_tool_loops, _tool_declarations
from app.services.admin_ai_agent_part_06 import TOOL_REGISTRY, _append_tool_trace_item_for_job, _finish_tool_trace_item_for_job, _message_history_to_contents
from app.services.admin_ai_agent_part_07 import _append_job_status_message, _build_admin_principal_for_job, _build_tool_args, _enforce_pre_save_requirements, _tool_plan_line, _tool_result_line

async def _run_admin_ai_job_once(job_id: UUID) -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        job = await session.get(AdminAiJob, job_id)
        if job is None:
            return
        if job.status not in {AdminAiJobStatus.QUEUED, AdminAiJobStatus.RUNNING}:
            return
        thread = await session.get(AdminAiThread, job.thread_id)
        if thread is None:
            return
        admin = await _build_admin_principal_for_job(session, job)
        messages = list(
            (
                await session.scalars(
                    select(AdminAiMessage)
                    .where(AdminAiMessage.thread_id == thread.id)
                    .order_by(AdminAiMessage.created_at.asc())
                )
            ).all()
        )

        job.status = AdminAiJobStatus.RUNNING
        job.started_at = _now()
        job.error_message = None
        thread.last_job_status = AdminAiJobStatus.RUNNING
        thread.updated_at = _now()
        resolved_config = await resolve_ai_use_case_config(session, AiUseCase.ADMIN_CHAT)
        job.provider = resolved_config.provider.value
        job.model_name = resolved_config.model_id
        thread.provider = resolved_config.provider.value
        thread.model_name = resolved_config.model_id
        await session.commit()

    try:
        if resolved_config.provider != AiProvider.GOOGLE:
            raise RuntimeError(
                "Admin AI workspace currently requires a Google binding because tool-calling and grounded search still use the Google runtime."
            )
        client = _build_gemini_client(resolved_config)
        tool_declarations = _tool_declarations()
        config = _build_generation_config(tool_declarations)
        contents: list[Any] = _message_history_to_contents(messages)
        final_text = ""
        final_tool_calls: list[dict[str, Any]] = []
        grounding_summary: dict[str, Any] | None = None

        for loop_index in range(_max_tool_loops()):
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    client.models.generate_content,
                    model=resolved_config.model_id,
                    contents=contents,
                    config=config,
                ),
                timeout=_MODEL_CALL_TIMEOUT_SECONDS,
            )
            latest_grounding_summary = _extract_grounding_summary(response)
            if latest_grounding_summary is not None:
                grounding_summary = latest_grounding_summary

            function_calls = list(response.function_calls or [])
            if not function_calls:
                final_text = (response.text or "").strip()
                break

            intermediate_text = (response.text or "").strip()
            if intermediate_text:
                await _append_job_status_message(
                    job_id=job_id,
                    content=f"Model note:\n{intermediate_text}",
                )

            final_tool_calls = [
                {"name": call.name, "arguments": dict(call.args or {})}
                for call in function_calls
            ]

            planned_lines = [
                f"{index}. {_tool_plan_line(call.name or 'tool', dict(call.args or {}))}"
                for index, call in enumerate(function_calls, start=1)
            ]
            await _append_job_status_message(
                job_id=job_id,
                content=(
                    f"Step batch {loop_index + 1}: next I will run {len(function_calls)} tool call(s).\n"
                    + "\n".join(planned_lines[:8])
                ),
            )

            if response.candidates and response.candidates[0].content is not None:
                contents.append(response.candidates[0].content)

            response_parts: list[genai_types.Part] = []
            for function_call in function_calls:
                tool = TOOL_REGISTRY.get(function_call.name or "")
                if tool is None:
                    raise RuntimeError(f"Unsupported tool requested: {function_call.name}")

                trace_item = await _append_tool_trace_item_for_job(
                    job_id=job_id,
                    name=tool.name,
                    arguments=dict(function_call.args or {}),
                )
                try:
                    args_obj = _build_tool_args(tool, dict(function_call.args or {}))
                    tool_session_maker = get_session_maker()
                    async with tool_session_maker() as tool_session:
                        await _enforce_pre_save_requirements(
                            tool_session,
                            job_id=job_id,
                            tool_name=tool.name,
                            args_obj=args_obj,
                        )
                        result = await asyncio.wait_for(
                            tool.handler(tool_session, args_obj),
                            timeout=_TOOL_CALL_TIMEOUT_SECONDS,
                        )
                    preview = _json_preview(result)
                    await _finish_tool_trace_item_for_job(
                        job_id=job_id,
                        trace_id=str(trace_item["id"]),
                        status="completed",
                        result_preview=preview,
                    )
                    await _append_job_status_message(
                        job_id=job_id,
                        content=f"Completed `{tool.name}`. {_tool_result_line(tool.name, result)}",
                    )
                    result_payload = _json_safe_value(result)
                    response_parts.append(
                        genai_types.Part.from_function_response(
                            name=tool.name,
                            response={"result": result_payload},
                        )
                    )
                except asyncio.TimeoutError:
                    error_message = f"{tool.name} timed out after {_TOOL_CALL_TIMEOUT_SECONDS} seconds."
                    await _finish_tool_trace_item_for_job(
                        job_id=job_id,
                        trace_id=str(trace_item["id"]),
                        status="failed",
                        error=error_message,
                    )
                    await _append_job_status_message(
                        job_id=job_id,
                        content=f"`{tool.name}` failed: {error_message}",
                    )
                    raise RuntimeError(error_message) from None
                except Exception as exc:
                    await _finish_tool_trace_item_for_job(
                        job_id=job_id,
                        trace_id=str(trace_item["id"]),
                        status="failed",
                        error=str(exc),
                    )
                    await _append_job_status_message(
                        job_id=job_id,
                        content=f"`{tool.name}` returned an error: {str(exc)}",
                    )
                    response_parts.append(
                        genai_types.Part.from_function_response(
                            name=tool.name,
                            response={"error": str(exc)},
                        )
                    )
            contents.extend(response_parts)
        else:
            final_text = (
                f"I stopped after reaching the current tool loop limit ({_max_tool_loops()}). "
                "The chat log above includes the latest model notes, tool plans, and completed steps."
            )

        final_text = _append_grounding_sources_to_text(final_text or "Task completed.", grounding_summary)

        await _complete_admin_ai_job(
            job_id=job_id,
            admin_id=admin.id,
            final_text=final_text,
            final_tool_calls=final_tool_calls,
            grounding_summary=grounding_summary,
        )
    except asyncio.CancelledError:
        await _cancel_admin_ai_job(job_id)
        raise
    except Exception as exc:
        error_message = "Model request timed out." if isinstance(exc, asyncio.TimeoutError) else str(exc)
        await _mark_admin_ai_job_failed(job_id, error_message)
        raise

async def _complete_admin_ai_job(
    *,
    job_id: UUID,
    admin_id: UUID,
    final_text: str,
    final_tool_calls: list[dict[str, Any]],
    grounding_summary: dict[str, Any] | None,
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
        assistant_message = await append_admin_ai_message(
            session,
            thread=thread,
            admin=admin,
            role=AdminAiMessageRole.ASSISTANT,
            content=final_text,
            tool_calls=final_tool_calls,
        )
        job.assistant_message_id = assistant_message.id
        job.status = AdminAiJobStatus.COMPLETED
        job.finished_at = _now()
        payload = dict(job.result_payload or {})
        payload.update(
            {
                "assistant_message_id": str(assistant_message.id),
                "assistant_preview": assistant_message.content[:500],
            }
        )
        if grounding_summary is not None:
            payload["grounding"] = grounding_summary
        job.result_payload = payload
        thread.last_job_status = AdminAiJobStatus.COMPLETED
        thread.summary = assistant_message.content[:240]
        thread.updated_at = _now()
        await session.commit()

async def _cancel_admin_ai_job(job_id: UUID) -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        job = await session.get(AdminAiJob, job_id)
        if job is None:
            return
        thread = await session.get(AdminAiThread, job.thread_id)
        job.status = AdminAiJobStatus.CANCELED
        job.error_message = "Cancelled by admin."
        job.finished_at = _now()
        if thread is not None:
            thread.last_job_status = AdminAiJobStatus.CANCELED
            thread.updated_at = _now()
        await session.commit()

async def _mark_admin_ai_job_failed(job_id: UUID, error_message: str) -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        job = await session.get(AdminAiJob, job_id)
        if job is None:
            return
        thread = await session.get(AdminAiThread, job.thread_id)
        job.status = AdminAiJobStatus.FAILED
        job.error_message = error_message[:4000]
        job.finished_at = _now()
        if thread is not None:
            thread.last_job_status = AdminAiJobStatus.FAILED
            thread.summary = error_message[:240]
            thread.updated_at = _now()
        await session.commit()
