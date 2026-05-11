from __future__ import annotations

from types import SimpleNamespace

from app.services.writing_checker import (
    _AnnotationPayload,
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
      "inline_annotations": []
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
