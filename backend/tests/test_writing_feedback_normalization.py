from app.services import writing_checker as checker
from app.api.routes.writing_part_02 import _parse_band_boundaries, _parse_score_boosters, _parse_target_actions
from app.schemas.writing import WritingActionPlan, WritingCriterionFeedback


def grader(**feedback):
    criterion = {"band": 6, "summary": "Clear and effective organisation.",
                 "strengths": ["Clear organisation."], "improvements": [],
                 "reasoning": "The criterion matches the descriptor.", "evidence_quotes": ["The essay"]}
    return checker._GraderPayload(**{
        key: criterion for key in ("task_achievement", "coherence", "lexical", "grammar")
    }, **feedback)


def test_empty_model_feedback_survives_normalization_and_api_parsers():
    payload = checker._build_payload(
        grader=grader(next_steps=[], target_action_plan=[], band_boundaries=[], score_boosters=[],
                      ielts_checklist=[], error_taxonomy=[]),
        annotations=[{"original": "The essay", "replacements": ["This essay"], "category": "style",
                      "short_message": "A model suggestion", "explanation": "A supplied explanation"}],
        essay_text="The essay is here.", task_type="task_2", word_count=4, word_minimum=250,
        desired_score=9, model_version="test",
    )
    feedback = payload["feedback"]
    for key in ("next_steps", "target_action_plan", "band_boundaries", "score_boosters", "ielts_checklist", "error_taxonomy"):
        assert feedback[key] == []
    criteria = {key: WritingCriterionFeedback.model_validate(feedback[key])
                for key in ("task_achievement", "coherence", "lexical", "grammar")}
    assert _parse_target_actions(feedback, WritingActionPlan(fixes=["Do not infer a target"]), 6, 9) == []
    assert _parse_band_boundaries(feedback, **criteria) == []
    assert _parse_score_boosters(feedback, **criteria) == []


def test_target_actions_keep_full_text_and_do_not_supply_band_claims():
    long_text = "Full model explanation with  exact\nformatting. " * 20
    model = grader(target_action_plan=[{"title": "Revise", "how": long_text, "example": long_text}])
    actions = checker._normalize_target_actions(
        grader=model, precise_next_steps=["Do not add another action"], annotations=[{"original": "The essay"}],
        overall_band=5, desired_score=9,
    )
    assert actions == [model.target_action_plan[0].model_dump()]
    assert actions[0]["how"] == actions[0]["example"] == long_text
    assert actions[0]["why"] == actions[0]["band_impact"] == ""


def test_boundary_zero_and_partial_lists_are_not_replaced_by_guessed_bands():
    long_text = "A complete model descriptor justification. " * 20
    model = grader(band_boundaries=[{"criterion": "Grammar", "current_band": 0, "next_band": 0,
                                    "why_current": long_text, "required_for_next": long_text}])
    boundaries = checker._normalize_band_boundaries(grader=model, ta=6, cc=6, lr=6, gra=6)
    assert boundaries == [model.band_boundaries[0].model_dump()]
    assert boundaries[0]["next_band"] == 0


def test_missing_or_invalid_boundary_bands_are_not_filled():
    model = grader(band_boundaries=[
        {"criterion": "Grammar", "current_band": 6},
        {"criterion": "Lexical", "current_band": 6.5, "next_band": 7},
        {"criterion": "Coherence", "current_band": 6, "next_band": 10},
    ])
    assert checker._normalize_band_boundaries(grader=model, ta=6, cc=6, lr=6, gra=6) == []


def test_next_steps_are_explicit_model_actions_not_relabelled_praise():
    text = "The exact model-provided action. " * 20
    for steps in ([], [text]):
        result = checker._build_precise_next_steps(
            grader=grader(next_steps=steps), annotations=[], word_count=250, ta=6, cc=6, lr=6, gra=6,
        )
        assert result == steps


def test_checklist_and_taxonomy_do_not_invent_status_categories_or_clip_text():
    text = "An exact  model\nexplanation and source span. " * 20
    model = grader(
        ielts_checklist=[{"label": "Coverage", "status": "met", "detail": text, "how_to_fix": text},
                         {"label": "No status"}, {"label": "Invalid", "status": "unknown"}],
        error_taxonomy=[{"category": "grammar", "label": "Agreement", "count": 2, "examples": [text], "fix": text},
                        {"label": "No supplied category", "count": 2},
                        {"category": "grammar", "label": "No supplied count"}],
    )
    assert checker._normalize_checklist_payload(model) == [model.ielts_checklist[0].model_dump()]
    assert checker._normalize_error_taxonomy(model) == [model.error_taxonomy[0].model_dump()]
