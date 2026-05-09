from app.services.scoring import is_answer_correct, score_answer


def test_multi_option_answers_match_regardless_order() -> None:
    assert is_answer_correct("A,C", ["A", "C"])
    assert is_answer_correct("c, a", ["A", "C"])


def test_multi_option_answers_require_exact_letter_set() -> None:
    assert not is_answer_correct("A,B", ["A", "C"])
    assert not is_answer_correct("A,C,D", ["A", "C"])
    assert not is_answer_correct("A", ["A", "C"])


def test_multi_option_scoring_does_not_treat_text_variants_as_sets() -> None:
    assert not is_answer_correct("wind, birds", ["wind", "birds"])


def test_multi_option_partial_score_awards_individual_slots() -> None:
    score = score_answer(
        "A,B",
        ["A", "C"],
        question_type="reading_mc_multiple",
        question_label="23-24",
    )

    assert score.awarded_score == 1
    assert score.max_score == 2
    assert score.is_correct is False
