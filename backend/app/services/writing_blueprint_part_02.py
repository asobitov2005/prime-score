from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_blueprint_dependencies import *
from app.services.writing_blueprint_part_01 import BLUEPRINT_BENCHMARK_CARDS, CRITERION_LABELS, PIPELINE_VERSION, WritingBenchmarkCardBundle, WritingDescriptorBundle, _scope_for_task_type, descriptor_seed_rows

async def get_active_descriptor_bundle(
    session: AsyncSession,
    task_type: WritingTaskType | str,
) -> WritingDescriptorBundle:
    scope = _scope_for_task_type(task_type)
    rows = (
        await session.scalars(
            select(WritingDescriptor)
            .where(
                WritingDescriptor.task_type_scope.in_([scope, WritingTaskTypeScope.ALL]),
                WritingDescriptor.status == WritingConfigStatus.PUBLISHED,
                WritingDescriptor.is_active.is_(True),
            )
            .order_by(WritingDescriptor.version.desc(), WritingDescriptor.criterion_key.asc(), WritingDescriptor.band.asc())
        )
    ).all()
    if rows:
        # Resolve version/scope collisions by metadata, never by descriptor wording.
        effective = {}
        for row in sorted(rows, key=lambda row: (row.task_type_scope != scope, -row.version)):
            effective.setdefault((row.criterion_key, row.band), row)
        rows = list(effective.values())
        return WritingDescriptorBundle(
            version=max(int(row.version) for row in rows),
            task_type_scope=scope,
            items=[
                {
                    "criterion_key": row.criterion_key,
                    "band": int(row.band),
                    "descriptor_text": row.descriptor_text,
                }
                for row in rows
            ],
        )
    return WritingDescriptorBundle(
        version=1, task_type_scope=scope,
        items=[row for row in descriptor_seed_rows() if row["task_type_scope"] in (scope.value, "all")],
    )

async def get_active_benchmark_card_bundle(
    session: AsyncSession,
    task_type: WritingTaskType | str,
) -> WritingBenchmarkCardBundle:
    scope = _scope_for_task_type(task_type)
    rows = (
        await session.scalars(
            select(WritingBenchmarkCard)
            .where(
                WritingBenchmarkCard.task_type_scope == scope,
                WritingBenchmarkCard.status == WritingConfigStatus.PUBLISHED,
                WritingBenchmarkCard.is_active.is_(True),
            )
            .order_by(WritingBenchmarkCard.band.asc(), WritingBenchmarkCard.card_id.asc())
        )
    ).all()
    if rows:
        return WritingBenchmarkCardBundle(
            version=max(int(row.version) for row in rows),
            task_type_scope=scope,
            items=[
                {
                    "card_id": row.card_id,
                    "title": row.title,
                    "band": float(row.band),
                    "use_when": row.use_when,
                    "benchmark_profile": row.benchmark_profile,
                    "tolerance_lesson": row.tolerance_lesson,
                    "band_limiting_signs": list(row.band_limiting_signs or []),
                    "do_not_use_when": row.do_not_use_when,
                    "tags": list(row.tags or []),
                    "source": row.source,
                    "version": int(row.version),
                }
                for row in rows
            ],
        )
    fallback = [card for card in BLUEPRINT_BENCHMARK_CARDS if card["task_type_scope"] == scope.value]
    return WritingBenchmarkCardBundle(version=1, task_type_scope=scope, items=fallback)

def _score_dict(ta: float, cc: float, lr: float, gra: float) -> dict[str, float]:
    return {"task_achievement": ta, "coherence": cc, "lexical": lr, "grammar": gra}

def _weakness_profile(scores: dict[str, float]) -> dict[str, Any]:
    weakest_key = min(scores, key=lambda key: scores[key])
    strongest_key = max(scores, key=lambda key: scores[key])
    spread = max(scores.values()) - min(scores.values())
    return {
        "weakest_criterion": weakest_key,
        "weakest_label": CRITERION_LABELS[weakest_key],
        "strongest_criterion": strongest_key,
        "strongest_label": CRITERION_LABELS[strongest_key],
        "spread": spread,
    }

def select_benchmark_cards(
    cards: list[dict[str, Any]],
    *,
    initial_score: float,
    weakness_profile: dict[str, Any],
    max_cards: int = 5,
) -> list[dict[str, Any]]:
    if not cards or max_cards <= 0:
        return []
    ordered = sorted(cards, key=lambda item: (abs(float(item["band"]) - initial_score), float(item["band"])))
    lower = [card for card in cards if float(card["band"]) <= initial_score]
    higher = [card for card in cards if float(card["band"]) >= initial_score]
    selected: list[dict[str, Any]] = []
    for candidate in (
        max(lower, key=lambda item: float(item["band"])) if lower else None,
        ordered[0] if ordered else None,
        min(higher, key=lambda item: float(item["band"])) if higher else None,
    ):
        if candidate and candidate not in selected:
            selected.append(candidate)

    # Numeric neighbourhood only; semantic suitability belongs to the model.
    for card in ordered:
        if card not in selected:
            selected.append(card)
        if len(selected) >= max(3, min(max_cards, len(cards))):
            break
    return sorted(selected[:max_cards], key=lambda item: float(item["band"]))

def build_pipeline_run_payload(
    *,
    ta: float,
    cc: float,
    lr: float,
    gra: float,
    overall_pre_penalty: float,
    final_band: float,
    word_count_penalty: float,
    descriptors: WritingDescriptorBundle | None,
    benchmarks: WritingBenchmarkCardBundle | None,
) -> dict[str, Any]:
    scores = _score_dict(ta, cc, lr, gra)
    weakness = _weakness_profile(scores)
    return {
        "pipeline_version": PIPELINE_VERSION,
        "mode": "descriptor_grading",
        "initial_scores": {
            **scores,
            "overall_pre_penalty": calculate_overall_band(ta, cc, lr, gra),
            "weakness_profile": weakness,
            "descriptor_version": descriptors.version if descriptors else None,
            "benchmark_version": benchmarks.version if benchmarks else None,
        },
        "selected_benchmarks": [],
        "calibration_result": {"status": "not_performed"},
        "audit_result": {"status": "not_performed"},
        "confidence": "",
        "possible_score_range": "",
        "meta_learning_note": "",
    }
