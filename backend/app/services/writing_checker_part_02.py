from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_checker_dependencies import *
from app.services.writing_checker_part_01 import _HTML_TAG_RE, _WHITESPACE_RE

_TASK_2_VOCAB_RULES: list[dict[str, Any]] = [
    {
        "patterns": [r"\blearn many useful things\b", r"\buseful things\b"],
        "current_phrase": "learn many useful things",
        "improved_phrase": "acquire essential life skills",
        "level": "C1",
        "why": "It replaces vague wording with a more academic collocation for personal development.",
        "example": "By working, children can acquire essential life skills.",
    },
    {
        "patterns": [r"\bfuture life\b"],
        "current_phrase": "future life",
        "improved_phrase": "their future careers",
        "level": "C1",
        "why": "It is more precise when discussing work and long-term development.",
        "example": "These habits can help them in their future careers.",
    },
    {
        "patterns": [r"\bhow hard money is earned\b", r"\bearning money is not easy\b"],
        "current_phrase": "how hard money is earned",
        "improved_phrase": "develop financial literacy",
        "level": "C1",
        "why": "It turns a general idea into a stronger academic phrase about money awareness.",
        "example": "Part-time work can help teenagers develop financial literacy.",
    },
    {
        "patterns": [r"\bhow real job works\b", r"\breal job\b"],
        "current_phrase": "how real job works",
        "improved_phrase": "how the workplace functions",
        "level": "C1",
        "why": "It sounds more natural and formal in academic writing.",
        "example": "Early exposure helps students understand how the workplace functions.",
    },
    {
        "patterns": [r"\blittle money\b"],
        "current_phrase": "little money",
        "improved_phrase": "a small income",
        "level": "C1",
        "why": "It sounds more natural and accurate in this context.",
        "example": "They may earn a small income while studying.",
    },
    {
        "patterns": [r"\bgood experience\b"],
        "current_phrase": "good experience",
        "improved_phrase": "a valuable formative experience",
        "level": "C2",
        "why": "It sounds more mature and specific than a basic adjective.",
        "example": "Part-time work can be a valuable formative experience.",
    },
    {
        "patterns": [r"\bcontrol the time\b", r"\bcontrol their working hours\b"],
        "current_phrase": "control the time",
        "improved_phrase": "regulate their working hours",
        "level": "C1",
        "why": "It gives the idea a more precise and academic tone.",
        "example": "Parents should regulate their working hours carefully.",
    },
    {
        "patterns": [r"\bschool results can go down\b", r"\bresults can go down\b"],
        "current_phrase": "school results can go down",
        "improved_phrase": "academic performance may suffer",
        "level": "C1",
        "why": "It is a more natural academic collocation than a literal phrase.",
        "example": "If work hours are excessive, academic performance may suffer.",
    },
    {
        "patterns": [r"\bmore mature\b"],
        "current_phrase": "more mature",
        "improved_phrase": "more self-disciplined",
        "level": "C1",
        "why": "It is more specific and sounds less repetitive.",
        "example": "These responsibilities can make teenagers more self-disciplined.",
    },
    {
        "patterns": [r"\bthink only about money\b"],
        "current_phrase": "think only about money",
        "improved_phrase": "become overly money-focused",
        "level": "C1",
        "why": "It sounds more natural and less conversational.",
        "example": "Some teenagers may become overly money-focused.",
    },
    {
        "patterns": [r"\bbad for their study and health\b", r"\bbad for their studies and health\b"],
        "current_phrase": "bad for their study and health",
        "improved_phrase": "adversely affect their studies and well-being",
        "level": "C2",
        "why": "It gives a stronger academic tone and covers the health idea more precisely.",
        "example": "Excessive work can adversely affect their studies and well-being.",
    },
    {
        "patterns": [r"\bpart time job\b", r"\bpart-time job\b"],
        "current_phrase": "part time job",
        "improved_phrase": "part-time employment",
        "level": "C1",
        "why": "It sounds more formal and natural in IELTS essays.",
        "example": "Part-time employment can build responsibility and independence.",
    },
]

_TASK_1_VOCAB_RULES: list[dict[str, Any]] = [
    {
        "patterns": [r"\bwent up\b", r"\brose\b", r"\bincrease\b"],
        "current_phrase": "went up",
        "improved_phrase": "rose steadily",
        "level": "C1",
        "why": "It is more precise than a basic verb phrase.",
        "example": "The figure rose steadily over the period.",
    },
    {
        "patterns": [r"\bwent down\b", r"\bfall\b", r"\bdecrease\b"],
        "current_phrase": "went down",
        "improved_phrase": "declined gradually",
        "level": "C1",
        "why": "It sounds more academic and specific.",
        "example": "After 2010, the number declined gradually.",
    },
    {
        "patterns": [r"\bbecome highest\b", r"\bhighest\b"],
        "current_phrase": "become highest",
        "improved_phrase": "reach the highest level",
        "level": "C1",
        "why": "It is a natural report-writing phrase.",
        "example": "By 2020, country A reached the highest level.",
    },
    {
        "patterns": [r"\balways have more\b", r"\bmore than\b"],
        "current_phrase": "always have more",
        "improved_phrase": "maintained a clear lead",
        "level": "C2",
        "why": "It is a stronger overview phrase for Task 1.",
        "example": "Country A maintained a clear lead throughout the period.",
    },
    {
        "patterns": [r"\blower\b", r"\blowest\b"],
        "current_phrase": "always lowest",
        "improved_phrase": "remained the smallest market",
        "level": "C1",
        "why": "It sounds more academic and less repetitive.",
        "example": "Country D remained the smallest market until the end.",
    },
    {
        "patterns": [r"\ball of them grow up\b", r"\bgrow up\b"],
        "current_phrase": "grow up",
        "improved_phrase": "grow significantly",
        "level": "C1",
        "why": "It is the correct academic collocation for trend descriptions.",
        "example": "All four figures grew significantly over the decade.",
    },
]

_GENERAL_VOCAB_RULES: list[dict[str, Any]] = [
    {
        "patterns": [r"\bgood\b"],
        "current_phrase": "good",
        "improved_phrase": "beneficial",
        "level": "C1",
        "why": "It is more formal and flexible for IELTS writing.",
        "example": "Part-time work can be beneficial for teenagers.",
    },
    {
        "patterns": [r"\bbad\b"],
        "current_phrase": "bad",
        "improved_phrase": "detrimental",
        "level": "C1",
        "why": "It is a stronger academic adjective.",
        "example": "Excessive work can be detrimental to health.",
    },
    {
        "patterns": [r"\bthings\b"],
        "current_phrase": "things",
        "improved_phrase": "skills",
        "level": "C1",
        "why": "It replaces vague wording with a clearer noun.",
        "example": "Students can acquire useful skills through work.",
    },
    {
        "patterns": [r"\bmore mature\b"],
        "current_phrase": "more mature",
        "improved_phrase": "more responsible",
        "level": "C1",
        "why": "It is a more natural evaluation of personal growth.",
        "example": "The experience can make teenagers more responsible.",
    },
]

def _strip_html(text: str) -> str:
    if not text:
        return ""
    if "<" not in text or ">" not in text:
        return text
    return _HTML_TAG_RE.sub(" ", text)

def _normalize_essay(text: str) -> str:
    return _WHITESPACE_RE.sub(" ", (text or "")).strip().lower()

def compute_essay_hash(task_id: str, essay_text: str, task_type: str) -> str:
    payload = f"{task_type}|{task_id}|{_normalize_essay(essay_text)}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def _writing_generate_config(**kwargs: Any) -> genai_types.GenerateContentConfig:
    # Writing uses a dedicated Gemini model, and some model IDs reject
    # thinkingLevel/thinkingConfig entirely. Keep writing requests free of
    # thinking controls unless that model contract is revisited explicitly.
    return genai_types.GenerateContentConfig(**kwargs)

def _criterion_schema() -> genai_types.Schema:
    return genai_types.Schema(
        type=genai_types.Type.OBJECT,
        required=["band", "reasoning", "summary", "strengths", "improvements", "evidence_quotes"],
        properties={
            "band": genai_types.Schema(type=genai_types.Type.NUMBER),
            "reasoning": genai_types.Schema(type=genai_types.Type.STRING),
            "summary": genai_types.Schema(type=genai_types.Type.STRING),
            "strengths": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=genai_types.Schema(type=genai_types.Type.STRING),
            ),
            "improvements": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=genai_types.Schema(type=genai_types.Type.STRING),
            ),
            "evidence_quotes": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=genai_types.Schema(type=genai_types.Type.STRING),
            ),
        },
    )
