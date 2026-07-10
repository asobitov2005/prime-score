"use client";
import type { StreakHeatmapScope } from "./controller";
import { Button, Card, CardContent, ChevronLeft, ChevronRight, Clock, Flame, Target, TrendingDown, TrendingUp, cn } from "../dependencies";
import { WEEKDAYS, formatMinutes, formatSelectedDay, formatTimeDelta, getCellTone } from "../shared";
import { StreakHeatmapSection2 } from "./view-section-07";

export function StreakHeatmapView1({ scope }: { scope: StreakHeatmapScope }) {
  const { currentStreak, moveMonth, selectedMonthIndex, selectedMonthLabel, monthList, monthCells, effectiveSelectedDayKey, setSelectedDayKey, selectedCell, activeDays, prevActiveDays, totalAttempts, prevTotalAttempts, totalTimeSpentSec, prevTotalTimeSpentSec, longestStreak } = scope;
  return (
    (
        <Card className="border-border/40 shadow-sm rounded-2xl bg-card/60 overflow-hidden">
          <StreakHeatmapSection2 scope={scope} />
        </Card>
      )
  );
}
