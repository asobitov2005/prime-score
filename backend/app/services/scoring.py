import re
from dataclasses import dataclass


TRAILING_PUNCTUATION = ".,;:!?"
OPTION_LETTER_PATTERN = re.compile(r"^[a-z]$")
QUESTION_RANGE_PATTERN = re.compile(r"^\s*(\d+)\s*-\s*(\d+)\s*$")


@dataclass(frozen=True)
class AnswerScore:
    is_correct: bool
    awarded_score: int
    max_score: int


def normalize_answer(value: str) -> str:
    normalized = re.sub(r"\s+", " ", value.strip().lower())
    return normalized.rstrip(TRAILING_PUNCTUATION)


def is_multi_option_answer_correct(user_value: str, accepted_answers: list[str]) -> bool:
    if "," not in user_value or len(accepted_answers) < 2:
        return False

    normalized_accepted_answers = [normalize_answer(answer) for answer in accepted_answers]
    if not all(OPTION_LETTER_PATTERN.fullmatch(answer) for answer in normalized_accepted_answers):
        return False

    normalized_user_answers = [
        normalize_answer(answer)
        for answer in user_value.split(",")
        if answer.strip()
    ]
    if len(normalized_user_answers) != len(normalized_accepted_answers):
        return False

    return set(normalized_user_answers) == set(normalized_accepted_answers)


def is_answer_correct(user_value: str, accepted_answers: list[str]) -> bool:
    if is_multi_option_answer_correct(user_value, accepted_answers):
        return True

    normalized_accepted_answers = [normalize_answer(answer) for answer in accepted_answers]
    if len(normalized_accepted_answers) >= 2 and _is_option_letter_set(normalized_accepted_answers):
        return False

    normalized_user_value = normalize_answer(user_value)
    return any(normalize_answer(answer) == normalized_user_value for answer in accepted_answers)


def mc_multiple_question_weight(
    *,
    question_label: str | None,
    accepted_answers: list[str],
) -> int:
    label = str(question_label or "").strip()
    range_match = QUESTION_RANGE_PATTERN.fullmatch(label)
    if range_match:
      start = int(range_match.group(1))
      end = int(range_match.group(2))
      if end >= start:
          return max(1, end - start + 1)

    normalized_accepted_answers = [normalize_answer(answer) for answer in accepted_answers]
    option_letter_answers = [
        answer for answer in normalized_accepted_answers
        if OPTION_LETTER_PATTERN.fullmatch(answer)
    ]
    if len(option_letter_answers) >= 2:
        return len(option_letter_answers)

    return 1


def _is_option_letter_set(answers: list[str]) -> bool:
    return bool(answers) and all(OPTION_LETTER_PATTERN.fullmatch(answer) for answer in answers)


def _normalized_multi_option_parts(value: str | None) -> list[str]:
    return [
        normalize_answer(answer)
        for answer in str(value or "").split(",")
        if answer.strip()
    ]


def score_answer(
    user_value: str | None,
    accepted_answers: list[str],
    *,
    question_type: str,
    question_label: str | None = None,
) -> AnswerScore:
    max_score = (
        mc_multiple_question_weight(
            question_label=question_label,
            accepted_answers=accepted_answers,
        )
        if "mc_multiple" in question_type
        else 1
    )

    if not str(user_value or "").strip():
        return AnswerScore(is_correct=False, awarded_score=0, max_score=max_score)

    if "mc_multiple" not in question_type:
        is_correct = is_answer_correct(str(user_value), accepted_answers)
        return AnswerScore(is_correct=is_correct, awarded_score=1 if is_correct else 0, max_score=max_score)

    normalized_accepted_answers = [normalize_answer(answer) for answer in accepted_answers]
    if not _is_option_letter_set(normalized_accepted_answers):
        is_correct = is_answer_correct(str(user_value), accepted_answers)
        return AnswerScore(is_correct=is_correct, awarded_score=max_score if is_correct else 0, max_score=max_score)

    selected_answers = _normalized_multi_option_parts(user_value)
    awarded_score = len(set(selected_answers) & set(normalized_accepted_answers))
    awarded_score = min(max_score, awarded_score)
    is_correct = awarded_score == max_score and len(set(selected_answers)) == len(set(normalized_accepted_answers))

    return AnswerScore(is_correct=is_correct, awarded_score=awarded_score, max_score=max_score)


def listening_exam_seconds(audio_duration_seconds: int) -> int:
    return audio_duration_seconds + 120
