import { roundToIeltsBand } from "@/components/charts/use-dashboard-analytics";
import type { DashboardAnalytics } from "@/lib/types";

export type DashboardTrendSkill = "overall" | "reading" | "listening" | "writing" | "speaking";

export interface DashboardTrendPoint {
  label: string;
  shortLabel: string;
  dateLabel: string;
  value: number | null;
}

function toLocalDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildLastDays(count: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (count - 1 - index));
    return day;
  });
}

function formatAxisLabel(day: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit" }).format(day).replace("/", ".");
}

function formatCompactAxisLabel(day: Date): string {
  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(day).slice(0, 3);
  return `${month} ${day.getDate()}`;
}

function formatTooltipDate(day: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(day);
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

    trendByDay.set(toLocalDayKey(occurredAt), value);
  });

  return buildLastDays(dayCount).map((day) => {
    const dayKey = toLocalDayKey(day);
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

export function trendPointToChartValue(value: number | null): number {
  return value ?? 0;
}

export function formatTrendBandValue(value: number | null): string {
  return (value ?? 0).toFixed(1);
}
