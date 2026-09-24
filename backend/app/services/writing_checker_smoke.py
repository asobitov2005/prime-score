"""DB-free synthetic Writing smoke through the configured GPU text transport.

Run: python -m app.services.writing_checker_smoke --model MODEL
Reads GPU_UZ_API_KEY or a hidden prompt; makes real API calls, no DB writes.
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
from types import SimpleNamespace

from app.models.enums import AiProvider, AiUseCase, WritingTaskType, WritingTaskTypeScope
from app.services.ai_config import ResolvedAiUseCaseConfig
from app.services.writing_anchors import ANCHORS
from app.services.writing_blueprint import (
    BLUEPRINT_BENCHMARK_CARDS, WritingBenchmarkCardBundle, WritingDescriptorBundle,
    descriptor_seed_rows,
)
from app.services.writing_checker import compute_essay_hash, grade_essay_sync
from app.services.writing_config import (
    DEFAULT_PROMPT_ENTRIES, WritingAnchorBundle, WritingPromptBundle, WritingRubricBundle,
)
from app.services.writing_rubric import IELTS_WRITING_RUBRIC_TEXT

SYNTHETIC_TASK = "Summarise the chart showing bus and car journeys in a town in 2010 and 2020."
SYNTHETIC_IMAGE = "Bus journeys: 2010 40,000, 2020 60,000. Car journeys: 2010 80,000, 2020 70,000."
SYNTHETIC_ESSAY = (
    "The chart compare bus and car journeys in a town between 2010 and 2020. "
    "Overall, bus use increased while car use declined, although cars remained more common.\n\n"
    "In 2010 there were 40,000 bus journeys, compared with 80,000 journeys by car. "
    "Thus, the number of car journeys was twice the bus figure at the start of the period. "
    "By 2020, bus journeys had risen to 60,000, an increase of 20,000. "
    "This represented growth of half the original total.\n\n"
    "Car journeys moved in the opposite direction, falling by 10,000 to 70,000 in 2020. "
    "Despite this decline, cars still accounted for more journeys than buses in the final year. "
    "However, the difference between the two modes narrowed considerably, from 40,000 journeys "
    "in 2010 to only 10,000 in 2020. The combined total also increased, from 120,000 "
    "to 130,000 journeys over the ten years shown in the chart."
)


def default_writing_bundles(task_type: str = "task_1") -> dict:
    scope = WritingTaskTypeScope(task_type)
    return {
        "prompts": WritingPromptBundle(None, 1, scope, dict(DEFAULT_PROMPT_ENTRIES)),
        "rubric": WritingRubricBundle(None, 1, scope, IELTS_WRITING_RUBRIC_TEXT),
        "anchors": WritingAnchorBundle(None, 1, scope, list(ANCHORS.get(task_type, []))),
        "descriptors": WritingDescriptorBundle(1, scope, [
            row for row in descriptor_seed_rows() if row["task_type_scope"] in (task_type, "all")
        ]),
        "benchmarks": WritingBenchmarkCardBundle(1, scope, [
            card for card in BLUEPRINT_BENCHMARK_CARDS if card["task_type_scope"] == task_type
        ]),
    }


def run_smoke(*, api_key: str, model: str, base_url: str | None = None, regrade: bool = False) -> dict:
    def config(use_case: AiUseCase) -> ResolvedAiUseCaseConfig:
        return ResolvedAiUseCaseConfig(
            use_case=use_case, provider=AiProvider.GPU_UZ, provider_config_id=None,
            provider_label="GPU smoke", api_key=api_key, base_url=base_url,
            model_id=model, model_record_id=None, context_window=None,
            settings_json={"http_timeout_ms": 120000, "regrade_improved_version": regrade},
        )

    return grade_essay_sync(
        task=SimpleNamespace(task_type=WritingTaskType.TASK_1, prompt_html=SYNTHETIC_TASK,
                             image_summary=SYNTHETIC_IMAGE, word_minimum=150),
        essay_text=SYNTHETIC_ESSAY, word_count=len(SYNTHETIC_ESSAY.split()),
        essay_hash=compute_essay_hash("synthetic-smoke", SYNTHETIC_ESSAY, "task_1"),
        desired_score=None, grader_config=config(AiUseCase.WRITING_GRADER),
        improver_config=config(AiUseCase.WRITING_IMPROVER), roast_config=config(AiUseCase.WRITING_ROAST),
        **default_writing_bundles(),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True)
    parser.add_argument("--base-url")
    parser.add_argument("--regrade", action="store_true", help="Opt into another full grading call")
    args = parser.parse_args()
    result = run_smoke(api_key=os.environ.get("GPU_UZ_API_KEY") or getpass.getpass("GPU.uz API key: "),
                       model=args.model, base_url=args.base_url, regrade=args.regrade)
    # No secrets or user data; this CLI always uses its built-in synthetic essay.
    print(json.dumps({"overall_band": result["overall_band"], "potential_band": result["potential_band"],
                      "rewrite_present": bool(result["improved_version"]),
                      "roast_present": bool(result["roast_feedback"]), "run": result["evaluation_run"]}))


if __name__ == "__main__":
    main()
