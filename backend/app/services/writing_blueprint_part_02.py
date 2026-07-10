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
    return WritingDescriptorBundle(version=1, task_type_scope=scope, items=descriptor_seed_rows())

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
    if not cards:
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

    weakness = str(weakness_profile.get("weakest_criterion", "")).replace("task_achievement", "task")
    for card in ordered:
        text = " ".join(
            [
                str(card.get("use_when", "")),
                str(card.get("benchmark_profile", "")),
                " ".join(str(item) for item in card.get("band_limiting_signs", [])),
            ]
        ).lower()
        if weakness.split("_", 1)[0] in text and card not in selected:
            selected.append(card)
        if len(selected) >= max_cards:
            break

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
    selected = select_benchmark_cards(
        benchmarks.items if benchmarks else [],
        initial_score=overall_pre_penalty,
        weakness_profile=weakness,
    )
    lower = [card for card in selected if float(card["band"]) <= overall_pre_penalty]
    higher = [card for card in selected if float(card["band"]) >= overall_pre_penalty]
    closest = min(selected, key=lambda item: abs(float(item["band"]) - overall_pre_penalty)) if selected else None
    score_spread = weakness["spread"]
    borderline = any(abs(overall_pre_penalty - boundary) <= 0.25 for boundary in [5.5, 6.0, 6.5, 7.0, 7.5, 8.0])
    if word_count_penalty or score_spread >= 2 or borderline:
        confidence = "Medium"
    elif selected and closest and abs(float(closest["band"]) - overall_pre_penalty) <= 0.5:
        confidence = "Medium-high"
    else:
        confidence = "Medium-low"
    if score_spread >= 2.5:
        confidence = "Medium-low"
    possible_low = max(0.0, round_to_ielts_band(final_band - 0.5))
    possible_high = min(9.0, round_to_ielts_band(final_band + (0.5 if confidence != "Medium-high" else 0.0)))
    if confidence == "Medium-high":
        possible_low = final_band

    selected_public = [
        {
            "card_id": card["card_id"],
            "title": card["title"],
            "band": float(card["band"]),
            "use_when": card["use_when"],
            "tolerance_lesson": card["tolerance_lesson"],
            "band_limiting_signs": card.get("band_limiting_signs", []),
        }
        for card in selected
    ]
    calibration_result = {
        "initial_overall_band": overall_pre_penalty,
        "calibrated_band": overall_pre_penalty,
        "final_band": final_band,
        "closest_benchmark": closest["card_id"] if closest else None,
        "lower_anchor": max(lower, key=lambda item: float(item["band"]))["card_id"] if lower else None,
        "higher_anchor": min(higher, key=lambda item: float(item["band"]))["card_id"] if higher else None,
        "descriptor_control": "Official descriptors remain controlling; benchmark cards are calibration anchors only.",
    }
    audit_result = {
        "strict_audit": "Borderline criterion scores were floored to whole IELTS criterion bands.",
        "fairness_audit": "Selected benchmark cards were used to avoid both inflated and over-strict scoring.",
        "criterion_isolation_audit": f"Weakest criterion is {weakness['weakest_label']}; strongest criterion is {weakness['strongest_label']}.",
        "score_spread": score_spread,
        "word_count_penalty": word_count_penalty,
    }
    return {
        "pipeline_version": PIPELINE_VERSION,
        "mode": "full_diagnostic",
        "initial_scores": {
            **scores,
            "overall_pre_penalty": calculate_overall_band(ta, cc, lr, gra),
            "weakness_profile": weakness,
            "descriptor_version": descriptors.version if descriptors else 1,
            "benchmark_version": benchmarks.version if benchmarks else 1,
        },
        "selected_benchmarks": selected_public,
        "calibration_result": calibration_result,
        "audit_result": audit_result,
        "confidence": confidence,
        "possible_score_range": f"{possible_low:.1f}-{possible_high:.1f}",
        "meta_learning_note": (
            f"Use more benchmark coverage near Band {overall_pre_penalty:.1f} for "
            f"{weakness['weakest_label']} if future human review disagrees."
        ),
    }
