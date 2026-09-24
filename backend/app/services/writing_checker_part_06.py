from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_checker_dependencies import *
from app.services.writing_checker_part_01 import _GraderPayload, _VOCAB_MAX_COUNT, _VocabularySuggestionPayload
from app.services.writing_checker_part_04 import _clean_text

def _normalize_sentence_fixes(
    *,
    grader: _GraderPayload,
    annotations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in grader.sentence_fixes:
        original = item.original
        corrected = item.corrected_sentence or item.replacement
        if not original.strip() or original in seen:
            continue
        seen.add(original)
        items.append(
            {
                "priority": item.priority or len(items) + 1,
                "original": original,
                "replacement": item.replacement,
                "corrected_sentence": corrected,
                "why": item.why,
                "band_impact": item.band_impact,
                "category": _clean_text(item.category).lower(),
            }
        )
        if len(items) >= 8:
            break

    for annotation in annotations:
        if len(items) >= 8:
            break
        original = str(annotation.get("original") or "")
        if not original.strip() or original in seen:
            continue
        replacement = str(((annotation.get("replacements") or [""])[0]))
        corrected = str(annotation.get("improved_sentence") or replacement)
        if not replacement and not corrected:
            continue
        seen.add(original)
        items.append(
            {
                "priority": len(items) + 1,
                "original": original,
                "replacement": replacement,
                "corrected_sentence": corrected,
                "why": str(annotation.get("explanation") or annotation.get("short_message") or ""),
                "band_impact": str(annotation.get("band_impact") or ""),
                "category": _clean_text(str(annotation.get("category") or "")),
            }
        )
    return items

def _normalize_score_boosters(grader: _GraderPayload) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in grader.score_boosters:
        original = item.original
        if not original.strip() or original in seen:
            continue
        seen.add(original)
        band_value = item.band_value
        if band_value.strip().lower().startswith("band "):
            band_value = "Supports the criterion"
        items.append(
            {
                "criterion": item.criterion,
                "original": original,
                "why_it_scores": item.why_it_scores,
                "keep_doing": item.keep_doing,
                "band_value": band_value,
            }
        )
        if len(items) >= 6:
            break
    return items

def _normalize_vocabulary_suggestions(
    suggestions: list[_VocabularySuggestionPayload],
) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for suggestion in suggestions:
        current_phrase = suggestion.current_phrase
        improved_phrase = suggestion.improved_phrase
        if not current_phrase.strip() or not improved_phrase.strip():
            continue
        key = (current_phrase.lower(), improved_phrase.lower())
        if key in seen:
            continue
        seen.add(key)
        level = suggestion.level.strip().upper()
        if level not in {"C1", "C2"}:
            level = ""
        normalized.append(
            {
                "current_phrase": current_phrase,
                "improved_phrase": improved_phrase,
                "level": level,
                "why_it_works": suggestion.why_it_works,
                "example_sentence": suggestion.example_sentence,
            }
        )
        if len(normalized) >= _VOCAB_MAX_COUNT:
            break
    return normalized

def _augment_vocabulary_suggestions(
    *,
    task_type: str,
    essay_text: str,
    annotations: list[dict[str, Any]],
    items: list[dict[str, str]],
) -> list[dict[str, str]]:
    items = [
        item for item in items
        if item["current_phrase"].strip() and item["current_phrase"] in essay_text
        and item["improved_phrase"].strip()
    ]
    seen: set[tuple[str, str]] = {
        (item["current_phrase"].lower(), item["improved_phrase"].lower()) for item in items
    }

    if len(items) < _VOCAB_MAX_COUNT:
        for annotation in annotations:
            if len(items) >= _VOCAB_MAX_COUNT:
                break
            category = str(annotation.get("category", "")).lower()
            if category not in {"lexical", "style", "cohesion"}:
                continue
            current_phrase = str(annotation.get("original") or "")
            replacements = annotation.get("replacements") or []
            improved_phrase = str(replacements[0] if replacements else "")
            if not current_phrase.strip() or current_phrase not in essay_text or not improved_phrase.strip():
                continue
            key = (current_phrase.lower(), improved_phrase.lower())
            if key in seen:
                continue
            seen.add(key)
            items.append(
                {
                    "current_phrase": current_phrase,
                    "improved_phrase": improved_phrase,
                    "level": "",
                    "why_it_works": str(annotation.get("explanation") or annotation.get("examiner_tip") or ""),
                    "example_sentence": str(annotation.get("improved_sentence") or ""),
                }
            )

    return items[:_VOCAB_MAX_COUNT]

def _assert_grader_payload_integrity(
    grader: _GraderPayload,
    *,
    essay_text: str,
) -> None:
    criteria = [
        ("task_achievement", grader.task_achievement),
        ("coherence", grader.coherence),
        ("lexical", grader.lexical),
        ("grammar", grader.grammar),
    ]
    for name, criterion in criteria:
        if not 0 <= criterion.band <= 9 or not criterion.band.is_integer():
            raise ValueError(f"{name}: criterion band must be an integer from 0 to 9")
        if not criterion.reasoning.strip() or not criterion.summary.strip():
            raise ValueError(f"{name}: missing descriptor justification or summary")
        if essay_text.strip() and not criterion.evidence_quotes:
            raise ValueError(f"{name}: missing candidate evidence")
        for quote in criterion.evidence_quotes:
            if not quote.strip() or quote not in essay_text:
                raise ValueError(f"{name}: evidence quote is not verbatim candidate text")

    # Optional coaching can be omitted; fabricated source spans must not ship.
    grader.sentence_fixes = [item for item in grader.sentence_fixes if item.original.strip() and item.original in essay_text]
    grader.score_boosters = [item for item in grader.score_boosters if item.original.strip() and item.original in essay_text]
    grader.vocabulary_suggestions = [item for item in grader.vocabulary_suggestions if item.current_phrase.strip() and item.current_phrase in essay_text]
    grader.error_taxonomy = [
        item for item in grader.error_taxonomy
        if item.examples and all(example.strip() and example in essay_text for example in item.examples)
    ]
