"""Run an opt-in live Writing check on synthetic text, without creating DB records.

Uses the configured database bindings/prompts. Never loads a user's essay.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json

from app.db.session import get_engine, get_session_maker
from app.models.enums import AiUseCase, WritingTaskType
from app.models.writing import WritingTask
from app.services.ai_config import resolve_ai_use_case_config
from app.services.writing_blueprint import (
    get_active_benchmark_card_bundle,
    get_active_descriptor_bundle,
)
from app.services.writing_checker import grade_essay_sync
from app.services.writing_input_validation import WritingInputRejected
from app.services.writing_config import (
    get_active_anchor_bundle,
    get_active_prompt_bundle,
    get_active_rubric_bundle,
)

SAMPLES = {
    "task_1": {
        "prompt": "Summarise the table showing the percentage of commuters using three transport modes in a town in 2010 and 2020. Make comparisons where relevant.",
        "image_summary": "Table: car 60% in 2010 and 45% in 2020; bus 30% in 2010 and 35% in 2020; bicycle 10% in 2010 and 20% in 2020. These are the only values shown.",
        "essay": """The table compare the proportions of commuters travelling by car, bus and bicycle in a town in 2010 and 2020. Overall, cars remained the most widely used option, although their share fell considerably. Both public transport and cycling became more common during the period.

In 2010, car users accounted for 60% of all commuters, twice the proportion who took a bus. The remaining 10% travelled by bicycle. Ten years later, the figure for cars had decreased to 45%, a fall of 15 percentage points. Despite this reduction, driving still represented a larger share than either of the other methods individually.

By contrast, the proportion using buses rose from 30% to 35%. Cycling experienced the largest relative increase, doubling from 10% to 20%. Together, these two alternatives made up 55% of journeys in 2020, compared with 40% in 2010. Therefore, while cars were still the leading single mode, a majority of commuters used another form of transport by the end of the period.""",
    },
    "task_2": {
        "prompt": "Some people believe public libraries are no longer necessary because information is available online. To what extent do you agree or disagree?",
        "image_summary": "",
        "essay": """The internet has changed how people find information, and some argue that public libraries have therefore become unnecessary. I disagree with this view. Although online resources are often more convenient, libraries provide access and support that a website alone cannot offer.

One important reason to retain libraries is that not everyone has suitable technology at home. A student may own a phone but lack a computer on which to complete a lengthy assignment. Free library computers and reliable connections enable such students to work without having to purchase equipment. Libraries also provide a quiet environment, which is especially valuable for people living in crowded homes. Removing these spaces would make learning depend more heavily on a person's financial circumstances.

Furthermore, librarians can help readers evaluate information rather than simply locate it. Search engines return many results, but their order does not necessarily reflect accuracy. For example, someone researching a health topic may struggle to distinguish a scientific explanation from advertising. A trained librarian can direct that person towards reputable sources. This support is particularly useful for older residents who has limited experience of digital services.

Admittedly, maintaining large buildings and printed collections costs money. Local governments should therefore reconsider how library space is used. They could reduce little-used collections and provide more study rooms, digital resources and workshops. Such changes would allow libraries to complement online information instead of attempting to compete with it. However, decisions should reflect local needs, since some communities still rely heavily on printed books.

In conclusion, easy access to online information does not remove the need for public libraries. Their role should evolve, but equal access to learning and practical guidance remain strong reasons to fund them.""",
    },
}


async def run(task_type: str, case: str = "valid") -> dict:
    sample = dict(SAMPLES[task_type])
    if case == "prompt-only":
        sample["essay"] = sample["prompt"]
    elif case == "wrong-task":
        sample["essay"] = SAMPLES["task_1" if task_type == "task_2" else "task_2"][
            "essay"
        ]
    scope = WritingTaskType(task_type)
    async with get_session_maker()() as session:
        configs = {
            use_case: await resolve_ai_use_case_config(session, use_case)
            for use_case in (
                AiUseCase.WRITING_GRADER,
                AiUseCase.WRITING_IMPROVER,
                AiUseCase.WRITING_ROAST,
            )
        }
        prompts = await get_active_prompt_bundle(session, scope)
        rubric = await get_active_rubric_bundle(session, scope)
        anchors = await get_active_anchor_bundle(session, scope)
        descriptors = await get_active_descriptor_bundle(session, scope)
        benchmarks = await get_active_benchmark_card_bundle(session, scope)
    task = WritingTask(
        task_type=scope,
        prompt_html=sample["prompt"],
        image_summary=sample["image_summary"],
        word_minimum=150 if task_type == "task_1" else 250,
    )
    result = await asyncio.to_thread(
        grade_essay_sync,
        task=task,
        essay_text=sample["essay"],
        word_count=len(sample["essay"].split()),
        essay_hash=hashlib.sha256(sample["essay"].encode()).hexdigest(),
        desired_score=None,
        grader_config=configs[AiUseCase.WRITING_GRADER],
        improver_config=configs[AiUseCase.WRITING_IMPROVER],
        roast_config=configs[AiUseCase.WRITING_ROAST],
        prompts=prompts,
        rubric=rubric,
        anchors=anchors,
        descriptors=descriptors,
        benchmarks=benchmarks,
    )
    if not result.get("improved_version") or not result.get("roast_feedback"):
        raise RuntimeError("Live smoke check did not complete all feedback stages.")
    if case == "prompt-only":
        raise RuntimeError("Prompt-only input was incorrectly awarded a score.")
    task_fit = (
        result.get("evaluation_run", {}).get("audit_result", {}).get("task_fit", {})
    )
    if case == "wrong-task" and task_fit.get("task_relation") not in {
        "wrong_task",
        "off_topic",
    }:
        raise RuntimeError("Wrong-task essay was not flagged by task-fit validation.")
    return {
        "task_type": task_type,
        "case": case,
        "task_fit": task_fit,
        "model": result.get("model_version"),
        "overall_band": result["overall_band"],
        "criteria": {
            key: result[key]
            for key in (
                "task_achievement_band",
                "coherence_band",
                "lexical_band",
                "grammar_band",
            )
        },
        "annotations": len(result["inline_annotations"]),
        "has_rewrite": bool(result["improved_version"]),
        "has_roast": bool(result["roast_feedback"]),
        "latency_ms": result["latency_ms"],
        "stage_metrics": result.get("evaluation_run", {})
        .get("audit_result", {})
        .get("stage_metrics", []),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--task-type", choices=list(SAMPLES), required=True)
    parser.add_argument(
        "--case", choices=["valid", "prompt-only", "wrong-task"], default="valid"
    )
    args = parser.parse_args()

    async def execute() -> None:
        try:
            print(json.dumps(await run(args.task_type, args.case)))
        except WritingInputRejected as exc:
            if args.case != "prompt-only":
                raise
            print(
                json.dumps(
                    {
                        "case": args.case,
                        "status": "correctly_rejected",
                        "task_fit": exc.task_fit,
                    }
                )
            )
        finally:
            await get_engine().dispose()

    asyncio.run(execute())


if __name__ == "__main__":
    main()
