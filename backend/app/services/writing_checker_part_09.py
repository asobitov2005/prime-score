from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_checker_dependencies import *
from app.services.writing_checker_part_01 import _GraderPayload, _VOCAB_MAX_COUNT
from app.services.writing_checker_part_05 import _build_precise_next_steps, _build_precise_summary, _normalize_band_boundaries, _normalize_checklist_payload, _normalize_error_taxonomy, _normalize_target_actions
from app.services.writing_checker_part_06 import _augment_vocabulary_suggestions, _normalize_score_boosters, _normalize_sentence_fixes, _normalize_vocabulary_suggestions

def _build_payload(
    *,
    grader: _GraderPayload,
    annotations: list[dict[str, Any]],
    essay_text: str,
    task_type: str,
    word_count: int,
    word_minimum: int,
    desired_score: float | None,
    model_version: str,
    prompt_profile_version: int = 1,
    rubric_version: int = 1,
    anchor_set_version: int = 1,
    latency_ms: int = 0,
    descriptors: WritingDescriptorBundle | None = None,
    benchmarks: WritingBenchmarkCardBundle | None = None,
) -> dict[str, Any]:
    ta = round_criterion_band(grader.task_achievement.band)
    cc = round_criterion_band(grader.coherence.band)
    lr = round_criterion_band(grader.lexical.band)
    gra = round_criterion_band(grader.grammar.band)
    overall_pre_penalty = calculate_overall_band(ta, cc, lr, gra)

    penalty = 0.0
    if word_minimum > 0:
        if word_count < word_minimum * 0.6:
            penalty = 1.0
        elif word_count < word_minimum:
            penalty = 0.5

    overall_after_penalty = max(0.0, min(9.0, overall_pre_penalty - penalty))
    overall_after_penalty = round_to_ielts_band(overall_after_penalty)
    precise_summary = _build_precise_summary(
        grader=grader,
        overall_band=overall_after_penalty,
        penalty=penalty,
        word_count=word_count,
        word_minimum=word_minimum,
        ta=ta,
        cc=cc,
        lr=lr,
        gra=gra,
    )
    precise_next_steps = _build_precise_next_steps(
        grader=grader,
        annotations=annotations,
        word_count=word_count,
        ta=ta,
        cc=cc,
        lr=lr,
        gra=gra,
    )
    normalized_vocabulary = _normalize_vocabulary_suggestions(grader.vocabulary_suggestions)
    normalized_vocabulary = _augment_vocabulary_suggestions(
        task_type=task_type,
        essay_text=essay_text,
        annotations=annotations,
        items=normalized_vocabulary,
    )
    target_action_plan = _normalize_target_actions(
        grader=grader,
        precise_next_steps=precise_next_steps,
        annotations=annotations,
        overall_band=overall_after_penalty,
        desired_score=desired_score,
    )
    band_boundaries = _normalize_band_boundaries(grader=grader, ta=ta, cc=cc, lr=lr, gra=gra)
    ielts_checklist = _normalize_checklist_payload(grader)
    error_taxonomy = _normalize_error_taxonomy(grader)
    sentence_fixes = _normalize_sentence_fixes(grader=grader, annotations=annotations)
    score_boosters = _normalize_score_boosters(grader)

    feedback = {
        "task_achievement": {
            "band": ta,
            "summary": grader.task_achievement.summary,
            "strengths": grader.task_achievement.strengths,
            "improvements": grader.task_achievement.improvements,
            "evidence_quotes": grader.task_achievement.evidence_quotes,
            "reasoning": grader.task_achievement.reasoning,
        },
        "coherence": {
            "band": cc,
            "summary": grader.coherence.summary,
            "strengths": grader.coherence.strengths,
            "improvements": grader.coherence.improvements,
            "evidence_quotes": grader.coherence.evidence_quotes,
            "reasoning": grader.coherence.reasoning,
        },
        "lexical": {
            "band": lr,
            "summary": grader.lexical.summary,
            "strengths": grader.lexical.strengths,
            "improvements": grader.lexical.improvements,
            "evidence_quotes": grader.lexical.evidence_quotes,
            "reasoning": grader.lexical.reasoning,
        },
        "grammar": {
            "band": gra,
            "summary": grader.grammar.summary,
            "strengths": grader.grammar.strengths,
            "improvements": grader.grammar.improvements,
            "evidence_quotes": grader.grammar.evidence_quotes,
            "reasoning": grader.grammar.reasoning,
        },
        "overall_summary": precise_summary,
        "next_steps": precise_next_steps,
        "vocabulary_suggestions": normalized_vocabulary[:_VOCAB_MAX_COUNT],
        "target_action_plan": target_action_plan,
        "band_boundaries": band_boundaries,
        "ielts_checklist": ielts_checklist,
        "error_taxonomy": error_taxonomy,
        "sentence_fixes": sentence_fixes,
        "score_boosters": score_boosters,
    }

    rubric_reasoning = {
        "task_achievement": grader.task_achievement.reasoning,
        "coherence": grader.coherence.reasoning,
        "lexical": grader.lexical.reasoning,
        "grammar": grader.grammar.reasoning,
        "overall_pre_penalty": overall_pre_penalty,
        "word_count_penalty": penalty,
    }
    evaluation_run = build_pipeline_run_payload(
        ta=ta,
        cc=cc,
        lr=lr,
        gra=gra,
        overall_pre_penalty=overall_pre_penalty,
        final_band=overall_after_penalty,
        word_count_penalty=penalty,
        descriptors=descriptors,
        benchmarks=benchmarks,
    )

    return {
        "task_achievement_band": ta,
        "coherence_band": cc,
        "lexical_band": lr,
        "grammar_band": gra,
        "overall_band": overall_after_penalty,
        "potential_band": None,
        "word_count_penalty": penalty,
        "feedback": feedback,
        "inline_annotations": annotations,
        "improved_version": None,
        "rubric_reasoning": rubric_reasoning,
        "roast_feedback": {},
        "model_version": model_version,
        "prompt_version": f"profile:{prompt_profile_version}",
        "anchors_version": f"anchor:{anchor_set_version}",
        "grader_profile_version": prompt_profile_version,
        "rubric_version": rubric_version,
        "anchor_set_version": anchor_set_version,
        "roast_profile_version": prompt_profile_version,
        "improved_profile_version": prompt_profile_version,
        "annotation_profile_version": prompt_profile_version,
        "latency_ms": latency_ms,
        "evaluation_run": evaluation_run,
    }
