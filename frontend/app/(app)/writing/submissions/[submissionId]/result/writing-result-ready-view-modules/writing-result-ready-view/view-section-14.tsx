"use client";
import type { WritingResultReadyViewScope } from "./controller";
import { ArrowRight, Card, CardContent, CardHeader, CardTitle, Sparkles } from "../dependencies";

export function WritingResultReadyViewSection14({ scope }: { scope: WritingResultReadyViewScope }) {
  const { result, strongestCriterion, weakestCriterion } = scope;
  return (
    {(result.overall_summary || result.next_steps?.length) ? (
                <Card className="rounded-3xl border-border/60 bg-gradient-to-br from-violet-500/5 via-card to-card mt-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-violet-500" />
                      Coach summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {result.overall_summary ? (
                      <p className="text-sm text-foreground/90 leading-relaxed">{result.overall_summary}</p>
                    ) : null}
                    {(strongestCriterion || weakestCriterion) ? (
                      <div className="grid gap-3 lg:grid-cols-2">
                        {strongestCriterion ? (
                          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                Strongest area
                              </div>
                              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                Band {strongestCriterion.band.toFixed(1)}
                              </div>
                            </div>
                            <div className="mt-2 text-sm font-semibold text-foreground">
                              {strongestCriterion.title}
                            </div>
                            <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
                              {strongestCriterion.data.summary || strongestCriterion.data.strengths?.[0] || "This criterion is currently leading your score."}
                            </p>
                          </div>
                        ) : null}
                        {weakestCriterion ? (
                          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                Main score limiter
                              </div>
                              <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                                Band {weakestCriterion.band.toFixed(1)}
                              </div>
                            </div>
                            <div className="mt-2 text-sm font-semibold text-foreground">
                              {weakestCriterion.title}
                            </div>
                            <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
                              {weakestCriterion.data.improvements?.[0] || weakestCriterion.data.summary || "This criterion is currently holding the overall band down."}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {result.next_steps?.length ? (
                      <div className="space-y-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Next steps
                        </div>
                        <ul className="space-y-1.5">
                          {result.next_steps.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-violet-500" />
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
  );
}
