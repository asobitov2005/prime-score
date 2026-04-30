from enum import StrEnum


class AdminRole(StrEnum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"


class AdminAiThreadStatus(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class AdminAiMessageRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"


class AdminAiJobStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"


class AccessType(StrEnum):
    PUBLIC = "public"
    PREMIUM = "premium"


class AttemptMode(StrEnum):
    PRACTICE = "practice"
    EXAM = "exam"


class AttemptScope(StrEnum):
    FULL = "full"
    SECTION = "section"


class AttemptStatus(StrEnum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"
    AUTO_SUBMITTED = "auto_submitted"


class PaymentStatus(StrEnum):
    PAUSED = "paused"
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class ReviewSource(StrEnum):
    ADMIN = "admin"
    USER = "user"


class QuestionType(StrEnum):
    READING_MC_SINGLE = "reading_mc_single"
    READING_MC_MULTIPLE = "reading_mc_multiple"
    READING_TRUE_FALSE_NOT_GIVEN = "reading_true_false_not_given"
    READING_YES_NO_NOT_GIVEN = "reading_yes_no_not_given"
    READING_MATCHING_INFORMATION = "reading_matching_information"
    READING_MATCHING_HEADINGS = "reading_matching_headings"
    READING_MATCHING_FEATURES = "reading_matching_features"
    READING_MATCHING_SENTENCE_ENDINGS = "reading_matching_sentence_endings"
    READING_SENTENCE_COMPLETION = "reading_sentence_completion"
    READING_SUMMARY_COMPLETION_WORDBANK = "reading_summary_completion_wordbank"
    READING_SUMMARY_COMPLETION_FREETEXT = "reading_summary_completion_freetext"
    READING_NOTE_COMPLETION = "reading_note_completion"
    READING_TABLE_COMPLETION = "reading_table_completion"
    READING_FLOWCHART_COMPLETION = "reading_flowchart_completion"
    READING_DIAGRAM_LABELING = "reading_diagram_labeling"
    READING_SHORT_ANSWER = "reading_short_answer"
    LISTENING_MC_SINGLE = "listening_mc_single"
    LISTENING_MC_MULTIPLE = "listening_mc_multiple"
    LISTENING_MATCHING = "listening_matching"
    LISTENING_PLAN_MAP_LABELING = "listening_plan_map_labeling"
    LISTENING_FORM_COMPLETION = "listening_form_completion"
    LISTENING_NOTE_COMPLETION = "listening_note_completion"
    LISTENING_TABLE_COMPLETION = "listening_table_completion"
    LISTENING_FLOWCHART_COMPLETION = "listening_flowchart_completion"
    LISTENING_SUMMARY_COMPLETION = "listening_summary_completion"
    LISTENING_SENTENCE_COMPLETION = "listening_sentence_completion"
    LISTENING_SHORT_ANSWER = "listening_short_answer"


class TestSource(StrEnum):
    CAMBRIDGE = "cambridge"
    REAL_EXAM = "real_exam"
    CUSTOM = "custom"


class TestStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class TestType(StrEnum):
    READING = "reading"
    LISTENING = "listening"


class TestFormat(StrEnum):
    FULL = "full"
    PASSAGE_1 = "passage_1"
    PASSAGE_2 = "passage_2"
    PASSAGE_3 = "passage_3"
    PART_1 = "part_1"
    PART_2 = "part_2"
    PART_3 = "part_3"
    PART_4 = "part_4"
