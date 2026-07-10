"use client";
import type { WritingResultReadyViewScope } from "./controller";
import { Sparkles } from "../dependencies";

export function WritingResultReadyViewSection10({ scope }: { scope: WritingResultReadyViewScope }) {
  const { errorCount } = scope;
  return (
    {errorCount === 0 ? (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-emerald-600" />
                      <div className="text-sm text-emerald-700 dark:text-emerald-300">
                        No inline annotations were generated for this essay.
                      </div>
                    </div>
                  ) : null}
  );
}
