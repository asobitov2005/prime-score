from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_checker_dependencies import *
from app.services.writing_checker_part_01 import _GraderPayload, _VOCAB_MAX_COUNT, _VocabularySuggestionPayload
from app.services.writing_checker_part_02 import _GENERAL_VOCAB_RULES, _TASK_1_VOCAB_RULES, _TASK_2_VOCAB_RULES
from app.services.writing_checker_part_03 import _essay_word_count
from app.services.writing_checker_part_04 import _clean_text, _criterion_records, _trim_sentence

def _normalize_sentence_fixes(
    *,
    grader: _GraderPayload,
    annotations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in grader.sentence_fixes:
        original = _trim_sentence(item.original, limit=180)
        corrected = _trim_sentence(item.corrected_sentence or item.replacement, limit=220)
        if not original or original in seen:
            continue
        seen.add(original)
        items.append(
            {
                "priority": item.priority or len(items) + 1,
                "original": original,
                "replacement": _trim_sentence(item.replacement, limit=180),
                "corrected_sentence": corrected,
                "why": _trim_sentence(item.why, limit=130),
                "band_impact": _trim_sentence(item.band_impact, limit=100),
                "category": _clean_text(item.category).lower(),
            }
        )
        if len(items) >= 8:
            break

    for annotation in annotations:
        if len(items) >= 8:
            break
        original = _trim_sentence(str(annotation.get("original", "")), limit=180)
        if not original or original in seen:
            continue
        replacement = _trim_sentence(str(((annotation.get("replacements") or [""])[0])), limit=180)
        corrected = _trim_sentence(str(annotation.get("improved_sentence") or replacement), limit=220)
        if not replacement and not corrected:
            continue
        seen.add(original)
        items.append(
            {
                "priority": len(items) + 1,
                "original": original,
                "replacement": replacement,
                "corrected_sentence": corrected,
                "why": _trim_sentence(str(annotation.get("explanation") or annotation.get("short_message") or ""), limit=130),
                "band_impact": _trim_sentence(str(annotation.get("band_impact") or ""), limit=100),
                "category": _clean_text(str(annotation.get("category") or "")),
            }
        )
    return items

def _normalize_score_boosters(grader: _GraderPayload) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in grader.score_boosters:
        original = _trim_sentence(item.original, limit=180)
        if not original or original in seen:
            continue
        seen.add(original)
        band_value = _trim_sentence(item.band_value, limit=80)
        if band_value.lower().startswith("band "):
            band_value = "Supports the criterion"
        items.append(
            {
                "criterion": _trim_sentence(item.criterion, limit=70),
                "original": original,
                "why_it_scores": _trim_sentence(item.why_it_scores, limit=150),
                "keep_doing": _trim_sentence(item.keep_doing, limit=130),
                "band_value": band_value,
            }
        )
        if len(items) >= 6:
            break
    if items:
        return items

    for name, _, criterion in _criterion_records(
        grader,
        ta=grader.task_achievement.band,
        cc=grader.coherence.band,
        lr=grader.lexical.band,
        gra=grader.grammar.band,
    ):
        for quote in criterion.evidence_quotes[:2]:
            original = _trim_sentence(quote, limit=180)
            if not original or original in seen:
                continue
            seen.add(original)
            items.append(
                {
                    "criterion": name,
                    "original": original,
                    "why_it_scores": _trim_sentence(criterion.strengths[0] if criterion.strengths else criterion.summary, limit=150),
                    "keep_doing": "Keep this pattern in future essays.",
                    "band_value": f"Supports {name}",
                }
            )
            if len(items) >= 6:
                return items
    return items

def _normalize_vocabulary_suggestions(
    suggestions: list[_VocabularySuggestionPayload],
) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for suggestion in suggestions:
        current_phrase = _clean_text(suggestion.current_phrase)
        improved_phrase = _clean_text(suggestion.improved_phrase)
        if not current_phrase or not improved_phrase:
            continue
        key = (current_phrase.lower(), improved_phrase.lower())
        if key in seen:
            continue
        seen.add(key)
        level = suggestion.level.strip().upper()
        if level not in {"C1", "C2"}:
            level = "C1"
        normalized.append(
            {
                "current_phrase": current_phrase,
                "improved_phrase": improved_phrase,
                "level": level,
                "why_it_works": _trim_sentence(suggestion.why_it_works, limit=180),
                "example_sentence": _trim_sentence(suggestion.example_sentence, limit=220),
            }
        )
        if len(normalized) >= _VOCAB_MAX_COUNT:
            break
    return normalized

def _append_vocab_rule_suggestions(
    *,
    rules: list[dict[str, Any]],
    essay_text: str,
    items: list[dict[str, str]],
    seen: set[tuple[str, str]],
) -> None:
    for rule in rules:
        if len(items) >= _VOCAB_MAX_COUNT:
            return
        patterns = rule.get("patterns", [])
        if not patterns:
            continue
        matched = any(re.search(pattern, essay_text, flags=re.IGNORECASE) for pattern in patterns)
        if not matched:
            continue
        current_phrase = _clean_text(str(rule.get("current_phrase", "")))
        improved_phrase = _clean_text(str(rule.get("improved_phrase", "")))
        if not current_phrase or not improved_phrase:
            continue
        key = (current_phrase.lower(), improved_phrase.lower())
        if key in seen:
            continue
        seen.add(key)
        items.append(
            {
                "current_phrase": current_phrase,
                "improved_phrase": improved_phrase,
                "level": str(rule.get("level", "C1")).upper(),
                "why_it_works": _trim_sentence(str(rule.get("why", "")), limit=180),
                "example_sentence": _trim_sentence(str(rule.get("example", "")), limit=220),
            }
        )

def _augment_vocabulary_suggestions(
    *,
    task_type: str,
    essay_text: str,
    annotations: list[dict[str, Any]],
    items: list[dict[str, str]],
) -> list[dict[str, str]]:
    seen: set[tuple[str, str]] = {
        (item["current_phrase"].lower(), item["improved_phrase"].lower()) for item in items
    }

    _append_vocab_rule_suggestions(
        rules=_TASK_2_VOCAB_RULES if task_type == WritingTaskType.TASK_2.value else _TASK_1_VOCAB_RULES,
        essay_text=essay_text,
        items=items,
        seen=seen,
    )
    _append_vocab_rule_suggestions(
        rules=_GENERAL_VOCAB_RULES,
        essay_text=essay_text,
        items=items,
        seen=seen,
    )

    if len(items) < _VOCAB_MAX_COUNT:
        for annotation in annotations:
            if len(items) >= _VOCAB_MAX_COUNT:
                break
            category = str(annotation.get("category", "")).lower()
            if category not in {"lexical", "style", "cohesion"}:
                continue
            current_phrase = _clean_text(str(annotation.get("original", "")))
            replacements = annotation.get("replacements") or []
            improved_phrase = _clean_text(str(replacements[0] if replacements else ""))
            if not current_phrase or not improved_phrase:
                continue
            key = (current_phrase.lower(), improved_phrase.lower())
            if key in seen:
                continue
            seen.add(key)
            items.append(
                {
                    "current_phrase": current_phrase,
                    "improved_phrase": improved_phrase,
                    "level": "C1",
                    "why_it_works": _trim_sentence(
                        _clean_text(str(annotation.get("explanation", "")))
                        or _clean_text(str(annotation.get("examiner_tip", "")))
                        or "This version sounds more precise and natural in academic writing.",
                        limit=180,
                    ),
                    "example_sentence": _trim_sentence(
                        _clean_text(str(annotation.get("improved_sentence", "")))
                        or f"Writers can use {improved_phrase!r} when they need a more natural academic phrase.",
                        limit=220,
                    ),
                }
            )

    return items[:_VOCAB_MAX_COUNT]

def _assert_grader_payload_integrity(
    grader: _GraderPayload,
    *,
    essay_text: str,
) -> None:
    if _essay_word_count(essay_text) < 20:
        return

    criteria = [
        ("task_achievement", grader.task_achievement),
        ("coherence", grader.coherence),
        ("lexical", grader.lexical),
        ("grammar", grader.grammar),
    ]
    zero_bands = [name for name, criterion in criteria if criterion.band <= 0]
    if zero_bands:
        raise ValueError(
            "Grader returned zero-band criteria for a non-empty essay: "
            + ", ".join(zero_bands)
        )
