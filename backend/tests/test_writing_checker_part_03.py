from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_writing_checker_dependencies import *

def test_build_payload_rewrites_generic_summary_and_backfills_vocab() -> None:
    grader = _GraderPayload(
        task_achievement=_CriterionPayload(
            band=6.5,
            summary="The response addresses both parts of the question but develops one idea more fully than the other.",
            strengths=["Clear position throughout the essay."],
            improvements=["extend the second body paragraph with one more specific consequence"],
            evidence_quotes=["I believe government should invest more in public transport"],
            reasoning="The response stays on task but one supporting point is thinner than the others.",
        ),
        coherence=_CriterionPayload(
            band=6.0,
            summary="The essay is easy to follow overall, but some paragraph links feel mechanical.",
            strengths=["Body paragraphs follow a logical order."],
            improvements=["replace repetitive linkers such as 'Firstly' and 'Secondly' with more natural transitions"],
            evidence_quotes=["Firstly", "Secondly"],
            reasoning="Organisation is clear, but cohesive devices are somewhat repetitive.",
        ),
        lexical=_CriterionPayload(
            band=6.0,
            summary="Vocabulary is adequate, but several phrases sound too basic for a higher band.",
            strengths=["Some accurate topic vocabulary about transport and pollution."],
            improvements=["upgrade repetitive wording like 'very big problem' to more precise academic phrasing"],
            evidence_quotes=["very big problem"],
            reasoning="Word choice is understandable but occasionally basic and repetitive.",
        ),
        grammar=_CriterionPayload(
            band=5.5,
            summary="Grammar errors are noticeable in complex sentences.",
            strengths=["Simple sentences are mostly accurate."],
            improvements=["fix article and subject-verb agreement errors in the second paragraph"],
            evidence_quotes=["the traffic are increasing"],
            reasoning="Error frequency increases when the writer attempts more complex clauses.",
        ),
        overall_summary="A clear response with room for improvement.",
        next_steps=["Improve grammar.", "Use better vocabulary.", "Be more specific."],
        inline_annotations=[],
        vocabulary_suggestions=[],
    )

    payload = _build_payload(
        grader=grader,
        annotations=[
            {
                "offset": 48,
                "length": 16,
                "original": "very big problem",
                "replacements": ["pressing concern"],
                "category": "lexical",
                "severity": "suggestion",
                "short_message": "Basic wording",
                "explanation": "The phrase is understandable but too plain for a stronger IELTS lexical profile.",
                "band_impact": "This holds Lexical Resource at a mid-band level.",
                "examiner_tip": "Use a more precise noun phrase when describing social issues.",
                "improved_sentence": "Traffic congestion has become a pressing concern in many large cities.",
            },
        ],
        essay_text="Traffic congestion is a very big problem in many cities.",
        task_type="task_2",
        word_count=210,
        word_minimum=250,
        desired_score=None,
        model_version="test-model",
        latency_ms=12,
    )

    assert "strongest area" in payload["feedback"]["overall_summary"].lower()
    assert "weakest" in payload["feedback"]["overall_summary"].lower() or "score limit" in payload["feedback"]["overall_summary"].lower()
    assert len(payload["feedback"]["next_steps"]) == 3
    assert payload["feedback"]["next_steps"][0].startswith("Replace 'very big problem'")
    assert payload["feedback"]["vocabulary_suggestions"] == [
        {
            "current_phrase": "very big problem",
            "improved_phrase": "pressing concern",
            "level": "C1",
            "why_it_works": "The phrase is understandable but too plain for a stronger IELTS lexical profile.",
            "example_sentence": "Traffic congestion has become a pressing concern in many large cities.",
        }
    ]
    assert payload["grammar_band"] == 5.0
    assert payload["evaluation_run"]["confidence"]
    assert "possible_score_range" in payload["evaluation_run"]

def test_writing_criteria_are_whole_bands_only() -> None:
    assert round_criterion_band(5.0) == 5.0
    assert round_criterion_band(5.5) == 5.0
    assert round_criterion_band(6.9) == 6.0
    assert round_criterion_band(9.3) == 9.0

def test_blueprint_benchmark_selection_returns_nearby_anchors() -> None:
    cards = [card for card in BLUEPRINT_BENCHMARK_CARDS if card["task_type_scope"] == "task_2"]
    selected = select_benchmark_cards(
        cards,
        initial_score=6.5,
        weakness_profile={"weakest_criterion": "grammar"},
    )

    assert len(selected) >= 3
    assert any(card["band"] < 6.5 for card in selected)
    assert any(card["band"] == 6.5 for card in selected)
    assert any(card["band"] > 6.5 for card in selected)
