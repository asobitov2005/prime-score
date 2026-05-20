"use client";

import { BookOpenText, Headphones, PenSquare, TrendingDown, TrendingUp } from "lucide-react";
import { getAverageBand, roundToIeltsBand, useDashboardAnalytics } from "@/components/charts/use-dashboard-analytics";
import type { DashboardAnalytics } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StudyTimeCard } from "./activity-summary";

interface DashboardAverageCardsProps {
  initialAnalytics: DashboardAnalytics;
}

function formatBand(value: number | null): string {
  return value === null ? "0.0" : value.toFixed(1);
}

function getBandLabel(band: number | null): { text: string; color: string } {
  if (band === null || band === 0) return { text: "No data", color: "text-muted-foreground" };
  if (band < 5.0) return { text: "Needs improvement", color: "text-rose-500" };
  if (band < 6.0) return { text: "Developing", color: "text-amber-500" };
  if (band < 7.0) return { text: "Good", color: "text-emerald-500" };
  if (band < 8.0) return { text: "Very good", color: "text-blue-500" };
  return { text: "Excellent", color: "text-violet-500" };
}

function getOverallBand(analytics: DashboardAnalytics): {
  overallBand: number;
  reading: number | null;
  listening: number | null;
  writing: number | null;
} {
  const reading = getAverageBand(analytics, "reading");
  const listening = getAverageBand(analytics, "listening");
  const writing = getAverageBand(analytics, "writing");
  const sectionBands = [reading, listening, writing];
  const validBands = sectionBands.filter((band): band is number => band !== null && band > 0);
  const overallBand = validBands.length > 0
    ? roundToIeltsBand(validBands.reduce((sum, band) => sum + band, 0) / validBands.length)
    : 0;

  return { overallBand, reading, listening, writing };
}

function getFiveWeekTrendPoints(analytics: DashboardAnalytics): { label: string; value: number }[] {
  const trendByDay = new Map<string, number>();

  analytics.progressSeries.forEach((point) => {
      const values = [point.reading, point.listening, point.writing]
        .filter((value): value is number => value !== null && value !== undefined && value > 0);

      if (values.length === 0) {
        return;
      }

      const dayKey = new Date(point.occurredAt).toISOString().slice(0, 10);
      trendByDay.set(dayKey, roundToIeltsBand(values.reduce((sum, value) => sum + value, 0) / values.length));
    });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let lastKnownValue = Array.from(trendByDay.values()).at(-1) ?? 0;

  return Array.from({ length: 5 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - ((4 - index) * 7));
    const dayKey = day.toISOString().slice(0, 10);
    const value = trendByDay.get(dayKey);
    if (value !== undefined) {
      lastKnownValue = value;
    }
    return {
      label: new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit" }).format(day).replace("/", "."),
      value: lastKnownValue,
    };
  });
}

function MiniBandTrendChart({ points: trendPoints }: { points: { label: string; value: number }[] }) {
  const chartPoints = trendPoints.length >= 2
    ? trendPoints
    : Array.from({ length: 5 }, (_, index) => ({ label: `${index + 1}`, value: 0 }));
  const width = 320;
  const height = 132;
  const leftPad = 48;
  const rightPad = 6;
  const topPad = 10;
  const bottomPad = 26;
  const plotWidth = width - leftPad - rightPad;
  const plotHeight = height - topPad - bottomPad;
  const yTicks = [4, 3, 2];
  const yMin = 2;
  const yMax = 4;
  const yRange = yMax - yMin;
  const getY = (value: number) => {
    const normalized = Math.max(0, Math.min((value - yMin) / yRange, 1));
    return topPad + (1 - normalized) * plotHeight;
  };
  const linePoints = chartPoints.map((point, index) => {
    const x = leftPad + (index / (chartPoints.length - 1)) * plotWidth;
    const y = getY(point.value);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const areaPoints = `${leftPad},${height - bottomPad} ${linePoints} ${width - rightPad},${height - bottomPad}`;

  return (
    <svg className="h-[132px] w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} aria-label="Seven day band trend">
      <defs>
        <linearGradient id="band-trend-area" x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="rgba(249,115,22,0.24)" />
          <stop offset="1" stopColor="rgba(249,115,22,0)" />
        </linearGradient>
      </defs>
      {yTicks.map((tick) => {
        const y = getY(tick);
        return (
          <g key={tick}>
            <line x1={leftPad} x2={width - rightPad} y1={y} y2={y} stroke="rgba(148,163,184,0.18)" strokeWidth="1" />
            <text x={0} y={y + 4} className="fill-slate-600 text-[13px] font-semibold">{tick.toFixed(1)}</text>
          </g>
        );
      })}
      <polygon points={areaPoints} fill="url(#band-trend-area)" />
      <polyline
        points={linePoints}
        fill="none"
        stroke="rgba(249,115,22,0.18)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={linePoints}
        fill="none"
        stroke="rgba(249,115,22,0.92)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {chartPoints.map((point, index) => {
        const x = leftPad + (index / (chartPoints.length - 1)) * plotWidth;
        const y = getY(point.value);
        return <circle key={`${point.label}-${index}`} cx={x} cy={y} r="3.8" fill="rgb(249,115,22)" />;
      })}
      {chartPoints.map((point, index) => {
        const x = leftPad + (index / (chartPoints.length - 1)) * plotWidth;
        return (
          <text key={point.label} x={x} y={height - 2} textAnchor="middle" className="fill-slate-600 text-[12px] font-semibold">
            {point.label}
          </text>
        );
      })}
    </svg>
  );
}

export function OverallBandKpiCard({ initialAnalytics }: DashboardAverageCardsProps) {
  const analyticsQuery = useDashboardAnalytics(initialAnalytics);
  const analytics = analyticsQuery.data ?? initialAnalytics;
  const { overallBand } = getOverallBand(analytics);
  const trendPoints = getFiveWeekTrendPoints(analytics);
  const trendDelta = trendPoints.length >= 2
    ? roundToIeltsBand(trendPoints[trendPoints.length - 1].value - trendPoints[trendPoints.length - 2].value)
    : null;
  const delta = analytics.improvementRate?.delta ?? trendDelta;
  const gaugePath = "M18 100 A52 52 0 1 1 110 100";
  const gaugeLength = 265;
  const progress = overallBand > 0 ? Math.max(0, Math.min(overallBand / 9, 1)) : 0;
  const dashOffset = gaugeLength * (1 - progress);

  return (
    <section className="relative h-full overflow-hidden rounded-[1.2rem] border border-orange-200/60 bg-white p-3 shadow-xl shadow-orange-950/8">
      <div className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-orange-200/35 blur-3xl" />
      <div className="relative">
        <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[104px_minmax(0,1fr)]">
          <div className="flex flex-col items-center">
            <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">OVERALL BAND</p>
            <div className="relative h-[108px] w-[108px]">
              <svg className="h-full w-full" viewBox="0 0 128 128" aria-hidden="true">
                <path d={gaugePath} fill="none" stroke="rgba(251,146,60,0.12)" strokeWidth="6" strokeLinecap="round" />
                <path d={gaugePath} fill="none" stroke="rgba(251,146,60,0.08)" strokeWidth="2" strokeLinecap="round" />
                <path
                  d={gaugePath}
                  fill="none"
                  stroke="rgba(251,146,60,0.22)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={gaugeLength}
                  strokeDashoffset={dashOffset}
                />
                <path
                  d={gaugePath}
                  fill="none"
                  stroke="url(#overall-band-progress)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={gaugeLength}
                  strokeDashoffset={dashOffset}
                />
                <defs>
                  <linearGradient id="overall-band-progress" x1="20" x2="96" y1="16" y2="100" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FB923C" />
                    <stop offset="0.55" stopColor="#F97316" />
                    <stop offset="1" stopColor="#F59E0B" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-3">
                <span className="text-[1.9rem] font-semibold leading-none tracking-tight text-foreground">
                  {overallBand > 0 ? overallBand.toFixed(1) : "—"}
                </span>
              </div>
            </div>

            <div className="-mt-2 text-center">
              <div className="flex items-center justify-center gap-1.5">
                {delta !== null && delta < 0 ? (
                  <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                ) : (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                )}
                <span className={cn("text-xs font-semibold", delta !== null && delta < 0 ? "text-rose-600" : "text-emerald-600")}>
                  {delta !== null ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)} pts` : "No trend yet"}
                </span>
              </div>
              <p className="mt-0 text-[11px] font-medium text-muted-foreground">since last test</p>
            </div>
          </div>

          <div className="min-w-0">
            <MiniBandTrendChart points={trendPoints} />
          </div>
        </div>
      </div>
    </section>
  );
}

const sections = [
  { key: "reading", label: "Reading", icon: BookOpenText, iconColor: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", borderColor: "border-blue-500/20" },
  { key: "listening", label: "Listening", icon: Headphones, iconColor: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
  { key: "writing", label: "Writing", icon: PenSquare, iconColor: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", borderColor: "border-violet-500/20" },
] as const;

export function DashboardAverageCards({ initialAnalytics }: DashboardAverageCardsProps) {
  const analyticsQuery = useDashboardAnalytics(initialAnalytics);
  const analytics = analyticsQuery.data ?? initialAnalytics;
  const { reading: averageReading, listening: averageListening, writing: averageWriting } = getOverallBand(analytics);

  const bandValues: Record<string, number | null> = {
    reading: averageReading,
    listening: averageListening,
    writing: averageWriting,
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2">
        {sections.map((section) => {
          const Icon = section.icon;
          const band = bandValues[section.key];

          return (
            <div
              key={section.key}
              className={cn(
                "flex h-full items-center gap-3 rounded-xl border p-2 transition-all duration-300 shadow-sm relative overflow-hidden min-h-[46px]",
                "bg-background/40 hover:bg-background/80 group",
                section.borderColor
              )}
            >
              <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm relative z-10", section.bg)}>
                <Icon className={cn("h-4 w-4", section.iconColor)} />
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between px-1 relative z-10">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 truncate">{section.label}</p>
                <p className="text-lg font-semibold tracking-tight text-foreground leading-none tabular-nums">
                  {formatBand(band)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <StudyTimeCard analytics={analytics} className="h-auto min-h-[133px]" />
    </div>
  );
}
