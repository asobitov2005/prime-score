"use client";
import type { StreakHeatmapScope } from "./controller";
import { Button, ChevronLeft, ChevronRight, Flame } from "../dependencies";

export function StreakHeatmapSection4({ scope }: { scope: StreakHeatmapScope }) {
  const { currentStreak, moveMonth, selectedMonthIndex, selectedMonthLabel, monthList } = scope;
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                      <Flame className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {currentStreak > 0 ? `${currentStreak} Day Streak` : "Build Your Streak"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Monthly activity heatmap with day-by-day consistency.
                      </p>
                    </div>
                  </div>
                </div>
    
                <div className="flex items-center gap-2 self-start rounded-2xl border border-border/50 bg-background/80 p-1.5 shadow-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                    onClick={() => moveMonth(-1)}
                    disabled={selectedMonthIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-[140px] px-1 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Activity Month
                    </p>
                    <p className="text-sm font-semibold text-foreground">{selectedMonthLabel}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                    onClick={() => moveMonth(1)}
                    disabled={selectedMonthIndex === monthList.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
  );
}
