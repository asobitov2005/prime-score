import re


TRAILING_PUNCTUATION = ".,;:!?"
OPTION_LETTER_PATTERN = re.compile(r"^[a-z]$")


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

    normalized_user_value = normalize_answer(user_value)
    return any(normalize_answer(answer) == normalized_user_value for answer in accepted_answers)


def listening_exam_seconds(audio_duration_seconds: int) -> int:
    return audio_duration_seconds + 120

