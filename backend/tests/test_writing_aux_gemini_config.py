from __future__ import annotations

from app.models.enums import AiProvider, AiUseCase
from app.services.ai_config import ResolvedAiUseCaseConfig
from app.services import writing_image_summary, writing_roast
from app.services.writing_config import DEFAULT_PROMPT_ENTRIES, WritingPromptBundle
from app.models.enums import WritingTaskTypeScope


def _resolved_config(use_case: AiUseCase = AiUseCase.WRITING_ROAST) -> ResolvedAiUseCaseConfig:
    return ResolvedAiUseCaseConfig(
        use_case=use_case,
        provider=AiProvider.GOOGLE,
        provider_config_id=None,
        provider_label="Google",
        api_key="test-key",
        base_url=None,
        model_id="gemini-test",
        model_record_id=None,
        settings_json={},
    )


def test_generate_roast_uses_provider_agnostic_text_generation(monkeypatch) -> None:
    def fake_generate_text_sync(**kwargs):
        assert kwargs.get("response_mime_type") == "application/json"
        return """
        {
          "overall_roast": "Fair points, weak finish.",
          "one_liner": "This essay jogs when it needed to sprint.",
          "task_achievement_zinger": "The ideas arrive, but some of them forgot their luggage.",
          "coherence_zinger": "The structure mostly holds, even if the joins creak.",
          "lexical_zinger": "A few phrases sound like they came from survival English.",
          "grammar_zinger": "Some sentences keep the examiner guessing for sport.",
          "savage_tips": ["Name the exact comparison.", "Upgrade basic verbs.", "Check agreement in longer sentences."],
          "pep_talk": "There is a real band jump here once you tighten the basics."
        }
        """.strip()

    monkeypatch.setattr(
        writing_roast,
        "generate_text_sync",
        fake_generate_text_sync,
    )

    payload = writing_roast.generate_roast(
        resolved_config=_resolved_config(),
        prompts=WritingPromptBundle(
            profile_id=None,
            profile_version=1,
            task_type_scope=WritingTaskTypeScope.ALL,
            entries=dict(DEFAULT_PROMPT_ENTRIES),
        ),
        essay_text="This is a test essay with enough content to exercise the roast path.",
        bands={
            "task_achievement": 6.0,
            "coherence": 6.0,
            "lexical": 6.0,
            "grammar": 6.0,
            "overall": 6.0,
        },
        word_count=260,
        word_minimum=250,
        annotation_count=3,
        overall_summary="Clear central idea, but development is uneven.",
    )

    assert payload["one_liner"] == "This essay jogs when it needed to sprint."
    assert isinstance(payload["savage_tips"], list)


def test_default_roast_prompt_is_plain_and_savage_without_attacking_person() -> None:
    roast_system = DEFAULT_PROMPT_ENTRIES[writing_roast.WritingPromptKey.ROAST_SYSTEM]
    roast_user = DEFAULT_PROMPT_ENTRIES[writing_roast.WritingPromptKey.ROAST_USER_TEMPLATE]

    assert "roast the writing hard" in roast_system
    assert "simple, natural English" in roast_system
    assert "avoid C2 academic words" in roast_system
    assert "Never attack the student's identity" in roast_system
    assert "Do not write like a C2 examiner" in roast_user
    assert "Never attack the person" in roast_user


def test_generate_image_summary_uses_resolved_provider_config(monkeypatch) -> None:
    monkeypatch.setattr(
        writing_image_summary,
        "fetch_storage_object",
        lambda bucket_name, object_name: (b"fake-image", "image/png"),
    )
    monkeypatch.setattr(
        writing_image_summary,
        "generate_image_text_sync",
        lambda **kwargs: "The chart shows a steady increase across all years.",
    )

    summary = writing_image_summary.generate_image_summary(
        "/api/storage/test-bucket/chart.png",
        resolved_config=_resolved_config(AiUseCase.WRITING_IMAGE_SUMMARY),
    )

    assert summary == "The chart shows a steady increase across all years."
