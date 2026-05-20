from __future__ import annotations

import argparse
import asyncio
import json
import re
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


@dataclass(slots=True)
class ExplanationStats:
    tests_seen: int = 0
    sections_seen: int = 0
    questions_seen: int = 0
    questions_updated: int = 0
    suspicious_answers: int = 0
    failed_sections: int = 0


def _plain(value: Any) -> str:
    return str(value or "").strip()


def _normalize_answer(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().casefold()


def _extract_paragraph_text(item: Any) -> str:
    if isinstance(item, dict):
        return _plain(item.get("text"))
    return _plain(item)


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
    return _plain((section.content or {}).get("body") or section.intro)


def _all_section_text(section: TestSection) -> str:
    chunks = [
        _plain(section.title),
        _plain(section.intro),
        _plain((section.content or {}).get("body")),
    ]
    paragraphs = (section.content or {}).get("paragraphs")
    if isinstance(paragraphs, list):
        chunks.extend(_extract_paragraph_text(item) for item in paragraphs)
    return "\n\n".join(chunk for chunk in chunks if chunk)


def _quote_exists(section: TestSection, quote: str) -> bool:
    normalized_quote = re.sub(r"\s+", " ", quote).strip().casefold()
    if not normalized_quote:
        return False
    normalized_section = re.sub(r"\s+", " ", _all_section_text(section)).casefold()
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
    groups = []
    for group in sorted(section.question_groups, key=lambda item: (item.question_start, item.question_end)):
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
        "test_status": str(test.status.value),
        "section_id": str(section.id),
        "section_title": section.title,
        "passage": _section_passage(section),
        "groups": groups,
    }


def _build_prompt(payload: dict[str, Any]) -> str:
    return (
        "Create concise IELTS Reading answer explanations and audit the answer key.\n"
        "Rules:\n"
        "- Use ONLY the passage/question/options provided.\n"
        "- For each question, explain why the accepted answer is correct in 1-2 simple sentences.\n"
        "- quote must be an exact short evidence phrase/sentence copied from the passage when possible.\n"
        "- highlighted_answer must be the current accepted answer or the best option label/value.\n"
        "- answer_status must be one of: valid, possibly_wrong, uncertain.\n"
        "- Mark possibly_wrong only when the accepted answer clearly contradicts the passage/options.\n"
        "- If possibly_wrong, include suggested_answers and issue. Do not be vague.\n"
        "- Keep explanations easy for IELTS learners, not academic.\n"
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
        settings_json={},
        context_window=None,
        source="env_script",
    )


def _index_questions(section: TestSection) -> dict[str, Question]:
    return {
        str(question.id): question
        for group in section.question_groups
        for question in group.questions
    }


def _answer_status(question: Question, item: dict[str, Any]) -> tuple[str, list[str], str]:
    raw_status = _plain(item.get("answer_status")).lower()
    status = raw_status if raw_status in {"valid", "possibly_wrong", "uncertain"} else "uncertain"
    suggested = [
        _plain(answer)
        for answer in (item.get("suggested_answers") or [])
        if _plain(answer)
    ]
    issue = _plain(item.get("issue"))
    accepted = {_normalize_answer(answer.value) for answer in question.answer_variants if _plain(answer.value)}
    if status == "valid" and suggested:
        suggested_norm = {_normalize_answer(answer) for answer in suggested}
        if accepted and suggested_norm and not suggested_norm.intersection(accepted):
            status = "possibly_wrong"
            issue = issue or "AI suggested a different answer from the current accepted answer."
    return status, suggested, issue


async def _load_tests(session: AsyncSession, limit: int | None) -> list[Test]:
    query = (
        select(Test)
        .where(Test.type == ModelTestType.READING)
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


async def _process_section(
    session: AsyncSession,
    *,
    config: ResolvedAiUseCaseConfig,
    test: Test,
    section: TestSection,
    overwrite: bool,
    dry_run: bool,
) -> tuple[int, list[dict[str, Any]]]:
    questions_by_id = _index_questions(section)
    target_questions = [
        question
        for question in questions_by_id.values()
        if overwrite or not _plain(question.explanation)
    ]
    if not target_questions:
        return 0, []

    payload = _section_payload(test, section)
    prompt = _build_prompt(payload)
    response_text = await asyncio.to_thread(
        generate_text_sync,
        config=config,
        prompt=prompt,
        system_instruction=(
            "You are a careful IELTS Reading answer key auditor. "
            "Be concise, evidence-based, and return strict JSON only."
        ),
        temperature=0,
        top_p=1,
        max_output_tokens=8192,
        response_mime_type="application/json",
        response_schema=_response_schema(),
        operation="reading_explanation_backfill",
    )
    data = _parse_json(response_text)
    output_items = data.get("questions") or []
    if not isinstance(output_items, list):
        raise RuntimeError("AI response has no questions array.")

    updated = 0
    suspicious: list[dict[str, Any]] = []
    now = datetime.now(UTC).isoformat()
    for item in output_items:
        if not isinstance(item, dict):
            continue
        question_id = _plain(item.get("id"))
        question = questions_by_id.get(question_id)
        if question is None:
            continue
        if not overwrite and _plain(question.explanation):
            continue

        explanation = _plain(item.get("explanation"))
        quote = _plain(item.get("quote"))
        highlighted_answer = _plain(item.get("highlighted_answer"))
        if not explanation:
            continue
        quote_is_valid = _quote_exists(section, quote)
        status, suggested_answers, issue = _answer_status(question, item)
        confidence = item.get("confidence")
        try:
            confidence_value = max(0.0, min(float(confidence), 1.0))
        except (TypeError, ValueError):
            confidence_value = None

        accepted_answers = [answer.value for answer in question.answer_variants]
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
                    "question_id": str(question.id),
                    "question_number": question.number,
                    "current_answers": accepted_answers,
                    "answer_status": status,
                    "suggested_answers": suggested_answers,
                    "issue": issue or ("Evidence quote was not found exactly in passage." if not quote_is_valid else ""),
                    "quote": quote,
                }
            )
        if not dry_run:
            question.explanation = explanation
            question.explanation_reference = reference
        updated += 1

    if updated and not dry_run:
        await session.commit()
    elif dry_run:
        await session.rollback()
    return updated, suspicious


async def run(args: argparse.Namespace) -> int:
    config = _build_config(args.model)
    session_maker = get_session_maker()
    stats = ExplanationStats()
    suspicious: list[dict[str, Any]] = []

    async with session_maker() as session:
        tests = await _load_tests(session, args.limit)
        stats.tests_seen = len(tests)
        for test in tests:
            ordered_sections = sorted(test.sections, key=lambda item: item.position)
            for section in ordered_sections:
                test_id = str(test.id)
                test_title = str(test.title)
                test_status = str(test.status.value)
                section_id = str(section.id)
                section_title = str(section.title)
                stats.sections_seen += 1
                stats.questions_seen += sum(len(group.questions) for group in section.question_groups)
                try:
                    updated, section_suspicious = await _process_section(
                        session,
                        config=config,
                        test=test,
                        section=section,
                        overwrite=args.overwrite,
                        dry_run=args.dry_run,
                    )
                except Exception as exc:  # noqa: BLE001
                    stats.failed_sections += 1
                    print(f"FAILED section test={test_id} section={section_id}: {exc}")
                    await session.rollback()
                    continue
                stats.questions_updated += updated
                suspicious.extend(section_suspicious)
                print(
                    f"processed test='{test_title}' status={test_status} "
                    f"section='{section_title}' updated={updated} suspicious={len(section_suspicious)}"
                )

    stats.suspicious_answers = len(suspicious)
    report = {
        "generated_at": datetime.now(UTC).isoformat(),
        "model": args.model,
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
    return 0 if stats.failed_sections == 0 else 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate IELTS Reading answer explanations with Gemini.")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--overwrite", action="store_true", help="Regenerate explanations even when a question already has one.")
    parser.add_argument("--dry-run", action="store_true", help="Call AI and validate output without writing DB changes.")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of reading tests for smoke runs.")
    parser.add_argument("--report", default="/tmp/reading_explanation_report.json")
    return parser.parse_args()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run(parse_args())))
