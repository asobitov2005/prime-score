import { getDateKeyInTimeZone, roundToIeltsBand } from "@/lib/dashboard-metrics";
import { APP_TIME_ZONE } from "@/lib/date-time";
import type { DashboardAnalytics } from "@/lib/types";

export type DashboardTrendSkill = "overall" | "reading" | "listening" | "writing" | "speaking";

export interface DashboardTrendPoint {
  label: string;
  shortLabel: string;
  dateLabel: string;
  value: number | null;
}

function toAppDayKey(date: Date) {
  return getDateKeyInTimeZone(date, APP_TIME_ZONE);
}

function buildLastDays(count: number): Date[] {
  const todayKey = toAppDayKey(new Date());
  const today = new Date(`${todayKey}T00:00:00Z`);

  return Array.from({ length: count }, (_, index) => {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - (count - 1 - index));
    return day;
  });
}

function formatAxisLabel(day: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", timeZone: "UTC" }).format(day).replace("/", ".");
}

function formatCompactAxisLabel(day: Date): string {
  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(day).slice(0, 3);
  return `${month} ${day.getUTCDate()}`;
}

function formatTooltipDate(day: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }).format(day);
}

function getSkillValueForPoint(
  point: DashboardAnalytics["progressSeries"][number],
  skill: DashboardTrendSkill,
): number | null {
  if (skill === "overall") {
    const values = [point.reading, point.listening, point.writing, point.speaking]
      .filter((value): value is number => value !== null && value !== undefined && value > 0);

    if (values.length === 0) {
      return null;
    }

    return roundToIeltsBand(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  const value = point[skill];
  if (value === null || value === undefined || value <= 0) {
    return null;
  }

  return roundToIeltsBand(value);
}

export function getDayTrendPoints(
  analytics: DashboardAnalytics,
  skill: DashboardTrendSkill,
  dayCount = 7,
): DashboardTrendPoint[] {
  const trendByDay = new Map<string, number>();

  analytics.progressSeries.forEach((point) => {
    const occurredAt = new Date(point.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      return;
    }

    const value = getSkillValueForPoint(point, skill);
    if (value === null) {
      return;
    }

    trendByDay.set(toAppDayKey(occurredAt), value);
  });

  return buildLastDays(dayCount).map((day) => {
    const dayKey = toAppDayKey(day);
    return {
      label: formatAxisLabel(day),
      shortLabel: formatCompactAxisLabel(day),
      dateLabel: formatTooltipDate(day),
      value: trendByDay.get(dayKey) ?? null,
    };
  });
}

export function getSevenDayTrendPoints(
  analytics: DashboardAnalytics,
  skill: DashboardTrendSkill,
): DashboardTrendPoint[] {
  return getDayTrendPoints(analytics, skill, 7);
}

export function formatTrendBandValue(value: number | null): string {
  return value === null ? "No score" : value.toFixed(1);
}
