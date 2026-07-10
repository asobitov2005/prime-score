from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_checker_dependencies import *

logger = logging.getLogger(__name__)

_HTML_TAG_RE = re.compile(r"</?[^>]+>")

_WHITESPACE_RE = re.compile(r"\s+")

_ALLOWED_SEVERITIES = {"error", "warning", "suggestion"}

_DEFAULT_GRADER_MAX_OUTPUT_TOKENS = 8192

_DEFAULT_ANNOTATION_MAX_OUTPUT_TOKENS = 8192

_DEFAULT_REPAIR_MAX_OUTPUT_TOKENS = 4096

_DEFAULT_IMPROVED_MAX_OUTPUT_TOKENS = 4096

_GROQ_GRADER_MAX_OUTPUT_TOKENS = 2048

_GROQ_ANNOTATION_MAX_OUTPUT_TOKENS = 1024

_GROQ_REPAIR_MAX_OUTPUT_TOKENS = 1024

_GROQ_IMPROVED_MAX_OUTPUT_TOKENS = 1536

_GROQ_RUBRIC_CHAR_LIMIT = 2800

_GROQ_ANCHOR_RATIONALE_LIMIT = 240

_GROQ_ANCHOR_COUNT = 3

class _CriterionPayload(BaseModel):
    band: float
    reasoning: str = ""
    summary: str = ""
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    evidence_quotes: list[str] = Field(default_factory=list)

    @field_validator("strengths", "improvements", "evidence_quotes", mode="before")
    @classmethod
    def _coerce_to_list(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            return [v]
        return v

class _AnnotationPayload(BaseModel):
    offset: int
    length: int
    original: str
    replacements: list[str] = Field(default_factory=list)
    category: str
    severity: str = "warning"
    short_message: str = ""
    explanation: str = ""
    band_impact: str = ""
    examiner_tip: str = ""
    improved_sentence: str = ""

class _VocabularySuggestionPayload(BaseModel):
    current_phrase: str = ""
    improved_phrase: str = ""
    level: str = ""
    why_it_works: str = ""
    example_sentence: str = ""

class _TargetActionPayload(BaseModel):
    title: str = ""
    why: str = ""
    how: str = ""
    example: str = ""
    band_impact: str = ""
    priority: int = 0

class _BandBoundaryPayload(BaseModel):
    criterion: str = ""
    current_band: float = 0.0
    next_band: float = 0.0
    why_current: str = ""
    required_for_next: str = ""

class _ChecklistPayload(BaseModel):
    label: str = ""
    status: str = "partial"
    detail: str = ""
    how_to_fix: str = ""

class _ErrorTaxonomyPayload(BaseModel):
    category: str = ""
    subcategory: str = ""
    label: str = ""
    count: int = 0
    examples: list[str] = Field(default_factory=list)
    fix: str = ""

class _SentenceFixPayload(BaseModel):
    priority: int = 0
    original: str = ""
    replacement: str = ""
    corrected_sentence: str = ""
    why: str = ""
    band_impact: str = ""
    category: str = ""

class _ScoreBoosterPayload(BaseModel):
    criterion: str = ""
    original: str = ""
    why_it_scores: str = ""
    keep_doing: str = ""
    band_value: str = ""

class _GraderPayload(BaseModel):
    task_achievement: _CriterionPayload
    coherence: _CriterionPayload
    lexical: _CriterionPayload
    grammar: _CriterionPayload
    overall_summary: str = ""
    next_steps: list[str] = Field(default_factory=list)
    inline_annotations: list[_AnnotationPayload] = Field(default_factory=list)
    vocabulary_suggestions: list[_VocabularySuggestionPayload] = Field(default_factory=list)
    target_action_plan: list[_TargetActionPayload] = Field(default_factory=list)
    band_boundaries: list[_BandBoundaryPayload] = Field(default_factory=list)
    ielts_checklist: list[_ChecklistPayload] = Field(default_factory=list)
    error_taxonomy: list[_ErrorTaxonomyPayload] = Field(default_factory=list)
    sentence_fixes: list[_SentenceFixPayload] = Field(default_factory=list)
    score_boosters: list[_ScoreBoosterPayload] = Field(default_factory=list)

_ANNOTATION_LIST_ADAPTER = TypeAdapter(list[_AnnotationPayload])

_VOCAB_MAX_COUNT = 8

_GENERIC_PATTERNS = (
    "improve grammar",
    "improve your grammar",
    "use better vocabulary",
    "improve vocabulary",
    "develop your ideas",
    "be more specific",
    "give more details",
    "add more examples",
    "work on coherence",
    "more practice",
    "practice more",
    "clear response with room for improvement",
)
