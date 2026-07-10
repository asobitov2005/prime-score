"use client";
import type { WritingResultReadyViewScope } from "./controller";
import { Badge, Card, CardContent, CardHeader, CardTitle, ShieldCheck } from "../dependencies";

export function WritingResultReadyViewSection4({ scope }: { scope: WritingResultReadyViewScope }) {
  const { confidence, possibleScoreRange, selectedBenchmarks } = scope;
  return (
    <Card className="rounded-3xl border-border/60 bg-card/40">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                        AI estimate calibration
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        This is an AI IELTS estimate, not an official IELTS result. Criterion bands are whole bands; the overall score is rounded after averaging.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge tone="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        Confidence: {confidence}
                      </Badge>
                      <Badge tone="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300">
                        Range: {possibleScoreRange}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                {selectedBenchmarks.length ? (
                  <CardContent className="grid gap-3 pt-0 md:grid-cols-3">
                    {selectedBenchmarks.slice(0, 3).map((benchmark) => (
                      <div key={benchmark.card_id} className="rounded-2xl border border-border/60 bg-background/50 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-foreground">{benchmark.title}</div>
                          <Badge tone="outline" className="text-[10px]">Band {Number(benchmark.band).toFixed(1)}</Badge>
                        </div>
                        <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{benchmark.tolerance_lesson || benchmark.use_when}</p>
                      </div>
                    ))}
                  </CardContent>
                ) : null}
              </Card>
  );
}
