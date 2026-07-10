from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_writing_checker_dependencies import *
from tests.test_writing_checker_part_01 import _groq_resolved_config

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

def test_call_annotation_recovery_omits_thinking_config_for_writing_model() -> None:
    seen_config: object | None = None

    class _Models:
        def generate_content(self, **kwargs: object) -> SimpleNamespace:
            nonlocal seen_config
            seen_config = kwargs.get("config")
            return SimpleNamespace(
                text="""
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
            )

    client = SimpleNamespace(models=_Models())

    payload = _call_annotation_recovery(
        client=client,
        essay_text="The table show the average band scores.",
        hints=["Use singular verb."],
        seed=123,
    )

    assert len(payload) == 1
    assert seen_config is not None
    assert getattr(seen_config, "thinkingConfig", None) is None

def test_call_annotation_recovery_caps_groq_output_tokens(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seen: dict[str, object] = {}

    def fake_generate_text_sync(**kwargs: object) -> str:
        seen.update(kwargs)
        return """
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

    monkeypatch.setattr("app.services.writing_checker.generate_text_sync", fake_generate_text_sync)

    payload = _call_annotation_recovery(
        resolved_config=_groq_resolved_config(),
        prompts=None,
        essay_text="The table show the average band scores.",
        hints=["Use singular verb."],
        seed=123,
    )

    assert len(payload) == 1
    assert seen["max_output_tokens"] == 1024

def test_augment_vocabulary_suggestions_does_not_invent_missing_phrases() -> None:
    items = _augment_vocabulary_suggestions(
        task_type=WritingTaskType.TASK_2.value,
        essay_text="This essay is already concise and does not repeat any of the canned weak phrases.",
        annotations=[],
        items=[],
    )

    assert items == []

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
