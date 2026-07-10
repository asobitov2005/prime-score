from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_writing_checker_dependencies import *

def _groq_resolved_config() -> ResolvedAiUseCaseConfig:
    return ResolvedAiUseCaseConfig(
        use_case=AiUseCase.WRITING_GRADER,
        provider=AiProvider.GROQ,
        provider_config_id=None,
        provider_label="Groq",
        api_key="test-key",
        base_url=None,
        model_id="openai/gpt-oss-120b",
        model_record_id=None,
        settings_json={},
        context_window=None,
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

def _criterion_payload() -> _CriterionPayload:
    return _CriterionPayload(
        band=7.0,
        reasoning="Clear response with some limits.",
        summary="Mostly controlled.",
        strengths=["Clear central idea"],
        improvements=["Develop one point more fully"],
        evidence_quotes=["clear central idea"],
    )

def test_default_writing_prompt_contains_target_integrity_rules() -> None:
    user_prompt = DEFAULT_PROMPT_ENTRIES["grader_user_template"]

    assert "TARGET INTEGRITY" in user_prompt
    assert "Desired Score is a coaching target only" in user_prompt
    assert "It must not increase the awarded band" in user_prompt
    assert "choose the lower band" in user_prompt

def test_score_boosters_do_not_overclaim_full_band_support() -> None:
    payload = _GraderPayload(
        task_achievement=_criterion_payload(),
        coherence=_criterion_payload(),
        lexical=_criterion_payload(),
        grammar=_criterion_payload(),
        score_boosters=[
            _ScoreBoosterPayload(
                criterion="Task Achievement",
                original="The essay keeps a clear position throughout.",
                why_it_scores="This helps the response stay focused.",
                keep_doing="Keep a consistent position.",
                band_value="Band 8.0 support",
            )
        ],
    )

    boosters = _normalize_score_boosters(payload)

    assert boosters[0]["band_value"] == "Supports the criterion"

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

def test_call_grader_omits_thinking_config_for_writing_model() -> None:
    seen_config: object | None = None

    class _Models:
        def generate_content(self, **kwargs: object) -> SimpleNamespace:
            nonlocal seen_config
            seen_config = kwargs.get("config")
            return SimpleNamespace(text=_valid_grader_json())

    client = SimpleNamespace(models=_Models())

    payload = _call_grader(
        client=client,
        system_instruction="system",
        prompt="prompt",
        essay_text="This is a complete essay with enough words to count as a real attempt in the checker.",
        seed=123,
    )

    assert payload.task_achievement.band == 6.0
    assert seen_config is not None
    assert getattr(seen_config, "thinkingConfig", None) is None

def test_call_grader_caps_groq_output_tokens(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, object] = {}

    def fake_generate_text_sync(**kwargs: object) -> str:
        seen.update(kwargs)
        return _valid_grader_json()

    monkeypatch.setattr("app.services.writing_checker.generate_text_sync", fake_generate_text_sync)

    payload = _call_grader(
        resolved_config=_groq_resolved_config(),
        prompts=None,
        system_instruction="system",
        prompt="prompt",
        essay_text="This is a complete essay with enough words to count as a real attempt in the checker.",
        seed=123,
    )

    assert payload.task_achievement.band == 6.0
    assert seen["max_output_tokens"] == 2048

def test_groq_prompt_path_is_compact() -> None:
    config = _groq_resolved_config()
    rubric = SimpleNamespace(
        body=(
            "1. TASK ACHIEVEMENT\n\nBand 8\n- Task 2: Fully developed ideas.\n\n"
            "Band 7\n- Task 2: Clear position with support.\n\n"
            "Band 6\n- Task 2: Relevant position but some ideas unclear.\n\n"
            "Band 5\n- Task 2: Partial response.\n\n"
            "2. COHERENCE AND COHESION\n\nBand 8\n- Logical sequencing.\n\n"
            "Band 7\n- Clear progression.\n\nBand 6\n- Clear overall progression.\n\n"
            "Band 5\n- Limited progression.\n\n3. LEXICAL RESOURCE\n\nBand 8\n- Precise vocabulary.\n\n"
            "Band 7\n- Some flexibility.\n\nBand 6\n- Adequate range.\n\nBand 5\n- Limited range.\n\n"
            "4. GRAMMATICAL RANGE AND ACCURACY\n\nBand 8\n- Mostly error-free.\n\n"
            "Band 7\n- Frequent error-free sentences.\n\nBand 6\n- Some grammar errors.\n\n"
            "Band 5\n- Frequent grammatical errors.\n\nGRADING INSTRUCTIONS"
        ),
        version=1,
    )
    prompts = SimpleNamespace(entries={})
    anchors = SimpleNamespace(
        items=[
            {
                "band": 5.0,
                "criteria": {
                    "task_achievement": 5.0,
                    "coherence": 5.0,
                    "lexical": 5.0,
                    "grammar": 5.0,
                },
                "rationale": "Limited development with weak control.",
                "essay": "Long anchor essay that should not appear in the compact Groq prompt.",
            }
        ]
    )

    system = _build_system_instruction(
        prompts=prompts,
        rubric=rubric,
        resolved_config=config,
        task_type=WritingTaskType.TASK_2.value,
    )
    prompt = _build_grading_prompt(
        prompts=prompts,
        anchors=anchors,
        resolved_config=config,
        task_type=WritingTaskType.TASK_2.value,
        task_prompt_text="Discuss both views and give your opinion.",
        image_summary="",
        essay_text="This is a candidate essay.",
    )

    assert "strict json response schema" not in prompt.lower()
    assert "Long anchor essay" not in prompt
    assert "inline_annotations: return []" in prompt
    assert "Task Response bands ->" in system

def test_skip_groq_aux_calls() -> None:
    assert _skip_groq_aux_call(_groq_resolved_config()) is True
