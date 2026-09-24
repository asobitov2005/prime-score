from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_checker_dependencies import *
from app.services.writing_checker_part_01 import _GraderPayload

def _build_precise_summary(
    *, grader: _GraderPayload, overall_band: float, penalty: float,
    word_count: int, word_minimum: int, ta: float, cc: float, lr: float, gra: float,
) -> str:
    return grader.overall_summary if grader.overall_summary.strip() else f"Band {overall_band:.1f} overall."

def _build_precise_next_steps(
    *, grader: _GraderPayload, annotations: list[dict[str, Any]],
    word_count: int, ta: float, cc: float, lr: float, gra: float,
) -> list[str]:
    return [step for step in grader.next_steps if step.strip()][:3]

def _normalize_target_actions(
    *, grader: _GraderPayload, precise_next_steps: list[str],
    annotations: list[dict[str, Any]], overall_band: float, desired_score: float | None,
) -> list[dict[str, Any]]:
    # Missing explanations, band effects and whole lists are not invitations to infer them.
    return [
        item.model_dump() for item in grader.target_action_plan
        if item.title.strip() or item.how.strip()
    ][:3]

def _normalize_band_boundaries(
    *, grader: _GraderPayload, ta: float, cc: float, lr: float, gra: float,
) -> list[dict[str, Any]]:
    supplied = []
    for item in grader.band_boundaries:
        if not item.criterion.strip():
            continue
        if not {"current_band", "next_band"}.issubset(item.model_fields_set):
            continue
        if not all(0 <= band <= 9 and band.is_integer() for band in (item.current_band, item.next_band)):
            continue
        supplied.append(item.model_dump())
    return supplied[:4]

def _normalize_checklist_payload(grader: _GraderPayload) -> list[dict[str, str]]:
    return [
        item.model_dump() for item in grader.ielts_checklist
        if item.label.strip() and "status" in item.model_fields_set
        and item.status in {"met", "partial", "missing"}
    ][:5]

def _normalize_error_taxonomy(grader: _GraderPayload) -> list[dict[str, Any]]:
    return [
        item.model_dump() for item in grader.error_taxonomy
        if item.label.strip() and item.category.strip()
        and "count" in item.model_fields_set and item.count >= 0
    ][:6]
