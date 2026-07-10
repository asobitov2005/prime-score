"use client";
import type { WritingResultReadyViewScope } from "./controller";
import { Card, CardContent, CardHeader, CardTitle, ImprovedDiffView, cn } from "../dependencies";

export function WritingResultReadyViewSection13({ scope }: { scope: WritingResultReadyViewScope }) {
  const { result, hasImprovedTextChanges, potential, delta, setActiveVersion, activeVersion } = scope;
  return (
    {result.improved_version && hasImprovedTextChanges ? (
                <Card className="rounded-3xl border-border/60 bg-card/40 mt-2">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">Improved version</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          This is a stronger next draft built from your original ideas and structure, with a controlled improvement target.
                          {potential !== null
                            ? ` It is capped at Band ${potential.toFixed(1)}${delta > 0 ? ` (↑${delta.toFixed(1)})` : ""}.`
                            : ""}
                        </p>
                      </div>
                      <div className="inline-flex rounded-full border border-border/60 bg-muted/30 p-1 text-sm">
                        <button
                          type="button"
                          onClick={() => setActiveVersion("original")}
                          className={cn(
                            "px-3 py-1 rounded-full transition-colors",
                            activeVersion === "original" ? "bg-background shadow-sm" : "text-muted-foreground",
                          )}
                        >
                          Original
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveVersion("improved")}
                          className={cn(
                            "px-3 py-1 rounded-full transition-colors flex items-center gap-1",
                            activeVersion === "improved" ? "bg-background shadow-sm" : "text-muted-foreground",
                          )}
                        >
                          Improved
                          {potential !== null && delta > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                              ↑{delta.toFixed(1)}
                            </span>
                          ) : null}
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-md bg-rose-500/10 px-2 py-1 text-rose-700 line-through decoration-rose-500 dark:text-rose-300">removed</span>
                      <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-800 dark:text-emerald-200">added / improved</span>
                    </div>
                    {activeVersion === "improved" ? (
                      <ImprovedDiffView original={result.essay_text} improved={result.improved_version} />
                    ) : (
                      <div className="rounded-2xl border border-border/40 bg-muted/20 p-5 leading-7 text-sm whitespace-pre-wrap">
                        {result.essay_text}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : null}
  );
}
