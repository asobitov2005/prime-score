"use client";
import type { WritingResultReadyViewScope } from "./controller";
import { CATEGORY_STYLE, CardHeader, CardTitle, cn } from "../dependencies";

export function WritingResultReadyViewSection8({ scope }: { scope: WritingResultReadyViewScope }) {
  return (
    <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">Your essay with annotations</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Click any highlighted span or issue row to lock the detail view. The issue table stays stable while you read.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(CATEGORY_STYLE).map(([key, s]) => (
                        <span
                          key={key}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            s.chip,
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardHeader>
  );
}
