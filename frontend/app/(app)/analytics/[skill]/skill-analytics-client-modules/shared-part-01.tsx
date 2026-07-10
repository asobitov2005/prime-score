"use client";

import { DashboardAnalytics, Info, cn, roundIeltsBand } from "./dependencies";



export type Skill = "reading" | "listening" | "writing" | "speaking";

export type IconComponent = React.ComponentType<{ className?: string }>;

export type WritingTaskTab = "task1" | "task2";

export type WritingPromptRow = {
  promptType: string;
  band: string;
  attempts: string;
  issue: string;
  status: "Good" | "Needs practice" | "Limited data" | "Not practiced";
};

export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("rounded-[18px] border border-[#E5E7EB] bg-white shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)]", className)} {...props}>
      {children}
    </section>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-[17px] font-semibold tracking-tight text-[#0F172A]">{children}</h2>
      <Info className="h-4 w-4 text-slate-300" />
    </div>
  );
}

export function AccuracyBar({
  value,
  color = "bg-emerald-500",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
    </div>
  );
}

export function progressColor(tone: string) {
  if (tone === "green") return "bg-emerald-500";
  if (tone === "blue") return "bg-blue-500";
  if (tone === "orange") return "bg-orange-500";
  return "bg-red-500";
}

export function writingStatusClassName(status: WritingPromptRow["status"]) {
  if (status === "Good") return "bg-emerald-50 text-emerald-700";
  if (status === "Needs practice") return "bg-orange-50 text-orange-700";
  if (status === "Limited data") return "bg-slate-100 text-slate-600";
  return "bg-slate-50 text-slate-500";
}

export function formatSeconds(totalSeconds: number | null | undefined) {
  if (totalSeconds === null || totalSeconds === undefined) return "No data";
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function roundWholeBand(value: number | string | null | undefined) {
  const rounded = roundIeltsBand(value);
  return rounded === null ? null : Math.min(9, Math.max(0, Math.round(rounded)));
}

export function formatBand(value: number | string | null | undefined, fallback = "—") {
  const rounded = roundWholeBand(value);
  return rounded === null ? fallback : String(rounded);
}

export function formatPercent(value: number | null | undefined, fallback = "—") {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}%` : fallback;
}

export function formatWholeBandDelta(value: number | string | null | undefined, fallback = "No previous data") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const rounded = Math.round(numeric);
  return `${rounded >= 0 ? "+" : ""}${rounded}`;
}

export function bandToRoundedPercent(value: number | string | null | undefined) {
  const band = roundWholeBand(value);
  return band === null ? null : Math.round((band / 9) * 100);
}

export function formatTrendValue(value: unknown, name: unknown): [string, string] {
  const label = String(name);
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return ["—", label];
  }

  if (label.includes("%") || label.includes("Accuracy")) {
    return [formatPercent(numeric), label];
  }

  return [formatBand(numeric), label];
}

export function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function toLocalDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTrendDayLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function buildNineDayPerformanceTrend(accuracyTrend: DashboardAnalytics["accuracyTrend"]) {
  const pointsByDay = new Map<string, DashboardAnalytics["accuracyTrend"]>();

  accuracyTrend.forEach((point) => {
    const date = new Date(point.date);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const dayKey = toLocalDayKey(date);
    pointsByDay.set(dayKey, [...(pointsByDay.get(dayKey) ?? []), point]);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 9 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (8 - index));
    const dayPoints = pointsByDay.get(toLocalDayKey(day)) ?? [];
    const band = roundWholeBand(average(dayPoints.map((point) => point.band).filter((value): value is number => typeof value === "number")));
    const accuracy = average(dayPoints.map((point) => point.accuracy).filter((value): value is number => typeof value === "number"));

    return {
      date: formatTrendDayLabel(day),
      band: band ?? 0,
      accuracy: accuracy === null ? 0 : Math.round(accuracy),
    };
  });
}

export function buildSevenDayBandTrend(
  progressSeries: DashboardAnalytics["progressSeries"],
  skillKey: "reading" | "listening" | "writing" | "speaking",
) {
  const valuesByDay = new Map<string, number[]>();

  progressSeries.forEach((point) => {
    const occurredAt = new Date(point.occurredAt);
    const value = point[skillKey];
    if (Number.isNaN(occurredAt.getTime()) || typeof value !== "number") {
      return;
    }

    const dayKey = toLocalDayKey(occurredAt);
    valuesByDay.set(dayKey, [...(valuesByDay.get(dayKey) ?? []), value]);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));
    const values = valuesByDay.get(toLocalDayKey(day)) ?? [];

    return {
      date: formatTrendDayLabel(day),
      score: roundWholeBand(average(values)) ?? 0,
    };
  });
}
