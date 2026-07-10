"use client";
import type { WritingResultReadyViewScope } from "./controller";
import { CriterionCard } from "../dependencies";

export function WritingResultReadyViewSection5({ scope }: { scope: WritingResultReadyViewScope }) {
  const { result } = scope;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
                <CriterionCard title="Task Achievement" data={result.task_achievement} accent="text-violet-600 dark:text-violet-400" />
                <CriterionCard title="Coherence & Cohesion" data={result.coherence} accent="text-blue-600 dark:text-blue-400" />
                <CriterionCard title="Lexical Resource" data={result.lexical} accent="text-emerald-600 dark:text-emerald-400" />
                <CriterionCard title="Grammatical Range & Accuracy" data={result.grammar} accent="text-amber-600 dark:text-amber-400" />
              </div>
  );
}
