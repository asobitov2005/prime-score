import json

from backend.app.services.writing_checker import _GraderPayload

test_data = {
    "task_achievement": {"band": 6.5, "reasoning": "...", "summary": "...", "strengths": [], "improvements": [], "evidence_quotes": []},
    "coherence": {"band": 6.0, "reasoning": "...", "summary": "...", "strengths": [], "improvements": [], "evidence_quotes": []},
    "lexical": {"band": 7.0, "reasoning": "...", "summary": "...", "strengths": [], "improvements": [], "evidence_quotes": []},
    "grammar": {"band": 6.5, "reasoning": "...", "summary": "...", "strengths": [], "improvements": [], "evidence_quotes": []},
    "overall_summary": "Good essay.",
    "next_steps": ["Read more books."],
    "inline_annotations": [],
    "vocabulary_suggestions": []
}

payload = _GraderPayload.model_validate(test_data)
print("Validation succeeded")
