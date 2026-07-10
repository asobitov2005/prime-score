"use client";
import type { WritingResultReadyViewScope } from "./controller";
import { FeedbackPanel, toBandNumber } from "../dependencies";

export function WritingResultReadyViewSection16({ scope }: { scope: WritingResultReadyViewScope }) {
  const { result } = scope;
  return (
    {result.roast && (result.roast.overall_roast || result.roast.savage_tips?.length) ? (
                <FeedbackPanel
                  roast={result.roast}
                  taBand={toBandNumber(result.task_achievement.band)}
                  ccBand={toBandNumber(result.coherence.band)}
                  lrBand={toBandNumber(result.lexical.band)}
                  graBand={toBandNumber(result.grammar.band)}
                />
              ) : null}
  );
}
