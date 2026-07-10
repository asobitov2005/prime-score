from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_checker_dependencies import *
from app.services.writing_checker_part_01 import _CriterionPayload, _GENERIC_PATTERNS, _GROQ_ANCHOR_COUNT, _GROQ_ANCHOR_RATIONALE_LIMIT, _GROQ_RUBRIC_CHAR_LIMIT, _GraderPayload, _WHITESPACE_RE
from app.services.writing_checker_part_02 import _normalize_essay
from app.services.writing_checker_part_03 import _compact_text_block, _is_groq_config

def _extract_band_block(section_text: str, band: int) -> str:
    pattern = re.compile(rf"Band {band}\n(?P<body>.*?)(?=\n\nBand \d+\n|\Z)", re.DOTALL)
    match = pattern.search(section_text)
    if match is None:
        return ""
    lines = [line.strip(" -\t") for line in match.group("body").splitlines() if line.strip()]
    return " ".join(lines)

def _select_task_specific_band_text(raw_text: str, *, task_type: str) -> str:
    if "Task 1:" not in raw_text and "Task 2:" not in raw_text:
        return raw_text
    wanted = "Task 1:" if task_type == WritingTaskType.TASK_1.value else "Task 2:"
    for chunk in raw_text.split("Task "):
        normalized = chunk.strip()
        if normalized.startswith(wanted.replace("Task ", "")):
            return f"Task {normalized}"
    return raw_text

def _extract_rubric_section(body: str, heading: str, next_heading: str | None) -> str:
    start = body.find(heading)
    if start == -1:
        return ""
    end = body.find(next_heading, start + len(heading)) if next_heading else -1
    if end == -1:
        end = len(body)
    return body[start:end]

def _build_groq_rubric_reference(rubric: WritingRubricBundle, *, task_type: str) -> str:
    body = rubric.body or ""
    sections = [
        (
            "Task Response",
            _extract_rubric_section(body, "1. TASK ACHIEVEMENT", "2. COHERENCE AND COHESION"),
        ),
        (
            "Coherence",
            _extract_rubric_section(body, "2. COHERENCE AND COHESION", "3. LEXICAL RESOURCE"),
        ),
        (
            "Lexical",
            _extract_rubric_section(body, "3. LEXICAL RESOURCE", "4. GRAMMATICAL RANGE AND ACCURACY"),
        ),
        (
            "Grammar",
            _extract_rubric_section(body, "4. GRAMMATICAL RANGE AND ACCURACY", "GRADING INSTRUCTIONS"),
        ),
    ]
    summary_lines = [
        "Use IELTS descriptors conservatively. If the essay sits between bands, choose the lower band.",
    ]
    for label, section in sections:
        if not section:
            continue
        band_parts: list[str] = []
        for band in (8, 7, 6, 5):
            excerpt = _extract_band_block(section, band)
            excerpt = _select_task_specific_band_text(excerpt, task_type=task_type)
            excerpt = _compact_text_block(excerpt, limit=220)
            if excerpt:
                band_parts.append(f"{band}: {excerpt}")
        if band_parts:
            summary_lines.append(f"{label} bands -> " + " | ".join(band_parts))
    return _compact_text_block("\n".join(summary_lines), limit=_GROQ_RUBRIC_CHAR_LIMIT)

def _build_groq_anchor_reference(anchors: WritingAnchorBundle) -> str:
    if not anchors.items:
        return "No anchor snapshots provided."
    lines: list[str] = []
    for anchor in anchors.items[:_GROQ_ANCHOR_COUNT]:
        criteria = anchor.get("criteria", {})
        rationale = _compact_text_block(anchor.get("rationale", ""), limit=_GROQ_ANCHOR_RATIONALE_LIMIT)
        lines.append(
            "Band {band}: TA {ta}, CC {cc}, LR {lr}, GRA {gra}. Snapshot: {rationale}".format(
                band=anchor.get("band"),
                ta=criteria.get("task_achievement"),
                cc=criteria.get("coherence"),
                lr=criteria.get("lexical"),
                gra=criteria.get("grammar"),
                rationale=rationale or "No rationale provided.",
            )
        )
    return "\n".join(lines)

def _build_groq_system_instruction(
    *,
    rubric: WritingRubricBundle,
    task_type: str,
) -> str:
    return "\n\n".join(
        [
            "You are a strict IELTS Writing examiner.",
            "Score only what is on the page. Do not reward effort, memorised polish, or generic AI-style fluency.",
            "Do not award Band 8+ for safe, formulaic, or merely error-light writing unless descriptor evidence is unmistakable.",
            "Clear but predictable ideas, mechanical transitions, safe repeated vocabulary, or conventional grammar usually cap the relevant criterion around Band 7.0-7.5.",
            "Quote short phrases from the essay as evidence. Keep summaries concrete and essay-specific.",
            _build_groq_rubric_reference(rubric, task_type=task_type),
        ]
    )

def _build_groq_grading_prompt(
    *,
    anchors: WritingAnchorBundle,
    task_type: str,
    task_prompt_text: str,
    image_summary: str,
    essay_text: str,
    desired_score: float | None,
) -> str:
    prompt_parts = [
        f"TASK TYPE: {task_type.upper()}",
        f"TASK PROMPT:\n{task_prompt_text.strip()}",
    ]
    if task_type == WritingTaskType.TASK_1.value and image_summary.strip():
        prompt_parts.append(
            "VISUAL DESCRIPTION (ground truth, do not reinterpret):\n"
            + image_summary.strip()
        )
    prompt_parts.extend(
        [
            "CALIBRATION SNAPSHOTS:",
            _build_groq_anchor_reference(anchors),
            "TARGET SCORE CONTEXT:",
            (
                f"Dashboard Desired Score: Band {desired_score:.1f}. "
                "If the essay is below that target, make next_steps a realistic +0.5 to +1.0 band path without overloading the learner. "
                "If it already meets or exceeds the target, make next_steps preserve the current band and push toward the next realistic +0.5 to +1.0 band."
                if desired_score is not None
                else "No learner desired score provided. Make next_steps target the next realistic +0.5 to +1.0 band."
            ),
            "OUTPUT CONTRACT:",
            "Return JSON only.",
            "Top-level keys: task_achievement, coherence, lexical, grammar, overall_summary, next_steps, inline_annotations, vocabulary_suggestions, target_action_plan, band_boundaries, ielts_checklist, error_taxonomy, sentence_fixes, score_boosters.",
            "Each criterion object must contain: band, reasoning, summary, strengths, improvements, evidence_quotes.",
            "Use whole criterion bands only: 0, 1, 2, 3, 4, 5, 6, 7, 8, or 9. Do not output 5.5, 6.5, 7.5, or 8.5 for any individual criterion.",
            "Keep strengths/improvements/evidence_quotes short and specific: 1-2 items each.",
            "overall_summary: exactly 2 short sentences.",
            "next_steps: exactly 3 short strings tied to this essay.",
            "target_action_plan: exactly 3 objects with title, why, how, example, band_impact, priority. Aim for realistic +0.5 to +1.0 improvement, not an impossible rewrite.",
            "band_boundaries: 4 objects, one per IELTS criterion, explaining why current band holds and what the next realistic +0.5 to +1.0 needs.",
            "ielts_checklist: 5 task-specific items with label, status, detail, how_to_fix.",
            "error_taxonomy: 3-6 repeated weak patterns with category, subcategory, label, count, examples, fix.",
            "sentence_fixes: 3-8 priority sentence-level corrections with original, replacement, corrected_sentence, why, band_impact, category.",
            "score_boosters: 3-6 original phrases/sentences that helped the band. Include criterion, exact original text, why_it_scores, keep_doing, band_value. band_value must describe scoring effect, not overclaim a full band.",
            "STRICT SCORING CALIBRATION: Band 8 requires clear descriptor evidence, not just good structure and few mistakes. Predictable ideas, formulaic transitions, safe vocabulary, or conventional grammar usually cap that criterion at 7.0-7.5.",
            "TARGET INTEGRITY: Desired Score is only a coaching goal, not a scoring boost. Never inflate a band so the learner passes the target. If evidence is between two bands, choose the lower band unless the higher descriptor is consistently proven across the whole essay.",
            "inline_annotations: return [].",
            "vocabulary_suggestions: return [].",
            "===== CANDIDATE ESSAY START =====",
            essay_text,
            "===== CANDIDATE ESSAY END =====",
        ]
    )
    return "\n\n".join(part for part in prompt_parts if part)

def _format_anchors_block(anchors: list[dict[str, Any]]) -> str:
    blocks: list[str] = []
    for anchor in anchors:
        criteria = anchor.get("criteria", {})
        blocks.append(
            "----- ANCHOR ESSAY (Band {band}) -----\n"
            "Criteria bands -> TA: {ta}, CC: {cc}, LR: {lr}, GRA: {gra}\n"
            "Rationale: {rationale}\n"
            "Essay:\n{essay}\n----- END ANCHOR -----".format(
                band=anchor.get("band"),
                ta=criteria.get("task_achievement"),
                cc=criteria.get("coherence"),
                lr=criteria.get("lexical"),
                gra=criteria.get("grammar"),
                rationale=anchor.get("rationale", ""),
                essay=anchor.get("essay", ""),
            )
        )
    return "\n\n".join(blocks)

def _build_system_instruction(
    *,
    prompts: WritingPromptBundle,
    rubric: WritingRubricBundle,
    resolved_config: ResolvedAiUseCaseConfig | None = None,
    task_type: str,
) -> str:
    if _is_groq_config(resolved_config):
        return _build_groq_system_instruction(rubric=rubric, task_type=task_type)
    return render_grader_system_prompt(prompts=prompts, rubric=rubric)

def _build_grading_prompt(
    *,
    prompts: WritingPromptBundle,
    anchors: WritingAnchorBundle,
    resolved_config: ResolvedAiUseCaseConfig | None = None,
    task_type: str,
    task_prompt_text: str,
    image_summary: str,
    essay_text: str,
    desired_score: float | None = None,
) -> str:
    if _is_groq_config(resolved_config):
        return _build_groq_grading_prompt(
            anchors=anchors,
            task_type=task_type,
            task_prompt_text=task_prompt_text,
            image_summary=image_summary,
            essay_text=essay_text,
            desired_score=desired_score,
        )
    return render_grader_user_prompt(
        prompts=prompts,
        anchors=anchors,
        task_type=task_type,
        task_prompt_text=task_prompt_text,
        image_summary=image_summary,
        essay_text=essay_text,
        desired_score=desired_score,
    )

def _clean_text(value: str | None) -> str:
    return _WHITESPACE_RE.sub(" ", (value or "").strip())

def _trim_sentence(value: str, *, limit: int = 220) -> str:
    cleaned = _clean_text(value)
    if len(cleaned) <= limit:
        return cleaned
    shortened = cleaned[:limit].rsplit(" ", 1)[0].rstrip(" ,;:")
    return f"{shortened}..."

def _is_generic_text(value: str | None) -> bool:
    cleaned = _normalize_essay(value or "")
    if not cleaned:
        return True
    return any(pattern in cleaned for pattern in _GENERIC_PATTERNS)

def _criterion_records(
    grader: _GraderPayload,
    *,
    ta: float,
    cc: float,
    lr: float,
    gra: float,
) -> list[tuple[str, float, _CriterionPayload]]:
    return [
        ("Task Achievement", ta, grader.task_achievement),
        ("Coherence & Cohesion", cc, grader.coherence),
        ("Lexical Resource", lr, grader.lexical),
        ("Grammatical Range & Accuracy", gra, grader.grammar),
    ]

def _criterion_anchor_text(criterion: _CriterionPayload) -> str:
    for bucket in (criterion.evidence_quotes, criterion.improvements, criterion.strengths):
        for item in bucket:
            cleaned = _clean_text(item)
            if cleaned:
                return cleaned
    return ""
