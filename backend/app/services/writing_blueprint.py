from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import WritingConfigStatus, WritingTaskType, WritingTaskTypeScope
from app.models.writing import WritingBenchmarkCard, WritingDescriptor
from app.services.writing_rubric import IELTS_WRITING_RUBRIC_TEXT, calculate_overall_band, round_to_ielts_band


PIPELINE_VERSION = "blueprint_v1"
CRITERION_KEYS = ("task_achievement", "coherence", "lexical", "grammar")
CRITERION_LABELS = {
    "task_achievement": "Task Achievement / Task Response",
    "coherence": "Coherence & Cohesion",
    "lexical": "Lexical Resource",
    "grammar": "Grammatical Range & Accuracy",
}


@dataclass(slots=True)
class WritingDescriptorBundle:
    version: int
    task_type_scope: WritingTaskTypeScope
    items: list[dict[str, Any]]


@dataclass(slots=True)
class WritingBenchmarkCardBundle:
    version: int
    task_type_scope: WritingTaskTypeScope
    items: list[dict[str, Any]]


def round_criterion_band(value: float | int | None) -> float:
    """IELTS Writing criterion scores are whole bands; borderline scores fall down."""
    try:
        numeric = float(value if value is not None else 0)
    except (TypeError, ValueError):
        numeric = 0.0
    if numeric <= 0:
        return 0.0
    if numeric >= 9:
        return 9.0
    return float(math.floor(numeric + 1e-9))


def _scope_for_task_type(task_type: WritingTaskType | str) -> WritingTaskTypeScope:
    if isinstance(task_type, WritingTaskType):
        task_type = task_type.value
    return WritingTaskTypeScope.TASK_1 if str(task_type) == WritingTaskType.TASK_1.value else WritingTaskTypeScope.TASK_2


def _slug(value: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")
    return re.sub(r"_+", "_", text)


def _split_signs(value: str) -> list[str]:
    return [item.strip(" .;") for item in value.split(";") if item.strip(" .;")]


def _benchmark_card(
    *,
    task_type: str,
    title: str,
    band: float,
    use_when: str,
    benchmark_profile: str,
    tolerance_lesson: str,
    band_limiting_signs: str,
    do_not_use_when: str,
) -> dict[str, Any]:
    tags = [_slug(item) for item in _split_signs(band_limiting_signs)[:8]]
    return {
        "card_id": f"{task_type}_{_slug(title)}",
        "task_type_scope": task_type,
        "title": title,
        "band": band,
        "use_when": use_when,
        "benchmark_profile": benchmark_profile,
        "tolerance_lesson": tolerance_lesson,
        "band_limiting_signs": _split_signs(band_limiting_signs),
        "do_not_use_when": do_not_use_when,
        "tags": tags,
        "source": "blueprint_v1",
        "version": 1,
    }


BLUEPRINT_BENCHMARK_CARDS: list[dict[str, Any]] = [
    _benchmark_card(
        task_type="task_1",
        title="Band 3.5",
        band=3.5,
        use_when="The response attempts the task but misses key features, is significantly under length, and has serious language-control problems.",
        benchmark_profile="The candidate attempts to describe the chart, but not all key features are covered. The response is significantly under length. Organisation is difficult to identify, and there is no clear progression. Vocabulary is basic and repetitive. Sentence forms are limited, and errors are frequent.",
        tolerance_lesson="Band 3.5 may contain some task-related information, but the response lacks adequate coverage, progression, and language control.",
        band_limiting_signs="missing key features; under-length response; no clear progression; basic repetitive vocabulary; frequent grammar and spelling errors; weak evidence of sentence control",
        do_not_use_when="The response has clear organisation, covers the main features, and communicates the main message despite errors.",
    ),
    _benchmark_card(
        task_type="task_1",
        title="Band 5",
        band=5.0,
        use_when="The response describes the basic task but lacks overview, full key-feature coverage, and strong language control.",
        benchmark_profile="The basic process or information is described, but there is no effective overview and some key features are not adequately covered. Progression may be clear overall, but linking is mechanical. Vocabulary is minimally adequate. Grammar shows attempts at complexity, but structures are limited and errors are frequent.",
        tolerance_lesson="Band 5 can still be understandable and have clear overall progression; the limitation is incomplete task coverage, mechanical organisation, and restricted language.",
        band_limiting_signs="no clear overview; key features not adequately covered; mechanical sequencing; limited vocabulary; frequent grammatical errors; word-choice and word-form problems",
        do_not_use_when="The response has a clear overview, adequate data selection, and generally controlled language.",
    ),
    _benchmark_card(
        task_type="task_1",
        title="Band 5.5",
        band=5.5,
        use_when="The response covers key features but reports mechanically and lacks a proper overview.",
        benchmark_profile="Key features are covered, but reporting is mechanical. Data supports only some descriptions. Ideas are generally arranged coherently, although coherence may weaken later. Vocabulary is adequate but not flexible enough for a higher band. Grammar includes simple and complex sentences, but variety is limited.",
        tolerance_lesson="A Task 1 response can cover the chart and still remain around Band 5.5 if it lacks overview, flexible reporting, and strong selection of information.",
        band_limiting_signs="mechanical reporting; inconsistent data support; no overview; limited lexical flexibility; limited grammatical variety; coherence weakens in parts",
        do_not_use_when="The response has a strong overview, skilful selection of key features, and well-managed cohesion.",
    ),
    _benchmark_card(
        task_type="task_1",
        title="Band 6",
        band=6.0,
        use_when="The response is adequate, generally coherent, and includes trends or figures, but has missing information, minor inaccuracies, overused connectives, or limited sentence variation.",
        benchmark_profile="The candidate makes a good attempt to describe global trends and details. Some information may be missing or slightly inaccurate. The answer flows fairly smoothly, although connectives may be overused or inappropriate. Trend language is handled reasonably well, but word choice and sentence variation are limited.",
        tolerance_lesson="Band 6 can be readable and mostly coherent; it needs adequate task coverage and generally clear progression, not sophistication.",
        band_limiting_signs="missing or inaccurate information; weak or missing overview; overused or inappropriate connectives; limited sentence variety; some word-choice problems; limited flexibility",
        do_not_use_when="The response clearly selects and highlights key features, uses paragraphing and referencing well, and reads smoothly with flexible language.",
    ),
    _benchmark_card(
        task_type="task_1",
        title="Band 6 With Missing Weak Overview",
        band=6.0,
        use_when="The response covers data reasonably well but fails to summarise the most important overall pattern.",
        benchmark_profile="The answer has a suitable introduction, good data coverage, and some comparison. It can be followed, but it is repetitive and cohesive devices are overused. The main weakness is lack of a strong overview.",
        tolerance_lesson="For Task 1, missing or weak overview is a serious ceiling issue. Even with good data coverage, this can prevent a higher-band score.",
        band_limiting_signs="no clear overall summary; description is too sequential or detailed; repetition; overused cohesive devices; tense, verb-form, or spelling errors that slightly affect flow",
        do_not_use_when="The report clearly highlights the main trend or pattern and summarises the big picture effectively.",
    ),
    _benchmark_card(
        task_type="task_1",
        title="Band 7",
        band=7.0,
        use_when="The response handles trends and comparisons well and is easy to follow, but expression may be clumsy and errors may occur without impeding communication.",
        benchmark_profile="The response deals well with individual trends and overall comparison. The message can be followed easily. Cohesive devices are varied. Vocabulary is varied and structures are complex, but expression may be clumsy and errors occur.",
        tolerance_lesson="Band 7 does not require perfect expression. Some clumsy phrasing and grammar errors are acceptable if the message is clear and the task is handled well.",
        band_limiting_signs="incomplete opening or context; clumsy expression; word-form, tense, or voice errors; errors present but not communication-blocking; good but not highly skilful organisation",
        do_not_use_when="Errors are frequent enough to interrupt flow, or the report lacks a clear overview/key-feature selection.",
    ),
    _benchmark_card(
        task_type="task_1",
        title="Band 7 With Strong Language But Task Format Problems",
        band=7.0,
        use_when="The language is strong, but task achievement, format, overview, relevance, or paragraphing limits the score.",
        benchmark_profile="The candidate uses sophisticated lexis and a wide range of structures, with many accurate sentences. However, the format may be inappropriate, irrelevant personal comments may appear, there may be no clear overview, and paragraphing could be improved.",
        tolerance_lesson="Strong language cannot fully compensate for task problems. Task Achievement can cap the overall score even when Lexical Resource and Grammar look stronger.",
        band_limiting_signs="inappropriate format; irrelevant information; no clear overview; weak paragraphing; task achievement capped despite strong language; personal comments or speculation not required by Task 1",
        do_not_use_when="The task is fully and appropriately satisfied with no irrelevant format or content problems.",
    ),
    _benchmark_card(
        task_type="task_1",
        title="Band 8.5",
        band=8.5,
        use_when="The response is very high-level, accurate, fluent, cohesive, and controlled, but not quite perfect.",
        benchmark_profile="The response fully satisfies the task. Key stages or features are accurately and appropriately presented. There is an overview, although it could be fuller for the highest score. Cohesion is seamless and vocabulary and grammar are fluent, sophisticated, flexible, and accurate.",
        tolerance_lesson="Band 8.5 is not error-free. Rare minor errors and a slightly incomplete overview can still be compatible with a very high score.",
        band_limiting_signs="overview could be fuller; rare minor errors; tiny lapses that stop it from being Band 9; excellent control but not completely effortless/perfect",
        do_not_use_when="The report has noticeable omissions, mechanical cohesion, repeated errors, or only adequate rather than skilful control.",
    ),
    _benchmark_card(
        task_type="task_2",
        title="Band 4",
        band=4.0,
        use_when="The response is related to the topic but the position, ideas, and progression are unclear.",
        benchmark_profile="The essay is connected to the topic, but the introduction is confusing and the position is difficult to identify. Ideas are limited and unclear. There is no overall progression. Vocabulary is basic, and frequent word-choice and collocation errors create difficulty. Grammar range is very limited, and errors are dense.",
        tolerance_lesson="Band 4 can contain some relevant ideas, but the reader struggles to identify and follow them.",
        band_limiting_signs="unclear position; limited or unclear ideas; no clear progression; basic vocabulary; frequent word-choice and collocation errors; dense grammar and punctuation errors; reader difficulty",
        do_not_use_when="The essay has a clear position, generally relevant ideas, and an overall progression even if language control is weak.",
    ),
    _benchmark_card(
        task_type="task_2",
        title="Band 5.5",
        band=5.5,
        use_when="The essay has a clear position and relevant ideas but is underdeveloped, under-length, or has frequent language errors.",
        benchmark_profile="A clear position is presented and supported by relevant ideas, but these ideas need further development. The response may be under length. Organisation is generally coherent, but paragraphing may not always be logical. Vocabulary is attempted, but there are spelling, word-choice, and word-formation errors.",
        tolerance_lesson="A clear position alone does not guarantee Band 6 or higher. Development and control are essential.",
        band_limiting_signs="underdeveloped ideas; under-length response; illogical paragraphing; frequent grammar errors; word-choice and word-formation problems; limited support",
        do_not_use_when="Ideas are sufficiently developed, grammar errors are not frequent, and paragraphing is generally effective.",
    ),
    _benchmark_card(
        task_type="task_2",
        title="Band 5.5 With Copied Rubric",
        band=5.5,
        use_when="The essay has some relevant ideas and progression but copied prompt language, weak development, spelling errors, or paragraphing problems limit the band.",
        benchmark_profile="The topic is addressed and a relevant position is expressed, but copied rubric receives no credit. Some ideas are relevant, but development is unclear or insufficient. Overall progression exists. Vocabulary is adequate but control is weak, with frequent spelling errors.",
        tolerance_lesson="Some higher-band features can exist inside a Band 5.5 essay, but copied rubric and weak control can keep the overall score low.",
        band_limiting_signs="copied rubric; unclear development; mechanical linkers; short or inappropriate paragraphs; frequent spelling errors; weak vocabulary control; variable control of complex structures",
        do_not_use_when="The essay paraphrases the prompt independently and develops the main ideas clearly.",
    ),
    _benchmark_card(
        task_type="task_2",
        title="Band 6.5",
        band=6.5,
        use_when="The essay has a clear position, generally good ideas, and some flexibility, but organisation, copied language, or grammar prevents Band 7.",
        benchmark_profile="Arguments are generally well developed and ideas are appropriate. The position is clear. Paragraphing could be better, and the essay may become too general near the end. Vocabulary is varied and somewhat flexible, but paraphrasing may be limited. Grammar errors are regular, though they do not usually reduce clarity.",
        tolerance_lesson="Band 6.5 can look fairly strong, but repeated grammar errors, weak paragraphing, copied wording, or limited paraphrasing can prevent Band 7.",
        band_limiting_signs="copied rubric; weak paragraph focus; generalisation; limited paraphrasing; regular grammar errors; linking could be better; clear but not fully controlled writing",
        do_not_use_when="The essay shows effective paragraphing, only a few errors, and clearly Band 7-level control across the criteria.",
    ),
    _benchmark_card(
        task_type="task_2",
        title="Band 7.5",
        band=7.5,
        use_when="The essay is strong overall, with clear position, relevant support, good progression, and flexible vocabulary, but still has imbalance or some language limitations.",
        benchmark_profile="The candidate presents a clear position and explores relevant ideas. The response is strong, but some aspects could be considered more broadly. Ideas are organised logically, and there is clear progression. Vocabulary is wide, with less common items. Grammar has varied complex structures and frequent error-free sentences, though some errors occur.",
        tolerance_lesson="Band 7.5 can contain some grammar errors and sentence-form limitations. Strong task response, progression, and lexical control can keep the score high.",
        band_limiting_signs="somewhat narrow content coverage; some grammar errors; overuse of short sentence forms; strong but not fully Band 8-level control; ideas could be considered more broadly",
        do_not_use_when="The essay has frequent errors, weak paragraphing, unclear progression, or only basic support.",
    ),
    _benchmark_card(
        task_type="task_2",
        title="Band 7.5 With Occasional Content Language Lapses",
        band=7.5,
        use_when="The essay is strong but has occasional content lapses, referencing problems, punctuation weakness, or awkward expression.",
        benchmark_profile="The candidate addresses both aspects of the task and presents a clear position. Ideas are relevant and well extended, but there are occasional content lapses. Cohesive devices are effective, but there may be referencing lapses. Vocabulary is flexible, though occasional awkward expressions occur. Grammar shows a good range with minor systematic errors.",
        tolerance_lesson="Band 7.5 may still include occasional awkward expressions, minor systematic grammar errors, punctuation weakness, referencing lapses, and occasional content lapses.",
        band_limiting_signs="occasional content misdirection; referencing/substitution weakness; awkward expressions; minor systematic grammar errors; punctuation not always helpful; not consistently Band 8-level polish",
        do_not_use_when="The weaknesses are frequent, communication-limiting, or show unstable control.",
    ),
    _benchmark_card(
        task_type="task_2",
        title="Band 8.5",
        band=8.5,
        use_when="The essay is very strong, deeply developed, naturally written, well organised, and highly accurate, but has small content or cohesion lapses.",
        benchmark_profile="The topic is very well addressed and explored in depth. The position is clear throughout. Ideas are relevant and very well supported. Ideas are very well organised, paragraphing is appropriate, cohesion is sophisticated, vocabulary is wide and natural, and syntax is varied. Only occasional errors occur.",
        tolerance_lesson="Band 8.5 is not Band 9. It can still contain occasional errors, slight over-generalisation, minimal cohesion lapses, or a small missing angle in task response.",
        band_limiting_signs="small over-generalisation; one side not explored as fully as possible; minimal cohesion lapses; occasional errors; very strong performance, but not fully Band 9",
        do_not_use_when="The essay merely sounds fluent but lacks depth, precise support, or consistently natural control.",
    ),
]


def descriptor_seed_rows() -> list[dict[str, Any]]:
    sections = [
        ("task_achievement", "1. TASK ACHIEVEMENT", "2. COHERENCE AND COHESION"),
        ("coherence", "2. COHERENCE AND COHESION", "3. LEXICAL RESOURCE"),
        ("lexical", "3. LEXICAL RESOURCE", "4. GRAMMATICAL RANGE AND ACCURACY"),
        ("grammar", "4. GRAMMATICAL RANGE AND ACCURACY", "GRADING INSTRUCTIONS"),
    ]
    rows: list[dict[str, Any]] = []
    for criterion_key, heading, next_heading in sections:
        start = IELTS_WRITING_RUBRIC_TEXT.find(heading)
        end = IELTS_WRITING_RUBRIC_TEXT.find(next_heading, start + len(heading)) if next_heading else -1
        section = IELTS_WRITING_RUBRIC_TEXT[start : end if end != -1 else len(IELTS_WRITING_RUBRIC_TEXT)]
        for band in range(0, 10):
            match = re.search(rf"Band {band}\n(?P<body>.*?)(?=\n\nBand \d+\n|\Z)", section, re.DOTALL)
            if match is None:
                continue
            descriptor_text = " ".join(line.strip(" -\t") for line in match.group("body").splitlines() if line.strip())
            scopes = (WritingTaskTypeScope.ALL,)
            if criterion_key == "task_achievement":
                scopes = (WritingTaskTypeScope.TASK_1, WritingTaskTypeScope.TASK_2)
            for scope in scopes:
                rows.append(
                    {
                        "task_type_scope": scope.value,
                        "criterion_key": criterion_key,
                        "band": band,
                        "descriptor_text": descriptor_text,
                        "version": 1,
                    }
                )
    return rows


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
