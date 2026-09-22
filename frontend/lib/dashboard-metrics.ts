import type { DashboardActivityPoint, DashboardAnalytics, TestType } from "@/lib/types";

export interface StudyTimeSummary {
  totalHours: number;
  thisWeekHours: number;
  thisWeekDaysElapsed: number;
  previousWeekHours: number;
  thisMonthHours: number;
  previousMonthHours: number;
  monthlyData: Array<{ month: string; hours: number }>;
}

export function getDateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function roundToIeltsBand(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 9) return 9;

  const whole = Math.floor(value);
  const fraction = value - whole;
  if (fraction < 0.25) return whole;
  if (fraction < 0.75) return whole + 0.5;
  return Math.min(9, whole + 1);
}

export function getAverageBand(analytics: DashboardAnalytics, type: TestType): number | null {
  const values = analytics.progressSeries
    .map((point) => point[type])
    .filter((value): value is number => value !== null && value !== undefined && value > 0);
  if (values.length === 0) return null;
  return roundToIeltsBand(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function shiftDateKey(dateKey: string, amount: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

function monthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

function sumBetween(
  secondsByDate: Map<string, number>,
  startDate: string,
  endDate: string,
): number {
  let seconds = 0;
  for (const [date, value] of secondsByDate) {
    if (date >= startDate && date <= endDate) seconds += value;
  }
  return seconds / 3600;
}

export function summarizeStudyTime(
  activity: Pick<DashboardActivityPoint, "activityDate" | "timeSpentSec">[],
  now: Date,
  timeZone: string,
): StudyTimeSummary {
  const secondsByDate = new Map<string, number>();
  for (const point of activity) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(point.activityDate)) continue;
    secondsByDate.set(
      point.activityDate,
      (secondsByDate.get(point.activityDate) ?? 0) + Math.max(0, point.timeSpentSec),
    );
  }

  const today = getDateKeyInTimeZone(now, timeZone);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const thisWeekDaysElapsed = ((weekday + 6) % 7) + 1;
  const thisWeekStart = shiftDateKey(today, -((weekday + 6) % 7));
  const previousWeekEnd = shiftDateKey(thisWeekStart, -1);
  const previousWeekStart = shiftDateKey(previousWeekEnd, -6);
  const thisMonthStart = `${today.slice(0, 7)}-01`;
  const previousMonthEnd = shiftDateKey(thisMonthStart, -1);
  const previousMonthStart = `${monthKey(previousMonthEnd)}-01`;

  const monthFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const monthlyData = Array.from({ length: 5 }, (_, index) => {
    const monthDate = new Date(`${thisMonthStart}T00:00:00Z`);
    monthDate.setUTCMonth(monthDate.getUTCMonth() - (4 - index));
    const key = monthDate.toISOString().slice(0, 7);
    const nextMonth = new Date(monthDate);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    const lastDay = shiftDateKey(nextMonth.toISOString().slice(0, 10), -1);
    return {
      month: monthFormatter.format(monthDate),
      hours: Number(sumBetween(secondsByDate, `${key}-01`, lastDay).toFixed(1)),
    };
  });

  return {
    totalHours: [...secondsByDate.values()].reduce((total, seconds) => total + seconds, 0) / 3600,
    thisWeekHours: sumBetween(secondsByDate, thisWeekStart, today),
    thisWeekDaysElapsed,
    previousWeekHours: sumBetween(secondsByDate, previousWeekStart, previousWeekEnd),
    thisMonthHours: sumBetween(secondsByDate, thisMonthStart, today),
    previousMonthHours: sumBetween(secondsByDate, previousMonthStart, previousMonthEnd),
    monthlyData,
  };
}

export function getAverageSkillBand(values: Array<number | null | undefined>): number | null {
  const scores = values.filter((value): value is number => value !== null && value !== undefined && value > 0);
  return scores.length > 0 ? scores.reduce((total, score) => total + score, 0) / scores.length : null;
}
