from __future__ import annotations

import argparse
import asyncio
import json
import re
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.enums import AiProvider, AiUseCase
from app.models.enums import TestType as ModelTestType
from app.models.test import Question, QuestionGroup, Test, TestSection
from app.services.ai_config import ResolvedAiUseCaseConfig
from app.services.ai_generation import generate_text_sync
from app.db.session import get_session_maker


DEFAULT_MODEL = "gemini-3-flash-preview"
GENERATOR_VERSION = "2026-05-21.3"
SUPPORTED_TEST_TYPES = {
    "reading": ModelTestType.READING,
    "listening": ModelTestType.LISTENING,
}


@dataclass(slots=True)
class ExplanationStats:
    tests_seen: int = 0
    sections_seen: int = 0
    questions_seen: int = 0
    questions_updated: int = 0
    suspicious_answers: int = 0
    failed_sections: int = 0


@dataclass(frozen=True, slots=True)
class SectionJob:
    test_id: UUID
    test_type: str
    test_title: str
    test_status: str
    section_id: UUID
    section_title: str
    question_count: int


def _plain(value: Any) -> str:
    return str(value or "").strip()


def _normalize_answer(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().casefold()


def _extract_paragraph_text(item: Any) -> str:
    if isinstance(item, dict):
        return _plain(item.get("text"))
    return _plain(item)


def _flatten_transcript(value: Any) -> list[str]:
    if isinstance(value, str):
        return [_plain(value)] if _plain(value) else []
    if isinstance(value, list):
        lines: list[str] = []
        for item in value:
            lines.extend(_flatten_transcript(item))
        return lines
    if not isinstance(value, dict):
        return []

    for key in ("segments", "items", "lines", "turns", "paragraphs"):
        nested = value.get(key)
        if isinstance(nested, list):
            lines = _flatten_transcript(nested)
            if lines:
                return lines

    text = _plain(value.get("text") or value.get("transcript") or value.get("content"))
    if not text:
        return []
    speaker = _plain(value.get("speaker") or value.get("label"))
    return [f"{speaker}: {text}" if speaker else text]


def _transcript_text(section: TestSection) -> str:
    lines = _flatten_transcript(section.transcript)
    return "\n".join(line for line in lines if line)


def _section_passage(section: TestSection) -> str:
    paragraphs = section.content.get("paragraphs") if isinstance(section.content, dict) else None
    if isinstance(paragraphs, list) and paragraphs:
        lines = []
        for index, item in enumerate(paragraphs, start=1):
            text = _extract_paragraph_text(item)
            if not text:
                continue
            label = _plain(item.get("label")) if isinstance(item, dict) else ""
            prefix = f"{label}. " if label else f"Paragraph {index}: "
            lines.append(f"{prefix}{text}")
        if lines:
            return "\n\n".join(lines)
    return _plain((section.content or {}).get("body") or _transcript_text(section) or section.intro)


def _all_section_text(section: TestSection) -> str:
    chunks = [
        _plain(section.title),
        _plain(section.intro),
        _plain((section.content or {}).get("body")),
    ]
    paragraphs = (section.content or {}).get("paragraphs")
    if isinstance(paragraphs, list):
        chunks.extend(_extract_paragraph_text(item) for item in paragraphs)
    chunks.append(_transcript_text(section))
    return "\n\n".join(chunk for chunk in chunks if chunk)


def _quote_exists(section: TestSection, quote: str) -> bool:
    return _quote_exists_text(_all_section_text(section), quote)


def _quote_exists_text(source_text: str, quote: str) -> bool:
    normalized_quote = re.sub(r"\s+", " ", quote).strip().casefold()
    if not normalized_quote:
        return False
    normalized_section = re.sub(r"\s+", " ", source_text).casefold()
    return normalized_quote in normalized_section


def _strip_json_fence(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        return cleaned[start : end + 1]
    return cleaned


def _parse_json(text: str) -> dict[str, Any]:
    return json.loads(_strip_json_fence(text))


def _json_error_context(text: str, exc: json.JSONDecodeError) -> str:
    start = max(0, exc.pos - 120)
    end = min(len(text), exc.pos + 120)
    return text[start:end].replace("\n", "\\n")


def _response_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "explanation": {"type": "string"},
                        "quote": {"type": "string"},
                        "highlighted_answer": {"type": "string"},
                        "answer_status": {
                            "type": "string",
                            "enum": ["valid", "possibly_wrong", "uncertain"],
                        },
                        "suggested_answers": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "issue": {"type": "string"},
                        "confidence": {"type": "number"},
                    },
                    "required": [
                        "id",
                        "explanation",
                        "quote",
                        "highlighted_answer",
                        "answer_status",
                        "suggested_answers",
                        "issue",
                        "confidence",
                    ],
                },
            }
        },
        "required": ["questions"],
    }


def _question_payload(question: Question, group: QuestionGroup) -> dict[str, Any]:
    answers = [
        answer.value
        for answer in sorted(question.answer_variants, key=lambda item: (not item.is_primary, str(item.created_at or "")))
    ]
    return {
        "id": str(question.id),
        "number": question.number,
        "label": _plain(question.question_metadata.get("label") or f"Q{question.number}"),
        "type": str(group.question_type.value),
        "prompt": question.prompt,
        "accepted_answers": answers,
        "options": list(question.question_metadata.get("options", [])) or list(group.shared_options or []),
        "current_explanation": question.explanation or "",
    }


def _section_payload(test: Test, section: TestSection) -> dict[str, Any]:
    return _section_payload_for_groups(test, section, list(section.question_groups))


def _section_payload_for_groups(
    test: Test,
    section: TestSection,
    selected_groups: list[QuestionGroup],
) -> dict[str, Any]:
    groups = []
    for group in sorted(selected_groups, key=lambda item: (item.question_start, item.question_end)):
        questions = [
            _question_payload(question, group)
            for question in sorted(group.questions, key=lambda item: item.number)
        ]
        groups.append(
            {
                "title": group.title,
                "instructions": group.instructions or "",
                "type": str(group.question_type.value),
                "question_range": [group.question_start, group.question_end],
                "shared_options": list(group.shared_options or []),
                "question_block": _plain((group.shared_content or {}).get("question_block")),
                "answer_block": _plain((group.shared_content or {}).get("answer_block")),
                "secondary_block": _plain((group.shared_content or {}).get("secondary_block")),
                "questions": questions,
            }
        )
    return {
        "test_id": str(test.id),
        "test_title": test.title,
        "test_type": str(test.type.value),
        "test_status": str(test.status.value),
        "section_id": str(section.id),
        "section_title": section.title,
        "source_text": _section_passage(section),
        "groups": groups,
    }


def _build_prompt(payload: dict[str, Any]) -> str:
    return (
        "Create concise IELTS Reading/Listening answer explanations and audit the answer key.\n"
        "Rules:\n"
        "- Use ONLY the source_text/question/options provided.\n"
        "- For each question, explain why the accepted answer is correct in 1-2 simple sentences.\n"
        "- quote must be an exact short evidence phrase/sentence copied from source_text when possible.\n"
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
    if limit:
        query = query.limit(limit)
    return list((await session.scalars(query)).unique().all())


async def _collect_section_jobs(
    session: AsyncSession,
    *,
    limit: int | None,
    test_types: set[ModelTestType],
) -> tuple[int, list[SectionJob]]:
    tests = await _load_tests(session, limit=limit, test_types=test_types)
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


async def _process_section(
    session: AsyncSession,
    *,
    config: ResolvedAiUseCaseConfig,
    test: Test,
    section: TestSection,
    overwrite: bool,
    dry_run: bool,
) -> tuple[int, list[dict[str, Any]]]:
    now = datetime.now(UTC).isoformat()
    source_text = _all_section_text(section)
    group_jobs: list[dict[str, Any]] = []

    for group in sorted(section.question_groups, key=lambda item: (item.question_start, item.question_end)):
        questions_by_id = _index_group_questions(group)
        target_questions = [
            question
            for question in questions_by_id.values()
            if overwrite or not _plain(question.explanation)
        ]
        if not target_questions:
            continue

        group_jobs.append(
            {
                "payload": _section_payload_for_groups(test, section, [group]),
                "questions": {
                    str(question.id): {
                        "number": question.number,
                        "accepted_answers": [answer.value for answer in question.answer_variants],
                    }
                    for question in target_questions
                },
            }
        )

    # Release the DB connection before slow AI calls so high API concurrency does not exhaust Postgres pools.
    await session.close()

    updates: list[dict[str, Any]] = []
    suspicious: list[dict[str, Any]] = []
    for group_job in group_jobs:
        questions_by_id = group_job["questions"]
        data = await _generate_section_data(config=config, prompt=_build_prompt(group_job["payload"]))
        output_items = data.get("questions") or []
        if not isinstance(output_items, list):
            raise RuntimeError("AI response has no questions array.")

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
    semaphore = asyncio.Semaphore(max(1, args.concurrency))

    async with session_maker() as session:
        stats.tests_seen, jobs = await _collect_section_jobs(session, limit=args.limit, test_types=test_types)

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
    parser.add_argument("--overwrite", action="store_true", help="Regenerate explanations even when a question already has one.")
    parser.add_argument("--dry-run", action="store_true", help="Call AI and validate output without writing DB changes.")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of tests for smoke runs.")
    parser.add_argument("--report", default="/tmp/reading_explanation_report.json")
    return parser.parse_args()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run(parse_args())))
