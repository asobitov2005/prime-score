from __future__ import annotations

from types import SimpleNamespace

from app.services.writing_checker import (
    _AnnotationPayload,
    _CriterionPayload,
    _GraderPayload,
    _build_payload,
    _call_annotation_recovery,
    _call_grader,
    _dedupe_annotations,
    _validate_annotations,
)


def _valid_grader_json() -> str:
    return """
    {
      "task_achievement": {
        "band": 6.0,
        "reasoning": "Addresses the task clearly.",
        "summary": "Main points are present.",
        "strengths": ["Relevant overview"],
        "improvements": ["Add one clearer comparison"],
        "evidence_quotes": ["overall, sales increased"]
      },
      "coherence": {
        "band": 6.0,
        "reasoning": "Paragraphing is mostly logical.",
        "summary": "Flow is generally easy to follow.",
        "strengths": ["Clear grouping"],
        "improvements": ["Use transitions more precisely"],
        "evidence_quotes": ["In contrast"]
      },
      "lexical": {
        "band": 6.0,
        "reasoning": "Vocabulary is adequate with some variety.",
        "summary": "Word choice is serviceable.",
        "strengths": ["Some topic terms"],
        "improvements": ["Avoid repeating common verbs"],
        "evidence_quotes": ["rose gradually"]
      },
      "grammar": {
        "band": 6.0,
        "reasoning": "Sentence control is mixed but understandable.",
        "summary": "Grammar errors do not block meaning.",
        "strengths": ["Some accurate complex clauses"],
        "improvements": ["Tighten article usage"],
        "evidence_quotes": ["the number of"]
      },
      "overall_summary": "A competent response with room for sharper detail.",
      "next_steps": ["Add one precise data comparison", "Vary linkers"],
      "inline_annotations": [],
      "vocabulary_suggestions": [
        {
          "current_phrase": "go up",
          "improved_phrase": "rise markedly",
          "level": "C1",
          "why_it_works": "It sounds more precise and academic than a basic phrasal verb.",
          "example_sentence": "Overall, the proportion of online sales rose markedly over the period."
        }
      ]
    }
    """.strip()


def test_call_grader_repairs_invalid_json() -> None:
    broken_response = """
    {
      "task_achievement": {
        "band": 6.0,
        "reasoning": "This quote breaks JSON: "overall",
        "summary": "Main points are present."
      }
    }
    """.strip()
    repaired_response = _valid_grader_json()
    calls: list[str] = []

    class _Models:
        def generate_content(self, *, contents: str, **_: object) -> SimpleNamespace:
            calls.append(contents)
            if len(calls) < 4:
                return SimpleNamespace(text=broken_response)
            return SimpleNamespace(text=repaired_response)

    client = SimpleNamespace(models=_Models())

    payload = _call_grader(
        client=client,
        system_instruction="system",
        prompt="prompt",
        essay_text="This is a complete essay with enough words to count as a real attempt in the checker.",
        seed=123,
    )

    assert payload.task_achievement.band == 6.0
    assert len(calls) == 4


def test_validate_annotations_realigns_nearby_original_text() -> None:
    essay = "The table show the averge band scores."
    annotations = [
        _AnnotationPayload(
            offset=0,
            length=4,
            original="show",
            replacements=["shows"],
            category="grammar",
            severity="error",
            short_message="Use singular verb.",
            explanation="Singular subject takes singular verb.",
            band_impact="This lowers Grammatical Range & Accuracy.",
            examiner_tip="Use singular verbs after singular nouns in introductions.",
            improved_sentence="The table shows the averge band scores.",
        ),
        _AnnotationPayload(
            offset=20,
            length=6,
            original="averge",
            replacements=["average"],
            category="spelling",
            severity="error",
            short_message="Correct spelling.",
            explanation="The word is misspelled.",
            band_impact="This lowers Lexical Resource because core academic words are misspelled.",
            examiner_tip="Spell common task vocabulary accurately.",
            improved_sentence="The table show the average band scores.",
        ),
    ]

    cleaned = _validate_annotations(annotations, essay)

    assert [item["original"] for item in cleaned] == ["show", "averge"]
    assert [item["offset"] for item in cleaned] == [10, 19]
    assert cleaned[0]["band_impact"] == "This lowers Grammatical Range & Accuracy."
    assert cleaned[1]["improved_sentence"] == "The table show the average band scores."


def test_call_annotation_recovery_parses_annotation_array() -> None:
    annotation_response = """
    [
      {
        "offset": 10,
        "length": 4,
        "original": "show",
        "replacements": ["shows"],
        "category": "grammar",
        "severity": "error",
        "short_message": "Use singular verb.",
        "explanation": "Singular subject takes singular verb.",
        "band_impact": "This hurts Grammatical Range & Accuracy.",
        "examiner_tip": "Use the singular verb form after 'table'.",
        "improved_sentence": "The table shows the average band scores."
      }
    ]
    """.strip()

    class _Models:
        def generate_content(self, **_: object) -> SimpleNamespace:
            return SimpleNamespace(text=annotation_response)

    client = SimpleNamespace(models=_Models())

    payload = _call_annotation_recovery(
        client=client,
        essay_text="The table show the average band scores.",
        hints=["Use singular verb."],
        seed=123,
    )

    assert len(payload) == 1
    assert payload[0].original == "show"
    assert payload[0].band_impact == "This hurts Grammatical Range & Accuracy."


def test_dedupe_annotations_prefers_richer_detail() -> None:
    deduped = _dedupe_annotations(
        [
            {
                "offset": 10,
                "length": 4,
                "original": "show",
                "replacements": ["shows"],
                "category": "grammar",
                "severity": "error",
                "short_message": "Verb form",
                "explanation": "Short.",
                "band_impact": "",
                "examiner_tip": "",
                "improved_sentence": "",
            },
            {
                "offset": 10,
                "length": 4,
                "original": "show",
                "replacements": ["shows"],
                "category": "grammar",
                "severity": "error",
                "short_message": "Subject-verb agreement",
                "explanation": "The singular noun 'table' requires the verb 'shows' in present simple.",
                "band_impact": "This affects Grammatical Range & Accuracy.",
                "examiner_tip": "Keep singular subjects with singular verbs.",
                "improved_sentence": "The table shows the average band scores.",
            },
        ]
    )

    assert len(deduped) == 1
    assert deduped[0]["short_message"] == "Subject-verb agreement"


def test_call_grader_rejects_partial_zero_band_payload_for_real_essay() -> None:
    broken_but_valid = """
    {
      "task_achievement": {
        "band": 7.0,
        "reasoning": "Addresses the question.",
        "summary": "Clear position.",
        "strengths": ["Clear opinion"],
        "improvements": ["Develop one point more fully"],
        "evidence_quotes": ["In my opinion"]
      },
      "coherence": {
        "band": 0.0,
        "reasoning": "",
        "summary": "",
        "strengths": [],
        "improvements": [],
        "evidence_quotes": []
      },
      "lexical": {
        "band": 0.0,
        "reasoning": "",
        "summary": "",
        "strengths": [],
        "improvements": [],
        "evidence_quotes": []
      },
      "grammar": {
        "band": 0.0,
        "reasoning": "",
        "summary": "",
        "strengths": [],
        "improvements": [],
        "evidence_quotes": []
      },
      "overall_summary": "Clear response with room for improvement.",
      "next_steps": ["Improve grammar.", "Use better vocabulary.", "Be more specific."],
      "inline_annotations": [],
      "vocabulary_suggestions": []
    }
    """.strip()

    class _Models:
        def generate_content(self, **_: object) -> SimpleNamespace:
            return SimpleNamespace(text=broken_but_valid)

    client = SimpleNamespace(models=_Models())

    try:
        _call_grader(
            client=client,
            system_instruction="system",
            prompt="prompt",
            essay_text=(
                "This essay contains enough content to count as a real IELTS attempt and should "
                "not receive zero bands in three criteria."
            ),
            seed=123,
        )
    except RuntimeError as exc:
        assert "invalid or incomplete payload" in str(exc)
    else:
        raise AssertionError("Expected partial zero-band payload to be rejected")


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
        model_version="test-model",
        latency_ms=12,
    )

    assert "strongest area" in payload["feedback"]["overall_summary"].lower()
    assert "weakest" in payload["feedback"]["overall_summary"].lower() or "score limit" in payload["feedback"]["overall_summary"].lower()
    assert len(payload["feedback"]["next_steps"]) == 3
    assert payload["feedback"]["next_steps"][0].startswith("Replace 'very big problem'")
    assert len(payload["feedback"]["vocabulary_suggestions"]) >= 10
