"use client";

import { DashboardAnalytics } from "./activity-summary-dependencies";

export interface ActivitySummaryProps {
  analytics: DashboardAnalytics;
}

export interface StudyTimeCardProps extends ActivitySummaryProps {
  className?: string;
}

export function formatHours(value: number | null | undefined): string {
  const safeHours = Math.max(0, Number(value ?? 0));
  return `${safeHours === 0 ? 0 : safeHours.toFixed(1)}h`;
}

export function formatPlainHours(value: number | null | undefined): string {
  const safeHours = Math.max(0, Number(value ?? 0));
  return safeHours === 0 ? "0" : safeHours.toFixed(1);
}

export function parseWeekLabelMonth(label: string): number | null {
  const parsed = new Date(`${label} ${new Date().getFullYear()}`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.getMonth();
}

export function buildMonthlyStudyData(analytics: DashboardAnalytics) {
  const now = new Date();
  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
  const months = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (4 - index), 1);
    return {
      monthIndex: date.getMonth(),
      label: monthFormatter.format(date),
      hours: 0,
    };
  });

  analytics.weeklyActivity.forEach((point) => {
    const monthIndex = parseWeekLabelMonth(point.weekLabel);
    if (monthIndex === null) {
      return;
    }
    const month = months.find((item) => item.monthIndex === monthIndex);
    if (month) {
      month.hours += point.timeSpentMin / 60;
    }
  });

  return months.map((month) => ({
    month: month.label,
    hours: Number(month.hours.toFixed(1)),
  }));
}

export function StudyTimeTooltipCursor(props: { x?: number; y?: number; width?: number; height?: number }) {
  const { x = 0, y = 0, width: categoryWidth = 0, height = 0 } = props;
  const width = 28;

  return (
    <rect
      x={x + categoryWidth / 2 - width / 2}
      y={y}
      width={width}
      height={height}
      rx={8}
      fill="rgba(14,165,233,0.08)"
    />
  );
}

export function formatShortDate(value: string | null | undefined): string {
  if (!value) {
    return "No test yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No test yet";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}
