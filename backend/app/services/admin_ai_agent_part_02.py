from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.admin_ai_agent_dependencies import *
from app.services.admin_ai_agent_part_01 import _section_requires_paragraph_labels

def _serialize_example_group(test: Test, section: TestSection, group: QuestionGroup) -> dict[str, Any]:
    ordered_questions = sorted(group.questions, key=lambda item: item.number)
    return {
        "test": {
            "id": str(test.id),
            "title": test.title,
            "status": str(test.status.value),
            "source": str(test.source.value),
            "source_detail": str(test.source_detail or ""),
            "updated_at": test.updated_at.isoformat() if test.updated_at else None,
        },
        "section": {
            "id": str(section.id),
            "label": str(section.content.get("label") or section.title),
            "title": section.title,
            "show_labels": bool(section.content.get("showLabels", False)),
        },
        "group": {
            "id": str(group.id),
            "title": group.title,
            "instructions": group.instructions or "",
            "type_id": str(group.question_type.value),
            "question_start": group.question_start,
            "question_end": group.question_end,
            "shared_options_preview": list(group.shared_options)[:8],
            "question_block": str(group.shared_content.get("question_block") or "")[:800],
            "answer_block": str(group.shared_content.get("answer_block") or "")[:400],
            "secondary_block": str(group.shared_content.get("secondary_block") or "")[:400],
            "questions_preview": [
                {
                    "label": str(question.question_metadata.get("label") or f"Q{question.number}"),
                    "prompt": question.prompt,
                    "accepted_answers": [answer.value for answer in question.answer_variants],
                    "variants": list(question.question_metadata.get("variants", [])),
                }
                for question in ordered_questions[:5]
            ],
        },
    }

async def _load_question_group_examples(
    session: AsyncSession,
    *,
    question_type: str,
    test_type: str | None,
    published_only: bool,
    limit: int,
    exclude_test_id: str | None = None,
) -> list[dict[str, Any]]:
    query = (
        select(Test)
        .options(
            selectinload(Test.sections)
            .selectinload(TestSection.question_groups)
            .selectinload(QuestionGroup.questions)
            .selectinload(Question.answer_variants)
        )
        .join(Test.sections)
        .join(TestSection.question_groups)
        .where(QuestionGroup.question_type == ModelQuestionType(question_type))
        .order_by(Test.updated_at.desc(), Test.created_at.desc())
        .limit(max(limit * 4, limit))
    )
    if published_only:
        query = query.where(Test.status == ModelTestStatus.PUBLISHED)
    if test_type:
        query = query.where(Test.type == ModelTestType(test_type))
    if exclude_test_id:
        query = query.where(Test.id != UUID(exclude_test_id))

    tests = list((await session.scalars(query)).unique().all())
    examples: list[dict[str, Any]] = []
    for test in tests:
        for section in sorted(test.sections, key=lambda item: item.position):
            for group in sorted(section.question_groups, key=lambda item: (item.question_start, item.question_end)):
                if str(group.question_type.value) != question_type:
                    continue
                examples.append(_serialize_example_group(test, section, group))
                if len(examples) >= limit:
                    return examples
    return examples

def _compare_group_against_examples(
    *,
    section: AiDraftSectionInput,
    group: AiDraftQuestionGroupInput,
    examples: list[dict[str, Any]],
) -> dict[str, Any]:
    issues: list[str] = []
    recommended_show_labels = _section_requires_paragraph_labels([group.type_id])
    if section.show_labels != recommended_show_labels:
        issues.append(
            f"Section show_labels is {section.show_labels}, but {group.type_id} usually expects {recommended_show_labels}."
        )
    if group.type_id in {"reading_matching_features", "reading_matching_sentence_endings"} and not group.shared_options:
        issues.append("shared_options is empty for a matching group that normally uses reusable options.")
    if group.type_id == "reading_mc_single":
        too_short = [question.label for question in group.questions if len(question.variants) < 2]
        if too_short:
            issues.append(f"Some MC questions have too few variants: {', '.join(too_short)}.")
    return {
        "section_local_id": section.local_id,
        "group_title": group.title,
        "type_id": group.type_id,
        "recommended_show_labels": recommended_show_labels,
        "issues": issues,
        "examples": examples,
    }

def _extract_grounding_summary(response: Any) -> dict[str, Any] | None:
    candidates = list(getattr(response, "candidates", []) or [])
    if not candidates:
        return None
    metadata = getattr(candidates[0], "grounding_metadata", None)
    if metadata is None:
        return None

    web_queries = list(getattr(metadata, "web_search_queries", []) or [])
    sources: list[dict[str, str | None]] = []
    seen_uris: set[str] = set()
    for chunk in list(getattr(metadata, "grounding_chunks", []) or []):
        web = getattr(chunk, "web", None)
        if web is None:
            continue
        uri = getattr(web, "uri", None)
        if not uri or uri in seen_uris:
            continue
        seen_uris.add(uri)
        sources.append(
            {
                "title": getattr(web, "title", None),
                "domain": getattr(web, "domain", None),
                "uri": uri,
            }
        )
    return {
        "web_search_queries": web_queries,
        "sources": sources[:8],
    }

def _append_grounding_sources_to_text(text: str, grounding_summary: dict[str, Any] | None) -> str:
    if not grounding_summary:
        return text
    sources = list(grounding_summary.get("sources") or [])
    if not sources or "Sources:" in text:
        return text
    lines = [text.rstrip(), "", "Sources:"]
    for source in sources[:5]:
        title = source.get("title") or source.get("domain") or source.get("uri") or "Source"
        uri = source.get("uri") or ""
        lines.append(f"- {title}: {uri}")
    return "\n".join(lines).strip()

def _question_type_definitions() -> list[dict[str, str]]:
    return [
        {"id": "reading_mc_single", "label": "Multiple Choice (single answer)", "family": "selection", "description": "One correct option."},
        {"id": "reading_mc_multiple", "label": "Multiple Choice (multiple answers)", "family": "selection", "description": "Multiple correct options."},
        {"id": "reading_true_false_not_given", "label": "True / False / Not Given", "family": "selection", "description": "Three-way truth classification."},
        {"id": "reading_yes_no_not_given", "label": "Yes / No / Not Given", "family": "selection", "description": "Author claim agreement."},
        {"id": "reading_matching_information", "label": "Matching Information", "family": "matching", "description": "Match facts to paragraphs."},
        {"id": "reading_matching_headings", "label": "Matching Headings", "family": "matching", "description": "Choose the best heading."},
        {"id": "reading_matching_features", "label": "Matching Features", "family": "matching", "description": "Reusable options matched to items."},
        {"id": "reading_matching_sentence_endings", "label": "Matching Sentence Endings", "family": "matching", "description": "Reusable ending options matched to stems."},
        {"id": "reading_sentence_completion", "label": "Sentence Completion", "family": "completion", "description": "Fill in blanks from the passage."},
        {"id": "reading_summary_completion_wordbank", "label": "Summary Completion (word bank)", "family": "completion", "description": "Use provided word options."},
        {"id": "reading_summary_completion_freetext", "label": "Summary Completion (free text)", "family": "completion", "description": "Type the answer exactly."},
        {"id": "reading_note_completion", "label": "Note / Table / Flow-chart Completion", "family": "completion", "description": "Structured completion blocks."},
        {"id": "reading_diagram_labeling", "label": "Diagram / Map Labeling", "family": "labeling", "description": "Label a visual asset."},
        {"id": "reading_short_answer", "label": "Short Answer Questions", "family": "short-answer", "description": "Concise answer input."},
        {"id": "listening_mc_single", "label": "Listening MC Single", "family": "selection", "description": "One correct option."},
        {"id": "listening_mc_multiple", "label": "Listening MC Multiple", "family": "selection", "description": "Multiple correct options."},
        {"id": "listening_matching", "label": "Listening Matching", "family": "matching", "description": "Pair items with answers."},
        {"id": "listening_plan_map_labeling", "label": "Listening Plan / Map / Diagram Labeling", "family": "labeling", "description": "Place labels on a visual."},
        {"id": "listening_form_completion", "label": "Listening Form / Note / Table Completion", "family": "completion", "description": "Structured blank filling."},
        {"id": "listening_sentence_completion", "label": "Listening Sentence Completion", "family": "completion", "description": "Complete the sentence."},
        {"id": "listening_short_answer", "label": "Listening Short Answer", "family": "short-answer", "description": "Concise answer input."},
    ]

def _builder_rules() -> list[str]:
    return [
        "Always inspect supported question types before saving a new test draft.",
        "Save as draft first unless the admin explicitly asks to publish.",
        "For structural changes to a published test, create or update a draft version instead of quick-fix.",
        "reading_short_answer uses [] inside question text to represent blank inputs in authored content.",
        "reading_matching_headings can pin an example heading with syntax like A->Heading text; pinned headings should not stay in the open option list.",
        "reading_matching_features and reading_matching_sentence_endings use reusable dropdown options; do not model them as one-time drag/drop options.",
        "reading_diagram_labeling supports diagram_title and diagram_image_url on the question group.",
        "Question numbering must be sequential across groups and passages; if unsure, inspect an existing draft example first.",
    ]

class AiDraftMetadataInput(BaseModel):
    title: str
    type: Literal["reading", "listening"] = "reading"
    format: str = "full"
    source: Literal["cambridge", "real_exam", "custom"] = "custom"
    source_detail: str = ""
    access_type: Literal["public", "premium"] = "public"
    time_limit_label: str = "60 min exam"

class AiDraftSectionInput(BaseModel):
    local_id: str
    id: str | None = None
    label: str
    title: str
    subtitle: str = ""
    content: str = ""
    paragraphs: list[dict[str, Any]] = Field(default_factory=list)
    show_labels: bool = False
    media_kind: Literal["text", "audio"] = "text"
    marker_count: int = 0

class AiDraftQuestionInput(BaseModel):
    id: str | None = None
    label: str
    prompt: str
    accepted_answers: list[str] = Field(default_factory=list)
    explanation: str = ""
    variants: list[str] = Field(default_factory=list)

class AiDraftQuestionGroupInput(BaseModel):
    id: str | None = None
    section_local_id: str
    title: str
    instructions: str
    type_id: str
    question_start: int
    question_end: int
    shared_options: list[str] = Field(default_factory=list)
    question_block: str = ""
    answer_block: str = ""
    secondary_block: str = ""
    diagram_title: str = ""
    diagram_image_url: str = ""
    questions: list[AiDraftQuestionInput] = Field(default_factory=list)

class AiDraftPayloadInput(BaseModel):
    metadata: AiDraftMetadataInput
    sections: list[AiDraftSectionInput] = Field(default_factory=list)
    question_groups: list[AiDraftQuestionGroupInput] = Field(default_factory=list)

class GetDraftTemplateArgs(BaseModel):
    test_type: Literal["reading", "listening"] = "reading"
    title: str | None = None
    access_type: Literal["public", "premium"] = "public"

class ListQuestionTypesArgs(BaseModel):
    test_type: Literal["reading", "listening", "all"] = "reading"

class ListTestsArgs(BaseModel):
    query: str | None = None
    test_type: Literal["reading", "listening"] | None = None
    status: Literal["draft", "published", "archived"] | None = None
    limit: int = Field(default=10, ge=1, le=50)
