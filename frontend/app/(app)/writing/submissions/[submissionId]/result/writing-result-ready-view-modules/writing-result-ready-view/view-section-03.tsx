"use client";
import type { WritingResultReadyViewScope } from "./controller";
import { AlertTriangle, ArrowUpRight, Card, CardContent, CheckCircle2, ClipboardList, Clock3, FileText, Flame, ScoreGauge, Sparkles, StatTile, Trophy, cn, formatDuration, xpNumber } from "../dependencies";

export function WritingResultReadyViewSection3({ scope }: { scope: WritingResultReadyViewScope }) {
  const { overall, overallTone, result, taskBadgeLabel, errorCount, potential, delta, wordPenalty } = scope;
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.62fr)_minmax(0,1.38fr)]">
                <Card className="rounded-3xl border-border/60 bg-card/40">
                  <CardContent className="flex h-full flex-col items-center justify-center gap-2.5 px-6 py-6">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Overall band</div>
                    <ScoreGauge band={overall} />
                    <div className={cn("text-sm font-medium", overallTone.text)}>
                      Band {overall.toFixed(1)} — {overallTone.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {result.word_count} words · {taskBadgeLabel}
                    </div>
                  </CardContent>
                </Card>
        
                <Card className="rounded-3xl border-border/60 bg-card/40">
                  <CardContent className="grid h-full auto-rows-fr content-center grid-cols-2 gap-3 p-6 sm:grid-cols-3">
                    <StatTile
                      icon={FileText}
                      label="Word count"
                      value={`${result.word_count}`}
                      hint={`Target ${result.word_minimum}+`}
                      tone={result.word_count >= result.word_minimum ? "positive" : "warning"}
                    />
                    <StatTile
                      icon={Clock3}
                      label="Time spent"
                      value={formatDuration(result.time_spent_seconds)}
                    />
                    <StatTile
                      icon={ClipboardList}
                      label="Issues found"
                      value={errorCount}
                      hint={errorCount === 0 ? "Clean writing" : "See annotations"}
                      tone={errorCount === 0 ? "positive" : undefined}
                    />
                    <StatTile
                      icon={ArrowUpRight}
                      label="Potential band"
                      value={potential !== null ? potential.toFixed(1) : "—"}
                      hint={potential !== null && delta > 0 ? `+${delta.toFixed(1)} possible` : "Review suggestions"}
                      tone={potential !== null && delta > 0 ? "positive" : undefined}
                    />
                    <StatTile
                      icon={AlertTriangle}
                      label="Length penalty"
                      value={wordPenalty > 0 ? `−${wordPenalty.toFixed(1)}` : "None"}
                      tone={wordPenalty > 0 ? "warning" : "positive"}
                    />
                    <StatTile
                      icon={CheckCircle2}
                      label="Status"
                      value="Completed"
                      tone="positive"
                    />
                  </CardContent>
        
                  {/* XP Ribbon added below the StatTiles */}
                  <CardContent className="pt-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-4 py-4 shadow-sm">
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          <Sparkles className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black tracking-tight text-foreground">
                              +{(result.xp_awarded_total ?? 0).toLocaleString("en-US")}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                              XP Earned
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {(() => {
                              const breakdown = result.xp_breakdown ?? {};
                              const items = [
                                { key: "activity_xp", label: "Writing completion" },
                                { key: "score_bonus", label: "Score bonus" },
                                { key: "improvement_bonus", label: "Improvement bonus" },
                                { key: "streak_bonus", label: "Streak bonus" },
                              ]
                                .map((item) => ({ ...item, value: xpNumber(breakdown[item.key]) }))
                                .filter((item) => item.value > 0);
        
                              if (items.length > 0) {
                                return items.map((item) => (
                                  <div key={item.key} className="flex items-center gap-1 rounded-md border border-amber-500/20 bg-background/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-sm">
                                    <span>{item.label}</span>
                                    <span className="font-bold text-foreground">+{item.value}</span>
                                  </div>
                                ));
                              }
                              return (
                                <div className="flex items-center gap-1 rounded-md border border-border/40 bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                                  No eligible XP
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="flex w-full items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-3 py-2 shadow-sm sm:w-auto">
                          <Trophy className="h-4 w-4 text-amber-500" />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-none">Level</span>
                            <span className="text-sm font-bold text-foreground leading-tight mt-0.5">{result.xp_level_after ?? 1}</span>
                          </div>
                        </div>
                        <div className="flex w-full items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-3 py-2 shadow-sm sm:w-auto">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-none">Streak</span>
                            <span className="text-sm font-bold text-foreground leading-tight mt-0.5">{result.xp_current_streak ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
  );
}
