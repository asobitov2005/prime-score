"""Backward-compatible facade for attempt persistence services."""

from app.services.attempt_repo_commands import save_answer_in_db, start_attempt_in_db
from app.services.attempt_repo_progress import (
    normalize_text_highlights,
    normalize_ui_state,
    save_progress_in_db,
)
from app.services.attempt_repo_runtime import (
    attempt_query,
    get_attempt_from_db,
    iter_user_attempts_from_db,
    load_answers,
    load_existing_in_progress_attempt,
    to_runtime,
)
from app.services.attempt_repo_submission import submit_attempt_in_db
from app.services.attempt_repo_support import (
    count_non_empty_answer_values,
    db_answer_key,
    elapsed_attempt_seconds,
    ensure_debug_user,
    normalize_section_time_spent_sec,
    normalized_attempt_time_spent,
    principal_phone,
    principal_telegram_id,
    should_grant_premium_bonus,
    snapshot_answer_key,
    snapshot_group_shared_options,
    snapshot_questions,
    user_can_receive_full_test_premium_bonus,
)

_principal_phone = principal_phone
_principal_telegram_id = principal_telegram_id
_attempt_query = attempt_query
_snapshot_questions = snapshot_questions
_snapshot_answer_key = snapshot_answer_key
_snapshot_group_shared_options = snapshot_group_shared_options
_count_non_empty_answer_values = count_non_empty_answer_values
_should_grant_premium_bonus = should_grant_premium_bonus
_user_can_receive_full_test_premium_bonus = user_can_receive_full_test_premium_bonus
_normalized_attempt_time_spent = normalized_attempt_time_spent
_elapsed_attempt_seconds = elapsed_attempt_seconds
_normalize_section_time_spent_sec = normalize_section_time_spent_sec
_db_answer_key = db_answer_key
_to_runtime = to_runtime
_load_answers = load_answers
_load_existing_in_progress_attempt = load_existing_in_progress_attempt

__all__ = [
    "ensure_debug_user",
    "start_attempt_in_db",
    "get_attempt_from_db",
    "iter_user_attempts_from_db",
    "save_answer_in_db",
    "save_progress_in_db",
    "submit_attempt_in_db",
    "normalize_text_highlights",
    "normalize_ui_state",
]
