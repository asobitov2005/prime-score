from __future__ import annotations

from enum import StrEnum


class UserRole(StrEnum):
    user = "user"
    admin = "admin"
    super_admin = "super_admin"


class TestType(StrEnum):
    reading = "reading"
    listening = "listening"
    writing = "writing"
    speaking = "speaking"

class TestFormat(StrEnum):
    full = "full"
    passage_1 = "passage_1"
    passage_2 = "passage_2"
    passage_3 = "passage_3"
    part_1 = "part_1"
    part_2 = "part_2"
    part_3 = "part_3"
    part_4 = "part_4"

class AccessType(StrEnum):
    public = "public"
    premium = "premium"


class TestStatus(StrEnum):
    draft = "draft"
    published = "published"
    archived = "archived"


class TestSource(StrEnum):
    cambridge = "cambridge"
    real_exam = "real_exam"
    custom = "custom"


class TestScope(StrEnum):
    full = "full"
    section = "section"


class TestMode(StrEnum):
    practice = "practice"
    exam = "exam"


class AttemptStatus(StrEnum):
    in_progress = "in_progress"
    completed = "completed"
    abandoned = "abandoned"
    auto_submitted = "auto_submitted"


class QuestionType(StrEnum):
    reading_mc_single = "reading_mc_single"
    reading_mc_multiple = "reading_mc_multiple"
    reading_true_false_not_given = "reading_true_false_not_given"
    reading_yes_no_not_given = "reading_yes_no_not_given"
    reading_matching_information = "reading_matching_information"
    reading_matching_headings = "reading_matching_headings"
    reading_matching_features = "reading_matching_features"
    reading_matching_sentence_endings = "reading_matching_sentence_endings"
    reading_sentence_completion = "reading_sentence_completion"
    reading_summary_completion_wordbank = "reading_summary_completion_wordbank"
    reading_summary_completion_freetext = "reading_summary_completion_freetext"
    reading_note_completion = "reading_note_completion"
    reading_table_completion = "reading_table_completion"
    reading_flowchart_completion = "reading_flowchart_completion"
    reading_diagram_labeling = "reading_diagram_labeling"
    reading_short_answer = "reading_short_answer"
    listening_mc_single = "listening_mc_single"
    listening_mc_multiple = "listening_mc_multiple"
    listening_matching = "listening_matching"
    listening_plan_map_labeling = "listening_plan_map_labeling"
    listening_form_completion = "listening_form_completion"
    listening_note_completion = "listening_note_completion"
    listening_table_completion = "listening_table_completion"
    listening_flowchart_completion = "listening_flowchart_completion"
    listening_summary_completion = "listening_summary_completion"
    listening_sentence_completion = "listening_sentence_completion"
    listening_short_answer = "listening_short_answer"


class PaymentMethod(StrEnum):
    payme = "payme"
    click = "click"
    uzum = "uzum"
    manual = "manual"
    card_transfer = "card_transfer"


class PaymentStatus(StrEnum):
    paused = "paused"
    pending = "pending"
    matched = "matched"
    completed = "completed"
    expired = "expired"
    canceled = "canceled"
    review = "review"
    failed = "failed"
    refunded = "refunded"


class NotificationType(StrEnum):
    payment_success = "payment_success"
    premium_expiring = "premium_expiring"
    premium_expired = "premium_expired"
    new_test = "new_test"
    gift_received = "gift_received"
    achievement_unlocked = "achievement_unlocked"
    system_alert = "system_alert"


class ReviewSource(StrEnum):
    admin = "admin"
    user = "user"
