from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.scripts.generate_reading_explanations_dependencies import *
from app.scripts.generate_reading_explanations_part_01 import DEFAULT_MODEL, ExplanationStats, GENERATOR_VERSION, SectionJob, _all_section_text, _plain, _quote_exists_text, _section_payload_for_group_questions
from app.scripts.generate_reading_explanations_part_02 import _answer_status_for_answers, _build_config, _build_prompt, _collect_section_jobs, _generate_section_data, _index_group_questions, _load_section, _parse_test_types

async def _process_section(
    session: AsyncSession,
    *,
    config: ResolvedAiUseCaseConfig,
    test: Test,
    section: TestSection,
    overwrite: bool,
    only_missing_generated: bool,
    dry_run: bool,
) -> tuple[int, list[dict[str, Any]]]:
    now = datetime.now(UTC).isoformat()
    source_text = _all_section_text(section)
    group_jobs: list[dict[str, Any]] = []

    for group in sorted(section.question_groups, key=lambda item: (item.question_start, item.question_end)):
        questions_by_id = _index_group_questions(group)
        target_questions = []
        for question in questions_by_id.values():
            has_generated = _plain((question.explanation_reference or {}).get("generated_by"))
            if only_missing_generated:
                should_process = has_generated != config.model_id
            else:
                should_process = overwrite or not _plain(question.explanation)
            if should_process:
                target_questions.append(question)
        if not target_questions:
            continue

        for question in target_questions:
            group_jobs.append(
                {
                    "payload": _section_payload_for_group_questions(test, section, group, [question]),
                    "questions": {
                        str(question.id): {
                            "number": question.number,
                            "accepted_answers": [answer.value for answer in question.answer_variants],
                        }
                    },
                }
            )

    # Release the DB connection before slow AI calls so high API concurrency does not exhaust Postgres pools.
    await session.close()

    updates: list[dict[str, Any]] = []
    suspicious: list[dict[str, Any]] = []
    for group_job in group_jobs:
        questions_by_id = group_job["questions"]
        try:
            data = await _generate_section_data(config=config, prompt=_build_prompt(group_job["payload"]))
        except Exception as exc:  # noqa: BLE001
            # One question failing (e.g. the model returns invalid JSON) must not
            # discard explanations for every other question in the same section.
            for failed_id, failed_data in questions_by_id.items():
                suspicious.append(
                    {
                        "test_id": str(test.id),
                        "test_title": test.title,
                        "test_status": str(test.status.value),
                        "section_id": str(section.id),
                        "section_title": section.title,
                        "question_id": failed_id,
                        "question_number": failed_data.get("number"),
                        "current_answers": list(failed_data.get("accepted_answers", [])),
                        "answer_status": "uncertain",
                        "suggested_answers": [],
                        "issue": f"Explanation generation failed: {exc}",
                        "quote": "",
                    }
                )
            continue
        output_items = data.get("questions") or []
        if not isinstance(output_items, list):
            continue

        for item in output_items:
            if not isinstance(item, dict):
                continue
            question_id = _plain(item.get("id"))
            question_data = questions_by_id.get(question_id)
            if question_data is None:
                continue

            explanation = _plain(item.get("explanation"))
            quote = _plain(item.get("quote"))
            highlighted_answer = _plain(item.get("highlighted_answer"))
            if not explanation:
                continue
            quote_is_valid = _quote_exists_text(source_text, quote)
            accepted_answers = list(question_data["accepted_answers"])
            status, suggested_answers, issue = _answer_status_for_answers(accepted_answers, item)
            confidence = item.get("confidence")
            try:
                confidence_value = max(0.0, min(float(confidence), 1.0))
            except (TypeError, ValueError):
                confidence_value = None

            reference = {
                "quote": quote if quote_is_valid else "",
                "highlighted_answer": highlighted_answer or (accepted_answers[0] if accepted_answers else ""),
                "answer_status": status,
                "suggested_answers": suggested_answers,
                "issue": issue,
                "confidence": confidence_value,
                "quote_verified": quote_is_valid,
                "generated_by": config.model_id,
                "generated_at": now,
            }
            if status != "valid" or not quote_is_valid:
                suspicious.append(
                    {
                        "test_id": str(test.id),
                        "test_title": test.title,
                        "test_status": str(test.status.value),
                        "section_id": str(section.id),
                        "section_title": section.title,
                        "question_id": question_id,
                        "question_number": question_data["number"],
                        "current_answers": accepted_answers,
                        "answer_status": status,
                        "suggested_answers": suggested_answers,
                        "issue": issue
                        or ("Evidence quote was not found exactly in passage." if not quote_is_valid else ""),
                        "quote": quote,
                    }
                )
            updates.append(
                {
                    "question_id": question_id,
                    "explanation": explanation,
                    "explanation_reference": reference,
                }
            )

        output_ids = {_plain(item.get("id")) for item in output_items if isinstance(item, dict)}
        missing = [data["number"] for question_id, data in questions_by_id.items() if question_id not in output_ids]
        if missing:
            suspicious.append(
                {
                    "test_id": str(test.id),
                    "test_title": test.title,
                    "test_status": str(test.status.value),
                    "section_id": str(section.id),
                    "section_title": section.title,
                    "question_id": "",
                    "question_number": None,
                    "current_answers": [],
                    "answer_status": "uncertain",
                    "suggested_answers": [],
                    "issue": f"AI response omitted questions: {missing}",
                    "quote": "",
                }
            )

    if updates and not dry_run:
        session_maker = get_session_maker()
        async with session_maker() as write_session:
            for update in updates:
                question = await write_session.get(Question, UUID(str(update["question_id"])))
                if question is None:
                    continue
                question.explanation = str(update["explanation"])
                question.explanation_reference = dict(update["explanation_reference"])
            await write_session.commit()
    return len(updates), suspicious

async def run(args: argparse.Namespace) -> int:
    loop = asyncio.get_running_loop()
    executor = ThreadPoolExecutor(max_workers=max(4, args.concurrency + 8))
    loop.set_default_executor(executor)
    config = _build_config(args.model)
    session_maker = get_session_maker()
    stats = ExplanationStats()
    suspicious: list[dict[str, Any]] = []
    test_types = _parse_test_types(args.types)
    test_id = UUID(args.test_id) if args.test_id else None
    semaphore = asyncio.Semaphore(max(1, args.concurrency))

    async with session_maker() as session:
        stats.tests_seen, jobs = await _collect_section_jobs(
            session,
            limit=args.limit,
            test_types=test_types,
            test_id=test_id,
        )

    stats.sections_seen = len(jobs)
    stats.questions_seen = sum(job.question_count for job in jobs)

    async def process_job(job: SectionJob) -> tuple[SectionJob, int, list[dict[str, Any]], str | None]:
        async with semaphore:
            async with session_maker() as session:
                try:
                    test, section = await _load_section(session, job.test_id, job.section_id)
                    updated, section_suspicious = await _process_section(
                        session,
                        config=config,
                        test=test,
                        section=section,
                        overwrite=args.overwrite,
                        only_missing_generated=args.only_missing_generated,
                        dry_run=args.dry_run,
                    )
                    return job, updated, section_suspicious, None
                except Exception as exc:  # noqa: BLE001
                    await session.rollback()
                    return job, 0, [], str(exc)

    tasks = [asyncio.create_task(process_job(job)) for job in jobs]
    for task in asyncio.as_completed(tasks):
        job, updated, section_suspicious, error = await task
        if error:
            stats.failed_sections += 1
            print(f"FAILED section test={job.test_id} section={job.section_id}: {error}")
            continue
        stats.questions_updated += updated
        suspicious.extend(section_suspicious)
        print(
            f"processed type={job.test_type} test='{job.test_title}' status={job.test_status} "
            f"section='{job.section_title}' updated={updated} suspicious={len(section_suspicious)}"
        )

    if not tasks:
        print("No matching sections found.")

    stats.suspicious_answers = len(suspicious)
    report = {
        "generated_at": datetime.now(UTC).isoformat(),
        "generator_version": GENERATOR_VERSION,
        "model": args.model,
        "types": sorted(item.value for item in test_types),
        "test_id": str(test_id) if test_id else None,
        "concurrency": args.concurrency,
        "dry_run": args.dry_run,
        "stats": asdict(stats),
        "suspicious_answers": suspicious,
    }
    if args.report:
        report_path = Path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"report={report_path}")
    print(json.dumps(report["stats"], ensure_ascii=False))
    executor.shutdown(wait=False, cancel_futures=False)
    return 0 if stats.failed_sections == 0 else 1

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate IELTS Reading/Listening answer explanations with Gemini.")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument(
        "--types",
        default="reading,listening",
        help="Comma-separated test types to process: reading,listening.",
    )
    parser.add_argument("--concurrency", type=int, default=4, help="Parallel section workers.")
    parser.add_argument("--test-id", default=None, help="Optional single test id to process.")
    parser.add_argument("--overwrite", action="store_true", help="Regenerate explanations even when a question already has one.")
    parser.add_argument(
        "--only-missing-generated",
        action="store_true",
        help="Regenerate only questions that do not have this generator/model marker.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Call AI and validate output without writing DB changes.")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of tests for smoke runs.")
    parser.add_argument("--report", default="/tmp/reading_explanation_report.json")
    return parser.parse_args()
