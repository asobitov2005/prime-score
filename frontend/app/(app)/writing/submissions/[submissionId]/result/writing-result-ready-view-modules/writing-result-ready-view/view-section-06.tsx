"use client";
import type { WritingResultReadyViewScope } from "./controller";
import { TargetActionPlanPanel } from "../dependencies";

export function WritingResultReadyViewSection6({ scope }: { scope: WritingResultReadyViewScope }) {
  const { result, overall, effectiveDesiredScore, targetActions } = scope;
  return (
    <TargetActionPlanPanel
                actionPlan={result.action_plan}
                currentBand={overall}
                desiredScore={effectiveDesiredScore}
                targetActions={targetActions}
              />
  );
}
