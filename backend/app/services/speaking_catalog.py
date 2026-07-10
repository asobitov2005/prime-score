from __future__ import annotations

import re
from typing import Any

from app.models.speaking import SpeakingTopic
from app.schemas.speaking import SpeakingTestListItem, SpeakingTopicListItem

SPEAKING_MODES = {"strict_exam", "free_talk", "uzbek_roast"}
SPEAKING_MODE_ALIASES = {
    "practice": "free_talk",
    "strict_roast": "uzbek_roast",
}
PART_1_PLANNED_QUESTIONS = 8
PART_1_PREAMBLE_TURNS = 3


def entry_mode_parts(entry_mode: str) -> list[int]:
    if entry_mode == "full":
        return [1, 2, 3]
    return [int(entry_mode.rsplit("_", 1)[1])]


def resolve_planned_question_count(entry_mode: str, part: int) -> int | None:
    if entry_mode == "part_1" or (entry_mode == "full" and part == 1):
        return PART_1_PLANNED_QUESTIONS
    return None


def is_part1_closing_message(text: str) -> bool:
    normalized = text.strip()
    if not normalized:
        return False
    return bool(
        re.search(
            r"part\s*1.{0,48}(complete|finished|conclud|over|done|end)|"
            r"that'?s (the )?end of part\s*1|end of part\s*1|"
            r"this concludes part\s*1|we'?ve finished part\s*1|"
            r"no more questions.{0,24}part\s*1",
            normalized,
            re.I,
        )
    )


def count_part1_questions_answered(
    transcript_fragments: list[dict[str, Any]],
) -> int:
    examiner_questions = 0
    for fragment in transcript_fragments:
        role = str(fragment.get("role") or "").strip().lower()
        if role not in {"examiner", "assistant", "ai"}:
            continue
        text = str(fragment.get("text") or "").strip()
        if "?" not in text or is_part1_closing_message(text):
            continue
        examiner_questions += 1
    return max(0, examiner_questions - PART_1_PREAMBLE_TURNS)


def serialize_test(row: object) -> SpeakingTestListItem:
    return SpeakingTestListItem(
        id=row.id,
        title=row.title,
        slug=row.slug,
        status=row.status,
        access_type=row.access_type,
        mode_kind=row.mode_kind,
        source=getattr(row, "source", None),
        source_detail=getattr(row, "source_detail", None),
        description=getattr(row, "description", None),
        estimated_minutes=int(getattr(row, "estimated_minutes", 14) or 14),
        version=int(getattr(row, "version", 1) or 1),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def part1_fallback_questions(topic_title: str, prompt_text: str) -> list[str]:
    subject = topic_title.strip().rstrip(".")
    if not subject:
        subject = prompt_text.strip().rstrip(".")
    if not subject:
        return []
    lowered = subject.lower()
    return [
        f"Do you enjoy talking about {lowered}?",
        f"How important is {lowered} in your daily life?",
        f"Has your view of {lowered} changed over time?",
        f"Would you like to learn more about {lowered}?",
    ]


def extract_sample_questions(row: SpeakingTopic) -> list[str]:
    metadata = dict(row.topic_metadata or {})
    question_items = metadata.get("question_items")
    if isinstance(question_items, list):
        questions = [
            str(item).strip() for item in question_items if str(item).strip()
        ]
        if questions:
            return questions[:6]

    prompt_text = str(row.prompt_text or "").strip()
    bullet_points = [
        str(item).strip() for item in (row.bullet_points or []) if str(item).strip()
    ]
    topic_title = str(row.topic_title or "").strip()
    if row.part_number in {2, 3}:
        questions: list[str] = []
        if prompt_text:
            questions.append(prompt_text)
        questions.extend(bullet_points)
        return questions[:6]

    if prompt_text:
        split_questions = [
            part.strip()
            for part in re.split(r"(?<=[?])\s+", prompt_text)
            if part.strip()
        ]
        if len(split_questions) > 1:
            return split_questions[:6]
        sentence_questions = [
            part.strip()
            for part in re.split(r"(?<=[?.])\s+", prompt_text)
            if part.strip() and "?" in part
        ]
        if len(sentence_questions) > 1:
            return sentence_questions[:6]
        if "?" in prompt_text:
            return [prompt_text]
        comma_parts = [part.strip() for part in prompt_text.split(",") if part.strip()]
        if len(comma_parts) > 1:
            return [
                f"Let's talk about {part.lower()}." for part in comma_parts[:6]
            ]
        normalized_prompt = prompt_text.lower()
        normalized_title = topic_title.lower()
        if (
            not normalized_prompt
            or normalized_prompt == normalized_title
            or len(prompt_text.split()) <= 4
        ):
            return part1_fallback_questions(topic_title, prompt_text)
        return [prompt_text]

    if topic_title:
        return part1_fallback_questions(topic_title, prompt_text)
    return bullet_points[:6]


def serialize_topic(row: SpeakingTopic) -> SpeakingTopicListItem:
    metadata = dict(row.topic_metadata or {})
    icon = metadata.get("icon") if isinstance(metadata.get("icon"), str) else None
    icon_tone = (
        metadata.get("icon_tone")
        if isinstance(metadata.get("icon_tone"), str)
        else None
    )
    return SpeakingTopicListItem(
        id=row.id,
        part_number=row.part_number,
        topic_title=row.topic_title,
        prompt_text=row.prompt_text,
        bullet_points=list(row.bullet_points or []),
        difficulty_label=row.difficulty_label,
        category_tags=list(row.category_tags or []),
        sample_questions=extract_sample_questions(row),
        icon=icon,
        icon_tone=icon_tone,
        is_new_topic=metadata.get("is_new_topic") is True,
        followup_group_key=row.followup_group_key,
    )
