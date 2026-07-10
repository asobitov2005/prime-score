from uuid import uuid4

from app.services import attempt_repo
from app.services.attempt_repo_progress import (
    normalize_text_highlights,
    normalize_ui_state,
)
from app.services.attempt_repo_scoring import score_attempt_snapshot


def test_attempt_repo_facade_keeps_public_exports() -> None:
    expected_names = {
        "ensure_debug_user",
        "start_attempt_in_db",
        "get_attempt_from_db",
        "iter_user_attempts_from_db",
        "save_answer_in_db",
        "save_progress_in_db",
        "submit_attempt_in_db",
    }

    assert expected_names == set(attempt_repo.__all__)
    for name in expected_names:
        assert hasattr(attempt_repo, name)


def test_attempt_repo_facade_keeps_private_aliases() -> None:
    assert attempt_repo._snapshot_questions is attempt_repo.snapshot_questions
    assert attempt_repo._snapshot_answer_key is attempt_repo.snapshot_answer_key
    assert attempt_repo._to_runtime is attempt_repo.to_runtime
    assert attempt_repo._load_answers is attempt_repo.load_answers
    assert (
        attempt_repo._normalize_section_time_spent_sec
        is attempt_repo.normalize_section_time_spent_sec
    )


def test_progress_normalizers_preserve_bounds() -> None:
    highlights = normalize_text_highlights(
        {
            "passage": [
                {"id": "one", "start": 2, "end": 8},
                {"start": 8, "end": 8},
                {"start": "bad", "end": 10},
            ]
        }
    )
    ui_state = normalize_ui_state(
        {
            "theme": "dark",
            "split_ratio": 100,
            "font_scale": 0.2,
        }
    )

    assert highlights == {
        "passage": [{"id": "one", "start": 2, "end": 8}]
    }
    assert ui_state == {
        "theme": "dark",
        "split_ratio": 58.0,
        "font_scale": 0.9,
    }


def test_snapshot_scoring_returns_breakdowns() -> None:
    question_id = uuid4()
    snapshot = {
        "questions": [
            {
                "question_id": str(question_id),
                "question_number": 1,
                "section_id": "section-1",
                "section_title": "Reading section",
                "group_id": "group-1",
                "group_title": "Questions 1-1",
                "question_type": "short_answer",
                "prompt": "Answer",
                "options": [],
            }
        ],
        "sections": [],
    }

    result = score_attempt_snapshot(
        snapshot=snapshot,
        answer_map={str(question_id): "London"},
        database_answer_key={
            str(question_id): {
                "accepted_answers": ["London"],
                "explanation": "The text names London.",
                "explanation_reference": {},
            }
        },
        frozen_answer_key={},
    )

    assert result.raw_score == 1
    assert result.scoring_items[0]["is_correct"] is True
    assert result.section_breakdown == [
        {"title": "Reading section", "correct": 1, "total": 1}
    ]
    assert result.question_type_breakdown == [
        {"question_type": "short_answer", "correct": 1, "total": 1}
    ]
