from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.scripts.generate_reading_explanations_dependencies import *
from app.scripts.generate_reading_explanations_part_01 import SUPPORTED_TEST_TYPES, SectionJob, _json_error_context, _normalize_answer, _parse_json, _plain, _response_schema

def _build_prompt(payload: dict[str, Any]) -> str:
    return (
        "Create concise IELTS Reading/Listening answer explanations and audit the answer key.\n"
        "Rules:\n"
        "- Use ONLY the source_text/question/options provided.\n"
        "- For each question, explain why the accepted answer is correct in 1-2 simple sentences.\n"
        "- quote is the exact evidence in the passage that proves the answer. Copy it VERBATIM,\n"
        "  word-for-word and character-for-character, directly from source_text (do NOT paraphrase,\n"
        "  summarise, fix grammar, or change punctuation). It must be a literal substring of source_text.\n"
        "- Always provide a quote when evidence exists. For TRUE/FALSE/YES/NO, completion, matching,\n"
        "  and short-answer questions there IS supporting/contradicting text: copy that exact sentence\n"
        "  or phrase. Only leave quote empty for NOT GIVEN answers where the passage truly says nothing.\n"
        "- highlighted_answer must be the current accepted answer or the best option label/value.\n"
        "- answer_status must be one of: valid, possibly_wrong, uncertain.\n"
        "- Mark possibly_wrong only when the accepted answer clearly contradicts the passage/options.\n"
        "- If possibly_wrong, include suggested_answers and issue. Do not be vague.\n"
        "- Keep explanations easy for IELTS learners, not academic.\n"
        "- Escape quotes and line breaks correctly so the response is valid JSON.\n"
        "Return JSON only with this shape:\n"
        '{"questions":[{"id":"uuid","explanation":"...","quote":"...","highlighted_answer":"...",'
        '"answer_status":"valid","suggested_answers":[],"issue":"","confidence":0.0}]}\n\n'
        f"DATA:\n{json.dumps(payload, ensure_ascii=False)}"
    )

def _build_config(model: str) -> ResolvedAiUseCaseConfig:
    settings = get_settings()
    api_key = (settings.gemini_api_key or "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")
    return ResolvedAiUseCaseConfig(
        use_case=AiUseCase.ADMIN_CHAT,
        provider=AiProvider.GOOGLE,
        provider_config_id=None,
        provider_label="Google Gemini",
        api_key=api_key,
        base_url=None,
        model_id=model,
        model_record_id=None,
        settings_json={"http_timeout_ms": 90_000},
        context_window=None,
        source="env_script",
    )

def _index_group_questions(group: QuestionGroup) -> dict[str, Question]:
    return {str(question.id): question for question in group.questions}

async def _generate_section_data(
    *,
    config: ResolvedAiUseCaseConfig,
    prompt: str,
    attempts: int = 3,
) -> dict[str, Any]:
    last_error = ""
    for attempt in range(1, attempts + 1):
        retry_note = ""
        if last_error:
            retry_note = (
                "\n\nPrevious response was invalid JSON. Return valid JSON only, "
                "with every quote inside string values escaped. "
                f"Parser error: {last_error}"
            )
        response_text = await asyncio.to_thread(
            generate_text_sync,
            config=config,
            prompt=f"{prompt}{retry_note}",
            system_instruction=(
                "You are a careful IELTS Reading and Listening answer key auditor. "
                "Be concise, evidence-based, and return strict JSON only."
            ),
            temperature=0,
            top_p=1,
            max_output_tokens=8192,
            response_mime_type="application/json",
            response_schema=_response_schema(),
            operation="reading_explanation_backfill",
        )
        try:
            return _parse_json(response_text)
        except json.JSONDecodeError as exc:
            last_error = f"{exc.msg} at char {exc.pos}; context={_json_error_context(response_text, exc)}"
            if attempt == attempts:
                raise RuntimeError(f"AI returned invalid JSON after {attempts} attempts: {last_error}") from exc
    raise RuntimeError("AI returned invalid JSON.")

def _answer_status(question: Question, item: dict[str, Any]) -> tuple[str, list[str], str]:
    return _answer_status_for_answers([answer.value for answer in question.answer_variants], item)

def _answer_status_for_answers(accepted_answers: list[str], item: dict[str, Any]) -> tuple[str, list[str], str]:
    raw_status = _plain(item.get("answer_status")).lower()
    status = raw_status if raw_status in {"valid", "possibly_wrong", "uncertain"} else "uncertain"
    suggested = [
        _plain(answer)
        for answer in (item.get("suggested_answers") or [])
        if _plain(answer)
    ]
    issue = _plain(item.get("issue"))
    accepted = {_normalize_answer(answer) for answer in accepted_answers if _plain(answer)}
    if status == "valid" and suggested:
        suggested_norm = {_normalize_answer(answer) for answer in suggested}
        if accepted and suggested_norm and not suggested_norm.intersection(accepted):
            status = "possibly_wrong"
            issue = issue or "AI suggested a different answer from the current accepted answer."
    return status, suggested, issue

def _parse_test_types(value: str) -> set[ModelTestType]:
    keys = [item.strip().lower() for item in value.split(",") if item.strip()]
    if not keys:
        return {ModelTestType.READING, ModelTestType.LISTENING}
    unknown = sorted(key for key in keys if key not in SUPPORTED_TEST_TYPES)
    if unknown:
        raise ValueError(f"Unsupported test type(s): {', '.join(unknown)}")
    return {SUPPORTED_TEST_TYPES[key] for key in keys}

async def _load_tests(
    session: AsyncSession,
    *,
    limit: int | None,
    test_types: set[ModelTestType],
    test_id: UUID | None = None,
) -> list[Test]:
    query = (
        select(Test)
        .where(Test.type.in_(test_types))
        .options(
            selectinload(Test.sections)
            .selectinload(TestSection.question_groups)
            .selectinload(QuestionGroup.questions)
            .selectinload(Question.answer_variants),
            selectinload(Test.sections).selectinload(TestSection.question_groups),
        )
        .order_by(Test.created_at.asc())
    )
    if test_id is not None:
        query = query.where(Test.id == test_id)
    if limit:
        query = query.limit(limit)
    return list((await session.scalars(query)).unique().all())

async def _collect_section_jobs(
    session: AsyncSession,
    *,
    limit: int | None,
    test_types: set[ModelTestType],
    test_id: UUID | None = None,
) -> tuple[int, list[SectionJob]]:
    tests = await _load_tests(session, limit=limit, test_types=test_types, test_id=test_id)
    jobs: list[SectionJob] = []
    for test in tests:
        for section in sorted(test.sections, key=lambda item: item.position):
            jobs.append(
                SectionJob(
                    test_id=test.id,
                    test_type=str(test.type.value),
                    test_title=str(test.title),
                    test_status=str(test.status.value),
                    section_id=section.id,
                    section_title=str(section.title),
                    question_count=sum(len(group.questions) for group in section.question_groups),
                )
            )
    return len(tests), jobs

async def _load_section(session: AsyncSession, test_id: UUID, section_id: UUID) -> tuple[Test, TestSection]:
    query = (
        select(Test)
        .where(Test.id == test_id)
        .options(
            selectinload(Test.sections)
            .selectinload(TestSection.question_groups)
            .selectinload(QuestionGroup.questions)
            .selectinload(Question.answer_variants),
            selectinload(Test.sections).selectinload(TestSection.question_groups),
        )
    )
    test = (await session.scalars(query)).unique().one()
    for section in test.sections:
        if section.id == section_id:
            return test, section
    raise RuntimeError(f"Section {section_id} not found for test {test_id}.")
