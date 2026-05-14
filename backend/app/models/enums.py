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


class AiProvider(StrEnum):
    GOOGLE = "google"
    CEREBRAS = "cerebras"
    GROQ = "groq"


class AiUseCase(StrEnum):
    ADMIN_CHAT = "admin_chat"
    WRITING_GRADER = "writing_grader"
    WRITING_IMPROVER = "writing_improver"
    WRITING_ROAST = "writing_roast"
    WRITING_IMAGE_SUMMARY = "writing_image_summary"
    AUDIO_TRANSCRIPTION = "audio_transcription"


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
    MATCHED = "matched"
    COMPLETED = "completed"
    EXPIRED = "expired"
    CANCELED = "canceled"
    REVIEW = "review"
    FAILED = "failed"
    REFUNDED = "refunded"


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
    WRITING = "writing"


class WritingTaskType(StrEnum):
    TASK_1 = "task_1"
    TASK_2 = "task_2"


class WritingTaskTypeScope(StrEnum):
    ALL = "all"
    TASK_1 = "task_1"
    TASK_2 = "task_2"


class WritingTaskStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class WritingConfigStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class WritingPromptKey(StrEnum):
    GRADER_SYSTEM = "grader_system"
    GRADER_USER_TEMPLATE = "grader_user_template"
    CRITERION_TASK_ACHIEVEMENT = "criterion_task_achievement"
    CRITERION_COHERENCE_COHESION = "criterion_coherence_cohesion"
    CRITERION_LEXICAL_RESOURCE = "criterion_lexical_resource"
    CRITERION_GRAMMAR_ACCURACY = "criterion_grammar_accuracy"
    ANNOTATION_PROMPT = "annotation_prompt"
    ANNOTATION_REPAIR_PROMPT = "annotation_repair_prompt"
    JSON_REPAIR_PROMPT = "json_repair_prompt"
    IMPROVED_VERSION_PROMPT = "improved_version_prompt"
    ROAST_SYSTEM = "roast_system"
    ROAST_USER_TEMPLATE = "roast_user_template"
    VOCABULARY_UPGRADE_POLICY = "vocabulary_upgrade_policy"


class WritingPromptFormat(StrEnum):
    TEXT = "text"
    JSON = "json"


class WritingConfigEntityType(StrEnum):
    PROFILE = "profile"
    RUBRIC = "rubric"
    ANCHOR_SET = "anchor_set"


class WritingSubmissionStatus(StrEnum):
    QUEUED = "queued"
    GRADING = "grading"
    COMPLETED = "completed"
    FAILED = "failed"


class WritingDifficulty(StrEnum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class WritingQuestionSubtype(StrEnum):
    # Task 1 — visual description
    BAR_CHART = "bar_chart"
    LINE_GRAPH = "line_graph"
    PIE_CHART = "pie_chart"
    TABLE = "table"
    PROCESS = "process"
    MAP = "map"
    TWO_CHARTS = "two_charts"
    # Task 2 — essay types
    OPINION = "opinion"
    ADVANTAGES_DISADVANTAGES = "advantages_disadvantages"
    DISCUSSION = "discussion"
    PROBLEM_SOLUTION = "problem_solution"
    TWO_PART = "two_part"
    CAUSES_EFFECTS = "causes_effects"
    DIRECT_QUESTION = "direct_question"


class WritingErrorCategory(StrEnum):
    SPELLING = "spelling"
    GRAMMAR = "grammar"
    LEXICAL = "lexical"
    COHESION = "cohesion"
    STYLE = "style"
    PUNCTUATION = "punctuation"


class TestFormat(StrEnum):
    FULL = "full"
    PASSAGE_1 = "passage_1"
    PASSAGE_2 = "passage_2"
    PASSAGE_3 = "passage_3"
    PART_1 = "part_1"
    PART_2 = "part_2"
    PART_3 = "part_3"
    PART_4 = "part_4"
