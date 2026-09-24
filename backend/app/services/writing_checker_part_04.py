from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_checker_dependencies import *
from app.services.writing_checker_part_01 import _CriterionPayload, _GraderPayload, _WHITESPACE_RE
from app.services.writing_checker_part_02 import _normalize_essay
from app.services.writing_checker_part_03 import _compact_text_block, _is_groq_config
from app.services.writing_prompt_grounding import GROUNDING_POLICY

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
    return render_grader_system_prompt(prompts=prompts, rubric=rubric) + "\n\n" + GROUNDING_POLICY

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
