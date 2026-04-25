from app.services.scoring import is_answer_correct


def test_multi_option_answers_match_regardless_order() -> None:
    assert is_answer_correct("A,C", ["A", "C"])
    assert is_answer_correct("c, a", ["A", "C"])


def test_multi_option_answers_require_exact_letter_set() -> None:
    assert not is_answer_correct("A,B", ["A", "C"])
    assert not is_answer_correct("A,C,D", ["A", "C"])
    assert not is_answer_correct("A", ["A", "C"])


def test_multi_option_scoring_does_not_treat_text_variants_as_sets() -> None:
    assert not is_answer_correct("wind, birds", ["wind", "birds"])
