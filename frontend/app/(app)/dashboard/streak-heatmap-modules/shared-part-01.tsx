"use client";

import { APP_TIME_ZONE, DashboardActivityPoint } from "./dependencies";



export interface StreakHeatmapProps {
  activity: DashboardActivityPoint[];
  currentStreak: number;
  longestStreak: number;
}

export interface HeatmapCell {
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

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

export function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatMonthKey(date: Date): string {
  return formatDateKey(date).slice(0, 7);
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

export function getTodayKey(): string {
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

export function formatMonthLabel(monthDate: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(monthDate);
}

export function formatSelectedDay(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatMinutes(totalSeconds: number): string {
  const totalMinutes = Math.max(0, Math.round(totalSeconds / 60));
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${totalMinutes}m`;
}

export function formatTimeDelta(sec: number): string {
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

export function getCellTone(attemptsCount: number, isFuture: boolean): string {
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

export function buildMonthCells(
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

export function getDefaultSelectedDayKey(cells: HeatmapCell[]): string {
  const activeMonthCells = cells.filter((cell) => cell.inMonth && cell.attemptsCount > 0);
  if (activeMonthCells.length > 0) {
    return activeMonthCells[activeMonthCells.length - 1].key;
  }

  return cells.find((cell) => cell.inMonth)?.key ?? cells[0]?.key ?? getTodayKey();
}
