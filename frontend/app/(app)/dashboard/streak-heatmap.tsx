"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Flame, Target, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_TIME_ZONE } from "@/lib/date-time";
import type { DashboardActivityPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StreakHeatmapProps {
  activity: DashboardActivityPoint[];
  currentStreak: number;
  longestStreak: number;
}

interface HeatmapCell {
  key: string;
  date: Date;
  inMonth: boolean;
  isFuture: boolean;
  isToday: boolean;
  attemptsCount: number;
  timeSpentSec: number;
  readingTimeSec: number;
  listeningTimeSec: number;
  writingTimeSec: number;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatMonthKey(date: Date): string {
  return formatDateKey(date).slice(0, 7);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

function getTodayKey(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: APP_TIME_ZONE,
  }).formatToParts(new Date());

  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${lookup("year")}-${lookup("month")}-${lookup("day")}`;
}

function formatMonthLabel(monthDate: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(monthDate);
}

function formatSelectedDay(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

function formatMinutes(totalSeconds: number): string {
  const totalMinutes = Math.max(0, Math.round(totalSeconds / 60));
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${totalMinutes}m`;
}

function formatTimeDelta(sec: number): string {
  if (sec === 0) return "0m";
  const sign = sec > 0 ? "+" : "-";
  const absSec = Math.abs(sec);
  const m = Math.round(absSec / 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${sign}${h}h${min > 0 ? ` ${min}m` : ""}`;
  }
  return `${sign}${m}m`;
}

function getCellTone(attemptsCount: number, isFuture: boolean): string {
  if (isFuture) {
    return "bg-muted/5 text-muted-foreground/30 border-transparent";
  }
  if (attemptsCount >= 5) {
    return "bg-emerald-300 dark:bg-emerald-500/60 text-emerald-900 dark:text-emerald-50 border-emerald-400/30 shadow-sm";
  }
  if (attemptsCount >= 3) {
    return "bg-emerald-200 dark:bg-emerald-500/40 text-emerald-800 dark:text-emerald-100 border-emerald-300/30 shadow-sm";
  }
  if (attemptsCount >= 2) {
    return "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border-emerald-200/30";
  }
  if (attemptsCount >= 1) {
    return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-100/30";
  }
  return "bg-muted/20 text-muted-foreground/40 border-border/30 hover:bg-muted/40 transition-colors";
}

function buildMonthCells(
  monthDate: Date,
  activityByDate: Map<string, DashboardActivityPoint>,
  todayKey: string
): HeatmapCell[] {
  const year = monthDate.getUTCFullYear();
  const monthIndex = monthDate.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 0));
  const monthKey = formatMonthKey(monthStart);
  const leadingDays = (monthStart.getUTCDay() + 6) % 7;
  const totalDays = monthEnd.getUTCDate();
  const totalCells = Math.ceil((leadingDays + totalDays) / 7) * 7;
  const gridStart = new Date(Date.UTC(year, monthIndex, 1 - leadingDays));
  const cells: HeatmapCell[] = [];

  for (let index = 0; index < totalCells; index += 1) {
    const cellDate = new Date(Date.UTC(
      gridStart.getUTCFullYear(),
      gridStart.getUTCMonth(),
      gridStart.getUTCDate() + index
    ));
    const key = formatDateKey(cellDate);
    const point = activityByDate.get(key);
    const cellMonthKey = key.slice(0, 7);

    cells.push({
      key,
      date: cellDate,
      inMonth: cellMonthKey === monthKey,
      isFuture: cellMonthKey === todayKey.slice(0, 7) && key > todayKey,
      isToday: key === todayKey,
      attemptsCount: point?.attemptsCount ?? 0,
      timeSpentSec: point?.timeSpentSec ?? 0,
      readingTimeSec: point?.readingTimeSec ?? 0,
      listeningTimeSec: point?.listeningTimeSec ?? 0,
      writingTimeSec: point?.writingTimeSec ?? 0,
    });
  }

  return cells;
}

function getDefaultSelectedDayKey(cells: HeatmapCell[]): string {
  const activeMonthCells = cells.filter((cell) => cell.inMonth && cell.attemptsCount > 0);
  if (activeMonthCells.length > 0) {
    return activeMonthCells[activeMonthCells.length - 1].key;
  }

  return cells.find((cell) => cell.inMonth)?.key ?? cells[0]?.key ?? getTodayKey();
}

export function StreakHeatmap({ activity, currentStreak, longestStreak }: StreakHeatmapProps) {
  const todayKey = useMemo(() => getTodayKey(), []);
  const todayMonthKey = todayKey.slice(0, 7);

  const activityByDate = useMemo(() => {
    const map = new Map<string, DashboardActivityPoint>();
    for (const point of activity) {
      map.set(point.activityDate, point);
    }
    return map;
  }, [activity]);

  const monthList = useMemo(() => {
    const earliestMonthKey = activity.length > 0
      ? activity.map((point) => point.activityDate.slice(0, 7)).sort()[0]
      : todayMonthKey;
    const startMonth = parseMonthKey(earliestMonthKey);
    const endMonth = parseMonthKey(todayMonthKey);
    const months: Date[] = [];

    for (let cursor = startMonth; cursor <= endMonth; cursor = addMonths(cursor, 1)) {
      months.push(cursor);
    }

    return months;
  }, [activity, todayMonthKey]);

  const initialMonthIndex = useMemo(() => {
    const latestActivityMonthKey = activity.length > 0
      ? activity.map((point) => point.activityDate.slice(0, 7)).sort().at(-1) ?? todayMonthKey
      : todayMonthKey;
    const index = monthList.findIndex((month) => formatMonthKey(month) === latestActivityMonthKey);
    return index >= 0 ? index : monthList.length - 1;
  }, [activity, monthList, todayMonthKey]);

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(initialMonthIndex);

  const selectedMonth = monthList[selectedMonthIndex] ?? parseMonthKey(todayMonthKey);
  const monthCells = useMemo(
    () => buildMonthCells(selectedMonth, activityByDate, todayKey),
    [activityByDate, selectedMonth, todayKey],
  );

  const [selectedDayKey, setSelectedDayKey] = useState(getDefaultSelectedDayKey(monthCells));

  const activeDays = monthCells.filter((cell) => cell.inMonth && cell.attemptsCount > 0).length;
  const totalAttempts = monthCells
    .filter((cell) => cell.inMonth)
    .reduce((sum, cell) => sum + cell.attemptsCount, 0);
  const totalTimeSpentSec = monthCells
    .filter((cell) => cell.inMonth)
    .reduce((sum, cell) => sum + cell.timeSpentSec, 0);
  const defaultSelectedDayKey = getDefaultSelectedDayKey(monthCells);
  const effectiveSelectedDayKey = monthCells.some((cell) => cell.key === selectedDayKey)
    ? selectedDayKey
    : defaultSelectedDayKey;
  const selectedCell = monthCells.find((cell) => cell.key === effectiveSelectedDayKey) ?? monthCells[0];
  const selectedMonthLabel = formatMonthLabel(selectedMonth);

  const prevMonthKey = useMemo(() => formatMonthKey(addMonths(selectedMonth, -1)), [selectedMonth]);
  const prevActiveDays = useMemo(() => activity.filter(a => a.activityDate.startsWith(prevMonthKey) && a.attemptsCount > 0).length, [activity, prevMonthKey]);
  const prevTotalAttempts = useMemo(() => activity.filter(a => a.activityDate.startsWith(prevMonthKey)).reduce((sum, a) => sum + a.attemptsCount, 0), [activity, prevMonthKey]);
  const prevTotalTimeSpentSec = useMemo(() => activity.filter(a => a.activityDate.startsWith(prevMonthKey)).reduce((sum, a) => sum + a.timeSpentSec, 0), [activity, prevMonthKey]);

  function moveMonth(delta: number) {
    const nextIndex = Math.min(Math.max(selectedMonthIndex + delta, 0), monthList.length - 1);
    if (nextIndex === selectedMonthIndex) {
      return;
    }

    const nextMonth = monthList[nextIndex];
    const nextCells = buildMonthCells(nextMonth, activityByDate, todayKey);
    setSelectedMonthIndex(nextIndex);
    setSelectedDayKey(getDefaultSelectedDayKey(nextCells));
  }

  return (
    <Card className="border-border/40 shadow-sm rounded-2xl bg-card/60 overflow-hidden">
      <CardContent className="p-5">
        <div className="space-y-4">
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

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="min-h-[292px] rounded-3xl border border-border/70 bg-card/50 p-5 shadow-sm ring-1 ring-border/25 w-fit mx-auto lg:mx-0 transition-colors hover:bg-card/60 shrink-0">
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-7 gap-2 text-center mb-1">
                  {WEEKDAYS.map((day) => (
                    <span key={day} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {day.slice(0, 2)}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {monthCells.map((cell) => {
                    const isSelected = cell.key === effectiveSelectedDayKey;
                    const toneClass = getCellTone(cell.attemptsCount, cell.isFuture);

                    return (
                      <button
                        key={cell.key}
                        type="button"
                        disabled={!cell.inMonth}
                        onClick={() => setSelectedDayKey(cell.key)}
                        aria-label={`${formatSelectedDay(cell.date)} · ${cell.attemptsCount} attempt${cell.attemptsCount === 1 ? "" : "s"} · ${formatMinutes(cell.timeSpentSec)}`}
                        title={`${formatSelectedDay(cell.date)} · ${cell.attemptsCount} attempt${cell.attemptsCount === 1 ? "" : "s"} · ${formatMinutes(cell.timeSpentSec)}`}
                        className={cn(
                          "group relative flex h-[28px] w-[40px] sm:h-[30px] sm:w-[46px] rounded-[8px] sm:rounded-[10px] border text-left transition-colors duration-150 disabled:pointer-events-none overflow-hidden",
                          cell.inMonth ? "opacity-100" : "opacity-0 invisible",
                          toneClass,
                          isSelected && "ring-2 ring-offset-[1.5px] ring-emerald-500/60 ring-offset-background shadow-sm z-20",
                          cell.isToday && !isSelected && "ring-1 ring-orange-500/60 ring-offset-1 ring-offset-background",
                          !isSelected && !cell.isFuture && cell.inMonth && cell.attemptsCount === 0 && "hover:bg-muted/50 border-border/60",
                          !isSelected && !cell.isFuture && cell.attemptsCount > 0 && "hover:shadow-sm hover:z-20"
                        )}
                      >
                        {isSelected ? (
                          <div className="absolute inset-0 bg-white/20 dark:bg-white/10" />
                        ) : null}
                        <span className="flex h-full w-full items-center justify-center relative z-10">
                          <span className={cn(
                            "text-[11px] sm:text-xs font-bold tracking-tight",
                            cell.attemptsCount > 0 && cell.inMonth ? "text-current drop-shadow-sm" : "text-inherit",
                          )}>
                            {cell.date.getUTCDate()}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground font-semibold mt-2 pt-2 border-t border-border/40">
                  <span>Less</span>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 5].map((count) => (
                      <span
                        key={count}
                        className={cn("h-3 w-3 rounded-[4px] border", getCellTone(count, false))}
                      />
                    ))}
                  </div>
                  <span>More</span>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full flex flex-col gap-4">
              <div className="rounded-[1.35rem] border border-border/70 bg-muted/20 p-4 shadow-sm ring-1 ring-border/20">
                <div className="space-y-1 mb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <p className="text-xl font-bold text-foreground tracking-tight">
                      {selectedCell ? formatSelectedDay(selectedCell.date) : selectedMonthLabel}
                    </p>

                    {selectedCell && selectedCell.attemptsCount > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border/60 shadow-sm text-xs font-semibold">
                          <Target className="h-3.5 w-3.5 text-orange-500" />
                          <span>{selectedCell.attemptsCount} <span className="text-muted-foreground font-medium">attempt{selectedCell.attemptsCount === 1 ? "" : "s"}</span></span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border/60 shadow-sm text-xs font-semibold">
                          <Clock className="h-3.5 w-3.5 text-blue-500" />
                          <span>{formatMinutes(selectedCell.timeSpentSec)} <span className="text-muted-foreground font-medium">studied</span></span>
                        </div>
                      </div>
                    )}
                  </div>
                  {!selectedCell || selectedCell.attemptsCount === 0 ? (
                    <p className="text-sm text-muted-foreground font-medium pt-2 pb-1">
                      No recorded activity for this day.
                    </p>
                  ) : null}
                </div>

                {selectedCell && selectedCell.timeSpentSec > 0 && (
                  <div className="pt-3 border-t border-border/40 space-y-2.5">
                    <div className={cn("space-y-1.5 transition-opacity", selectedCell.readingTimeSec === 0 && "opacity-40 grayscale-[0.5]")}>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[3px] bg-blue-500 shadow-sm" /> Reading</span>
                        <span className="text-foreground">{formatMinutes(selectedCell.readingTimeSec)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-background rounded-full overflow-hidden border border-border/50 shadow-inner">
                        <div className="h-full bg-blue-500 rounded-full transition-[width] duration-200" style={{ width: `${selectedCell.timeSpentSec > 0 ? (selectedCell.readingTimeSec / selectedCell.timeSpentSec) * 100 : 0}%` }} />
                      </div>
                    </div>

                    <div className={cn("space-y-1.5 transition-opacity", selectedCell.listeningTimeSec === 0 && "opacity-40 grayscale-[0.5]")}>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[3px] bg-emerald-500 shadow-sm" /> Listening</span>
                        <span className="text-foreground">{formatMinutes(selectedCell.listeningTimeSec)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-background rounded-full overflow-hidden border border-border/50 shadow-inner">
                        <div className="h-full bg-emerald-500 rounded-full transition-[width] duration-200" style={{ width: `${selectedCell.timeSpentSec > 0 ? (selectedCell.listeningTimeSec / selectedCell.timeSpentSec) * 100 : 0}%` }} />
                      </div>
                    </div>

                    <div className={cn("space-y-1.5 transition-opacity", selectedCell.writingTimeSec === 0 && "opacity-40 grayscale-[0.5]")}>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[3px] bg-violet-500 shadow-sm" /> Writing</span>
                        <span className="text-foreground">{formatMinutes(selectedCell.writingTimeSec)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-background rounded-full overflow-hidden border border-border/50 shadow-inner">
                        <div className="h-full bg-violet-500 rounded-full transition-[width] duration-200" style={{ width: `${selectedCell.timeSpentSec > 0 ? (selectedCell.writingTimeSec / selectedCell.timeSpentSec) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                {[
                  {
                    label: "Active days",
                    value: activeDays,
                    delta: activeDays - prevActiveDays,
                    deltaText: `${activeDays - prevActiveDays > 0 ? '+' : ''}${activeDays - prevActiveDays}d`,
                    hideDelta: false
                  },
                  {
                    label: "Attempts",
                    value: totalAttempts,
                    delta: totalAttempts - prevTotalAttempts,
                    deltaText: `${totalAttempts - prevTotalAttempts > 0 ? '+' : ''}${totalAttempts - prevTotalAttempts}`,
                    hideDelta: false
                  },
                  {
                    label: "Study time",
                    value: formatMinutes(totalTimeSpentSec),
                    delta: totalTimeSpentSec - prevTotalTimeSpentSec,
                    deltaText: formatTimeDelta(totalTimeSpentSec - prevTotalTimeSpentSec),
                    hideDelta: false
                  },
                  {
                    label: "Best streak",
                    value: `${longestStreak}d`,
                    delta: 0,
                    deltaText: "",
                    hideDelta: true
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1rem] border border-border/50 bg-background/80 px-2 py-3 shadow-sm flex flex-col items-center text-center justify-center relative">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      {item.label}
                    </p>
                    <p className="text-xl font-semibold text-foreground tracking-tight leading-none mb-2.5">{item.value}</p>
                    
                    {!item.hideDelta ? (
                      item.delta !== 0 ? (
                        <div className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] text-[9px] font-bold border",
                          item.delta > 0 
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        )}>
                          {item.delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {item.deltaText}
                        </div>
                      ) : (
                        <span className="text-[9px] font-bold text-muted-foreground/40 px-1.5 py-0.5 inline-flex h-[22px] items-center">No change</span>
                      )
                    ) : (
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] text-[9px] font-bold border border-primary/20 bg-primary/5 text-primary">
                        <Flame className="w-3 h-3" />
                        Personal Best
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
