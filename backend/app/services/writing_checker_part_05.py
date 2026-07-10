from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_checker_dependencies import *
from app.services.writing_checker_part_01 import _CriterionPayload, _GraderPayload
from app.services.writing_checker_part_04 import _clean_text, _criterion_anchor_text, _criterion_records, _trim_sentence

def _build_precise_summary(
    *,
    grader: _GraderPayload,
    overall_band: float,
    penalty: float,
    word_count: int,
    word_minimum: int,
    ta: float,
    cc: float,
    lr: float,
    gra: float,
) -> str:
    criteria = _criterion_records(grader, ta=ta, cc=cc, lr=lr, gra=gra)
    strongest_name, strongest_band, strongest_payload = max(criteria, key=lambda item: item[1])
    weakest_name, weakest_band, weakest_payload = min(criteria, key=lambda item: item[1])
    strongest_anchor = _criterion_anchor_text(strongest_payload)
    weakest_anchor = _criterion_anchor_text(weakest_payload)
    priority = _clean_text(
        weakest_payload.improvements[0] if weakest_payload.improvements else weakest_payload.summary
    )

    parts = [
        f"Band {overall_band:.1f} overall. Your strongest area is {strongest_name} at Band {strongest_band:.1f}"
        + (f", especially in {strongest_anchor!r}." if strongest_anchor else "."),
        f"The main score limit is {weakest_name} at Band {weakest_band:.1f}"
        + (f", where {weakest_anchor!r} still sounds underdeveloped or imprecise." if weakest_anchor else "."),
    ]
    if priority and word_count >= 120:
        parts.append(f"The fastest improvement now is to {priority.rstrip('.')}.")
    if penalty > 0:
        parts.append(
            f"Length also cost you {penalty:.1f} band because the response stayed below the {word_minimum}-word minimum."
        )
    if word_count < 90:
        return " ".join(parts[:1])
    if word_count < 180:
        return " ".join(parts[:2])
    return " ".join(parts[:4])

def _annotation_action(annotation: dict[str, Any]) -> str | None:
    original = _clean_text(str(annotation.get("original", "")))
    replacement = _clean_text(
        str(((annotation.get("replacements") or [""])[0]))
    )
    short_message = _clean_text(str(annotation.get("short_message", "")))
    if not original:
        return None
    if replacement:
        action = f"Replace {original!r} with {replacement!r}"
    else:
        action = f"Fix {original!r}"
    if short_message:
        action += f" to solve the {short_message.lower()} issue"
    band_impact = _clean_text(str(annotation.get("band_impact", "")))
    if band_impact:
        action += f"; {band_impact.rstrip('.')}"
    return f"{action}."

def _criterion_action(name: str, criterion: _CriterionPayload) -> str | None:
    improvement = _clean_text(criterion.improvements[0] if criterion.improvements else criterion.summary)
    if not improvement:
        return None
    return f"In {name}, {improvement.rstrip('.')}."

def _build_precise_next_steps(
    *,
    grader: _GraderPayload,
    annotations: list[dict[str, Any]],
    word_count: int,
    ta: float,
    cc: float,
    lr: float,
    gra: float,
) -> list[str]:
    criteria = _criterion_records(grader, ta=ta, cc=cc, lr=lr, gra=gra)
    ordered_criteria = sorted(criteria, key=lambda item: item[1])
    steps: list[str] = []
    seen: set[str] = set()

    for annotation in annotations:
        action = _annotation_action(annotation)
        if action and action not in seen:
            seen.add(action)
            steps.append(action)
        if len(steps) >= 2:
            break

    for name, _, criterion in ordered_criteria:
        action = _criterion_action(name, criterion)
        if action and action not in seen:
            seen.add(action)
            steps.append(action)
        if len(steps) >= 3:
            break

    fallback = [
        "Write one more revision draft and fix every highlighted sentence before changing ideas.",
        "Underline repeated nouns and verbs, then upgrade at least three of them with stronger academic collocations.",
        "Check each paragraph for one clear main idea, one supporting explanation, and one precise example or comparison.",
    ]
    for item in fallback:
        if item not in seen:
            steps.append(item)
        if len(steps) >= 3:
            break
    target_count = 2 if word_count < 180 else 3
    return steps[:target_count]

def _target_context_label(*, current_band: float, desired_score: float | None) -> str:
    stretch_target = min(9.0, current_band + 1.0)
    passed_target = min(9.0, current_band + 0.5)
    if desired_score is None:
        return f"Band {current_band:.1f} -> {stretch_target:.1f}"
    if current_band >= desired_score:
        return f"Band {current_band:.1f} -> {passed_target:.1f}"
    return f"Band {current_band:.1f} -> {min(desired_score, stretch_target):.1f}"

def _normalize_target_actions(
    *,
    grader: _GraderPayload,
    precise_next_steps: list[str],
    annotations: list[dict[str, Any]],
    overall_band: float,
    desired_score: float | None,
) -> list[dict[str, Any]]:
    target = _target_context_label(current_band=overall_band, desired_score=desired_score)
    normalized: list[dict[str, Any]] = []
    for item in grader.target_action_plan:
        title = _trim_sentence(item.title, limit=64)
        how = _trim_sentence(item.how, limit=150)
        why = _trim_sentence(item.why, limit=120)
        if not title and how:
            title = how.split(".")[0][:64].strip()
        if not how and title:
            how = title
        if not title or not how:
            continue
        normalized.append(
            {
                "title": title,
                "why": why or f"Needed for {target}.",
                "how": how,
                "example": _trim_sentence(item.example, limit=140),
                "band_impact": _trim_sentence(item.band_impact, limit=100) or target,
                "priority": item.priority or len(normalized) + 1,
            }
        )
        if len(normalized) >= 3:
            break

    for step in precise_next_steps:
        if len(normalized) >= 3:
            break
        clean = _trim_sentence(step, limit=150)
        if not clean:
            continue
        normalized.append(
            {
                "title": clean.split(";")[0].split(".")[0][:64].strip() or "Fix the score limiter",
                "why": f"This is the shortest move for {target}.",
                "how": clean,
                "example": "",
                "band_impact": target,
                "priority": len(normalized) + 1,
            }
        )

    for annotation in annotations:
        if len(normalized) >= 3:
            break
        action = _annotation_action(annotation)
        if not action:
            continue
        normalized.append(
            {
                "title": "Fix this sentence first",
                "why": _trim_sentence(str(annotation.get("short_message") or ""), limit=100) or f"It blocks {target}.",
                "how": _trim_sentence(action, limit=150),
                "example": _trim_sentence(str(annotation.get("improved_sentence") or ""), limit=140),
                "band_impact": _trim_sentence(str(annotation.get("band_impact") or ""), limit=100) or target,
                "priority": len(normalized) + 1,
            }
        )
    return normalized[:3]

def _normalize_band_boundaries(
    *,
    grader: _GraderPayload,
    ta: float,
    cc: float,
    lr: float,
    gra: float,
) -> list[dict[str, Any]]:
    supplied = []
    for item in grader.band_boundaries:
        criterion = _trim_sentence(item.criterion, limit=70)
        if not criterion:
            continue
        supplied.append(
            {
                "criterion": criterion,
                "current_band": round_to_ielts_band(item.current_band),
                "next_band": round_to_ielts_band(item.next_band or min(9.0, item.current_band + 1.0)),
                "why_current": _trim_sentence(item.why_current, limit=170),
                "required_for_next": _trim_sentence(item.required_for_next, limit=170),
            }
        )
    if len(supplied) >= 4:
        return supplied[:4]

    fallback: list[dict[str, Any]] = []
    for name, band, criterion in _criterion_records(grader, ta=ta, cc=cc, lr=lr, gra=gra):
        required = _clean_text(criterion.improvements[0] if criterion.improvements else criterion.summary)
        fallback.append(
            {
                "criterion": name,
                "current_band": band,
                "next_band": min(9.0, band + 1.0),
                "why_current": _trim_sentence(criterion.reasoning or criterion.summary, limit=170),
                "required_for_next": _trim_sentence(required, limit=170),
            }
        )
    return fallback

def _normalize_checklist_payload(grader: _GraderPayload) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    for item in grader.ielts_checklist:
        label = _trim_sentence(item.label, limit=80)
        if not label:
            continue
        status = item.status if item.status in {"met", "partial", "missing"} else "partial"
        items.append(
            {
                "label": label,
                "status": status,
                "detail": _trim_sentence(item.detail, limit=140),
                "how_to_fix": _trim_sentence(item.how_to_fix, limit=140),
            }
        )
    return items[:5]

def _normalize_error_taxonomy(grader: _GraderPayload) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for item in grader.error_taxonomy:
        label = _trim_sentence(item.label, limit=80)
        if not label:
            continue
        count = max(0, int(item.count or 0))
        items.append(
            {
                "category": _clean_text(item.category).lower() or "style",
                "subcategory": _clean_text(item.subcategory).lower(),
                "label": label,
                "count": count,
                "examples": [_trim_sentence(example, limit=100) for example in item.examples[:3] if _clean_text(example)],
                "fix": _trim_sentence(item.fix, limit=140),
            }
        )
    return items[:6]
