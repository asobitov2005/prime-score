import re


TRAILING_PUNCTUATION = ".,;:!?"


def normalize_answer(value: str) -> str:
    normalized = re.sub(r"\s+", " ", value.strip().lower())
    return normalized.rstrip(TRAILING_PUNCTUATION)


def is_answer_correct(user_value: str, accepted_answers: list[str]) -> bool:
    normalized_user_value = normalize_answer(user_value)
    return any(normalize_answer(answer) == normalized_user_value for answer in accepted_answers)


def listening_exam_seconds(audio_duration_seconds: int) -> int:
    return audio_duration_seconds + 120

