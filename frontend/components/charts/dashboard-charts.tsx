"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, DatabaseZap, Lock, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DashboardAnalytics, TestType } from "@/lib/types";
import { useDashboardAnalytics } from "@/components/charts/use-dashboard-analytics";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

interface DashboardChartsProps {
  analytics: DashboardAnalytics;
}

const EMPTY_ANALYTICS: DashboardAnalytics = {
  performanceSummary: {
    studyTime: { totalTimeSec: 0, readingTimeSec: 0, listeningTimeSec: 0 },
    reading: { fullCount: 0, section1Count: 0, section2Count: 0, section3Count: 0, section4Count: 0 },
    listening: { fullCount: 0, section1Count: 0, section2Count: 0, section3Count: 0, section4Count: 0 }
  },
  questionTypeAnalysis: [],
  comparison: {
    previousTestTitle: null,
    previousTestDate: null,
    currentTestTitle: null,
    currentTestDate: null,
    tests: [],
    items: []
  },
  errorDistribution: [],
  progressSeries: []
};

const READING_LABELS = [
  "Multiple Choice (Single)",
  "Multiple Choice (Multiple)",
  "True / False / Not Given",
  "Yes / No / Not Given",
  "Matching Information",
  "Matching Headings",
  "Matching Features",
  "Matching Sentence Endings",
  "Sentence Completion",
  "Summary Completion (Word Bank)",
  "Summary Completion (Free Text)",
  "Note Completion",
  "Table Completion",
  "Flow-chart Completion",
  "Diagram Labeling",
  "Short Answer"
];

const LISTENING_LABELS = [
  "Multiple Choice (Single)",
  "Multiple Choice (Multiple)",
  "Matching",
  "Plan / Map Labeling",
  "Form Completion",
  "Note Completion",
  "Table Completion",
  "Flow-chart Completion",
  "Summary Completion",
  "Sentence Completion",
  "Short Answer"
];

function toLocalDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDailyProgressSeries(progressSeries: DashboardAnalytics["progressSeries"]) {
  if (progressSeries.length === 0) {
    return [];
  }

  const sorted = [...progressSeries].sort(
    (left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime()
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - 9);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);

  const byDate = new Map<string, { reading: number | null; listening: number | null }>();
  for (const point of sorted) {
    const key = toLocalDateKey(new Date(point.occurredAt));
    byDate.set(key, {
      reading: point.reading,
      listening: point.listening
    });
  }

  const items: DashboardAnalytics["progressSeries"] = [];
  let lastReading: number | null = null;
  let lastListening: number | null = null;

  for (const point of sorted) {
    const pointDate = new Date(point.occurredAt);
    pointDate.setHours(0, 0, 0, 0);
    if (pointDate < start) {
      if (point.reading !== null && point.reading !== undefined) {
        lastReading = point.reading;
      }
      if (point.listening !== null && point.listening !== undefined) {
        lastListening = point.listening;
      }
    }
  }

  for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    const key = toLocalDateKey(current);
    const entry = byDate.get(key);
    if (entry?.reading !== null && entry?.reading !== undefined) {
      lastReading = entry.reading;
    }
    if (entry?.listening !== null && entry?.listening !== undefined) {
      lastListening = entry.listening;
    }
    items.push({
      label: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(current)),
      occurredAt: `${key}T00:00:00`,
      reading: lastReading,
      listening: lastListening
    });
  }

  return items;
}

function formatAttemptDate(value: string | null): string {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function formatHeatmapValue(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${Math.round(value)}%`;
}

function getHeatmapCellClass(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "border-border/50 bg-background text-muted-foreground/60";
  }
  if (value >= 70) {
    return "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  }
  if (value >= 50) {
    return "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400";
  }
  return "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400";
}

function formatStudyTime(totalSeconds: number): string {
  const normalizedSeconds = Math.max(0, totalSeconds);
  const totalMinutes = Math.floor(normalizedSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

function isAnalyticsEmpty(analytics: DashboardAnalytics): boolean {
  return (
    analytics.progressSeries.length === 0
    && analytics.errorDistribution.length === 0
    && analytics.comparison.items.length === 0
    && analytics.questionTypeAnalysis.every((item) => item.workedCount === 0)
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 text-center text-sm font-medium text-muted-foreground">
      {message}
    </div>
  );
}

function ProgressDateTick(props: {
  x?: number;
  y?: number;
  payload?: { value: string };
  index?: number;
  visibleTicksCount?: number;
}) {
  const x = props.x ?? 0;
  const y = props.y ?? 0;
  const value = props.payload?.value ?? "";
  const index = props.index ?? 0;
  const lastIndex = Math.max(0, (props.visibleTicksCount ?? 1) - 1);
  const [day, month] = value.split(" ");
  const textAnchor = index === 0 ? "start" : index === lastIndex ? "end" : "middle";

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor={textAnchor} fill="currentColor" className="fill-foreground text-[11px] font-black">
        <tspan x={0} dy="0">{day}</tspan>
        <tspan dx="4" className="fill-muted-foreground text-[10px] font-semibold uppercase tracking-[0.12em]">
          {month}
        </tspan>
      </text>
    </g>
  );
}

function SectionFilter({
  value,
  onChange
}: {
  value: TestType;
  onChange: (value: TestType) => void;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      {(["reading", "listening"] as TestType[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] transition-colors",
            value === option
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/70 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function buildLastTenDayAverage(analytics: DashboardAnalytics) {
  if (analytics.progressSeries.length === 0) {
    return { reading: null as number | null, listening: null as number | null };
  }

  const timestamps = analytics.progressSeries.map((item) => new Date(item.occurredAt).getTime());
  const latest = Math.max(...timestamps);
  const cutoff = latest - (9 * 24 * 60 * 60 * 1000);
  const recent = analytics.progressSeries.filter((item) => new Date(item.occurredAt).getTime() >= cutoff);
  const readingValues = recent.map((item) => item.reading).filter((value): value is number => value !== null);
  const listeningValues = recent.map((item) => item.listening).filter((value): value is number => value !== null);

  return {
    reading: readingValues.length > 0
      ? Number((readingValues.reduce((sum, value) => sum + value, 0) / readingValues.length).toFixed(1))
      : null,
    listening: listeningValues.length > 0
      ? Number((listeningValues.reduce((sum, value) => sum + value, 0) / listeningValues.length).toFixed(1))
      : null
  };
}

function buildSampleAnalytics(filter: TestType | "all"): DashboardAnalytics {
  const labels = filter === "reading" ? READING_LABELS : filter === "listening" ? LISTENING_LABELS : [];
  const questionTypeAnalysis = labels.map((label, index) => {
    const workedCount = Math.max(6, 18 - (index % 5) * 2);
    const accuracy = Math.max(42, Math.min(88, 58 + ((index * 7) % 26)));
    const correctCount = Math.round((workedCount * accuracy) / 100);
    return {
      label,
      workedCount,
      correctCount,
      accuracy,
      errorCount: workedCount - correctCount
    };
  });

  const progressBase = filter === "reading"
    ? [
        { label: "12 Apr", occurredAt: "2026-04-12T10:00:00.000Z", reading: 5.5, listening: null },
        { label: "13 Apr", occurredAt: "2026-04-13T10:00:00.000Z", reading: 6.0, listening: null },
        { label: "14 Apr", occurredAt: "2026-04-14T10:00:00.000Z", reading: null, listening: null },
        { label: "15 Apr", occurredAt: "2026-04-15T10:00:00.000Z", reading: 6.0, listening: null },
        { label: "16 Apr", occurredAt: "2026-04-16T10:00:00.000Z", reading: null, listening: null },
        { label: "17 Apr", occurredAt: "2026-04-17T10:00:00.000Z", reading: 6.5, listening: null },
        { label: "18 Apr", occurredAt: "2026-04-18T10:00:00.000Z", reading: null, listening: null },
        { label: "19 Apr", occurredAt: "2026-04-19T10:00:00.000Z", reading: 7.0, listening: null },
        { label: "20 Apr", occurredAt: "2026-04-20T10:00:00.000Z", reading: null, listening: null },
        { label: "21 Apr", occurredAt: "2026-04-21T10:00:00.000Z", reading: 7.5, listening: null }
      ]
    : filter === "listening"
      ? [
          { label: "12 Apr", occurredAt: "2026-04-12T10:00:00.000Z", reading: null, listening: 6.0 },
          { label: "13 Apr", occurredAt: "2026-04-13T10:00:00.000Z", reading: null, listening: 6.5 },
          { label: "14 Apr", occurredAt: "2026-04-14T10:00:00.000Z", reading: null, listening: null },
          { label: "15 Apr", occurredAt: "2026-04-15T10:00:00.000Z", reading: null, listening: 6.5 },
          { label: "16 Apr", occurredAt: "2026-04-16T10:00:00.000Z", reading: null, listening: null },
          { label: "17 Apr", occurredAt: "2026-04-17T10:00:00.000Z", reading: null, listening: 7.0 },
          { label: "18 Apr", occurredAt: "2026-04-18T10:00:00.000Z", reading: null, listening: null },
          { label: "19 Apr", occurredAt: "2026-04-19T10:00:00.000Z", reading: null, listening: 7.2 },
          { label: "20 Apr", occurredAt: "2026-04-20T10:00:00.000Z", reading: null, listening: 7.5 },
          { label: "21 Apr", occurredAt: "2026-04-21T10:00:00.000Z", reading: null, listening: 7.5 }
        ]
      : [
          { label: "12 Apr", occurredAt: "2026-04-12T10:00:00.000Z", reading: 5.5, listening: 6.0 },
          { label: "13 Apr", occurredAt: "2026-04-13T10:00:00.000Z", reading: 6.0, listening: 6.5 },
          { label: "14 Apr", occurredAt: "2026-04-14T10:00:00.000Z", reading: null, listening: null },
          { label: "15 Apr", occurredAt: "2026-04-15T10:00:00.000Z", reading: 6.0, listening: 6.5 },
          { label: "16 Apr", occurredAt: "2026-04-16T10:00:00.000Z", reading: null, listening: null },
          { label: "17 Apr", occurredAt: "2026-04-17T10:00:00.000Z", reading: 6.5, listening: 7.0 },
          { label: "18 Apr", occurredAt: "2026-04-18T10:00:00.000Z", reading: null, listening: null },
          { label: "19 Apr", occurredAt: "2026-04-19T10:00:00.000Z", reading: 7.0, listening: 7.2 },
          { label: "20 Apr", occurredAt: "2026-04-20T10:00:00.000Z", reading: null, listening: 7.5 },
          { label: "21 Apr", occurredAt: "2026-04-21T10:00:00.000Z", reading: 7.5, listening: 7.5 }
        ];

  const tests = filter === "reading"
    ? [
        { testTitle: "Cambridge 17 Reading Test 2", testDate: "2026-04-11T10:00:00.000Z" },
        { testTitle: "Cambridge 18 Reading Test 1", testDate: "2026-04-14T10:00:00.000Z" },
        { testTitle: "Cambridge 18 Reading Test 3", testDate: "2026-04-18T10:00:00.000Z" },
        { testTitle: "Cambridge 19 Reading Test 3", testDate: "2026-04-21T10:00:00.000Z" }
      ]
    : filter === "listening"
      ? [
          { testTitle: "Cambridge 17 Listening Test 3", testDate: "2026-04-11T10:00:00.000Z" },
          { testTitle: "Cambridge 18 Listening Test 2", testDate: "2026-04-14T10:00:00.000Z" },
          { testTitle: "Cambridge 18 Listening Test 4", testDate: "2026-04-18T10:00:00.000Z" },
          { testTitle: "Cambridge 19 Listening Test 1", testDate: "2026-04-21T10:00:00.000Z" }
        ]
      : [];

  const comparisonItems = questionTypeAnalysis.map((item, index) => {
    const testA = Math.max(35, item.accuracy - 12 + (index % 3));
    const testB = Math.max(40, item.accuracy - 5);
    const testC = Math.max(45, item.accuracy - 2);
    const testD = item.accuracy;
    return {
      label: item.label,
      previousAccuracy: Number(((testA + testB + testC) / 3).toFixed(1)),
      currentAccuracy: testD,
      delta: Number((testD - ((testA + testB + testC) / 3)).toFixed(1)),
      accuracies: [testA, testB, testC, testD]
    };
  });

  const totalErrors = questionTypeAnalysis.reduce((sum, item) => sum + item.errorCount, 0);
  return {
    performanceSummary: {
      studyTime: {
        totalTimeSec: (5 * 60 + 12) * 60 + (4 * 60 + 16) * 60,
        readingTimeSec: (5 * 60 + 12) * 60,
        listeningTimeSec: (4 * 60 + 16) * 60
      },
      reading: {
        fullCount: 4,
        section1Count: 3,
        section2Count: 2,
        section3Count: 2,
        section4Count: 0
      },
      listening: {
        fullCount: 3,
        section1Count: 2,
        section2Count: 2,
        section3Count: 2,
        section4Count: 2
      }
    },
    questionTypeAnalysis,
    comparison: {
      previousTestTitle: tests[2]?.testTitle ?? null,
      previousTestDate: tests[2]?.testDate ?? null,
      currentTestTitle: tests[3]?.testTitle ?? null,
      currentTestDate: tests[3]?.testDate ?? null,
      tests,
      items: comparisonItems
    },
    errorDistribution: questionTypeAnalysis
      .filter((item) => item.errorCount > 0)
      .map((item) => ({
        label: item.label,
        errorCount: item.errorCount,
        share: Number(((item.errorCount / totalErrors) * 100).toFixed(1))
      }))
      .sort((left, right) => right.errorCount - left.errorCount),
    progressSeries: progressBase
  };
}

export function DashboardCharts({ analytics: initialAnalytics }: DashboardChartsProps) {
  const [showSamplePreview, setShowSamplePreview] = useState(false);
  const [analysisFilter, setAnalysisFilter] = useState<TestType>("reading");
  const [comparisonFilter, setComparisonFilter] = useState<TestType>("reading");
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const isPremium = useAuthStore((state) => state.isPremium);

  const overallQuery = useDashboardAnalytics(initialAnalytics, "all");
  const analysisQuery = useDashboardAnalytics(initialAnalytics, analysisFilter);
  const comparisonQuery = useDashboardAnalytics(initialAnalytics, comparisonFilter);

  const overallData = overallQuery.data ?? initialAnalytics ?? EMPTY_ANALYTICS;
  const analysisData = analysisQuery.data ?? EMPTY_ANALYTICS;
  const comparisonData = comparisonQuery.data ?? EMPTY_ANALYTICS;

  const overallHasNoRealData = isAnalyticsEmpty(overallData);
  const analysisHasNoRealData = isAnalyticsEmpty(analysisData);
  const comparisonHasNoRealData = isAnalyticsEmpty(comparisonData);

  const overallAnalytics = showSamplePreview || overallHasNoRealData
    ? buildSampleAnalytics("all")
    : overallData;
  const analysisAnalytics = showSamplePreview || analysisHasNoRealData
    ? buildSampleAnalytics(analysisFilter)
    : analysisData;
  const comparisonAnalytics = showSamplePreview || comparisonHasNoRealData
    ? buildSampleAnalytics(comparisonFilter)
    : comparisonData;

  const progressSeries = useMemo(() => buildDailyProgressSeries(overallAnalytics.progressSeries), [overallAnalytics.progressSeries]);
  const lastTenDayAverage = buildLastTenDayAverage(overallAnalytics);
  const comparisonTests = comparisonAnalytics.comparison.tests;
  const comparisonRows = comparisonAnalytics.comparison.items;

  return (
    <section className="space-y-6">
      <div className="px-1 space-y-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">Performance Analytics</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSamplePreview((current) => !current)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] transition-colors",
                showSamplePreview || overallHasNoRealData
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "border-border/70 bg-card text-muted-foreground hover:border-amber-500/20 hover:text-foreground"
              )}
            >
              <DatabaseZap className="h-3.5 w-3.5" />
              {showSamplePreview || overallHasNoRealData ? "Sample Preview On" : "Preview Sample Data"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.78fr_1.42fr]">
        <Card className="relative overflow-hidden rounded-3xl border-border/40 bg-card/70 shadow-sm">
          <CardHeader className="border-b border-border/30 px-4 py-3 md:px-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Total study time</p>
            </div>
          </CardHeader>
          <CardContent
            className={cn(
              "space-y-2 p-3 md:p-3.5",
              !isPremium && "select-none blur-[3px] opacity-75"
            )}
          >
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.07] px-3 py-3 dark:border-border/40 dark:bg-background/70">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Total</p>
                <p className="text-xl font-semibold tracking-tight text-foreground md:text-[22px]">
                  {formatStudyTime(overallAnalytics.performanceSummary.studyTime.totalTimeSec)}
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              {([
                {
                  label: "Reading",
                  value: formatStudyTime(overallAnalytics.performanceSummary.studyTime.readingTimeSec),
                  accent: "text-blue-600 dark:text-blue-400"
                },
                {
                  label: "Listening",
                  value: formatStudyTime(overallAnalytics.performanceSummary.studyTime.listeningTimeSec),
                  accent: "text-emerald-600 dark:text-emerald-400"
                }
              ]).map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "rounded-2xl px-3 py-2.5 dark:border-border/40 dark:bg-background/70",
                    item.label === "Reading"
                      ? "border border-blue-200/80 bg-blue-50/85"
                      : "border border-emerald-200/80 bg-emerald-50/85"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className={cn("text-[10px] font-black uppercase tracking-[0.16em]", item.accent)}>{item.label}</p>
                    <p className="text-lg font-semibold tracking-tight text-foreground">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          {!isPremium ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center px-5">
              <div className="rounded-2xl border border-amber-500/25 bg-background/90 px-5 py-4 text-center shadow-lg backdrop-blur-sm">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/12 text-amber-600 dark:text-amber-400">
                  <Lock className="h-4 w-4" />
                </div>
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">Premium Feature</p>
                <p className="mt-1 text-sm font-bold text-foreground">Unlock full study-time analytics</p>
                <Button asChild className="mt-4 h-9 rounded-xl px-4 text-xs font-black uppercase tracking-[0.18em]">
                  <Link href="/subscription">Upgrade Now</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="relative overflow-hidden rounded-3xl border-border/40 bg-card/70 shadow-sm">
          <CardHeader className="border-b border-border/30 px-4 py-3 md:px-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Total tests</p>
            </div>
          </CardHeader>
          <CardContent
            className={cn(
              "space-y-2 p-3 md:p-3.5",
              !isPremium && "select-none blur-[3px] opacity-75"
            )}
          >
            <div className="rounded-2xl border border-blue-200/80 bg-blue-50/85 p-3 dark:border-border/40 dark:bg-background/70">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Reading</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {([
                  { label: "Full", value: overallAnalytics.performanceSummary.reading.fullCount },
                  { label: "Passage 1", value: overallAnalytics.performanceSummary.reading.section1Count },
                  { label: "Passage 2", value: overallAnalytics.performanceSummary.reading.section2Count },
                  { label: "Passage 3", value: overallAnalytics.performanceSummary.reading.section3Count }
                ]).map((item) => (
                  <div key={item.label} className="rounded-xl border border-blue-100/90 bg-white/75 px-2.5 py-1.5 text-center shadow-sm dark:border-white/5 dark:bg-muted/40 dark:shadow-none">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-lg font-black tracking-tight text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/85 p-3 dark:border-border/40 dark:bg-background/70">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Listening</p>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {([
                  { label: "Full", value: overallAnalytics.performanceSummary.listening.fullCount },
                  { label: "Part 1", value: overallAnalytics.performanceSummary.listening.section1Count },
                  { label: "Part 2", value: overallAnalytics.performanceSummary.listening.section2Count },
                  { label: "Part 3", value: overallAnalytics.performanceSummary.listening.section3Count },
                  { label: "Part 4", value: overallAnalytics.performanceSummary.listening.section4Count }
                ]).map((item) => (
                  <div key={item.label} className="rounded-xl border border-emerald-100/90 bg-white/75 px-2 py-1.5 text-center shadow-sm dark:border-white/5 dark:bg-muted/40 dark:shadow-none">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-lg font-black tracking-tight text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          {!isPremium ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center px-5">
              <div className="rounded-2xl border border-amber-500/25 bg-background/90 px-5 py-4 text-center shadow-lg backdrop-blur-sm">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/12 text-amber-600 dark:text-amber-400">
                  <Lock className="h-4 w-4" />
                </div>
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">Premium Feature</p>
                <p className="mt-1 text-sm font-bold text-foreground">Unlock full test-volume analytics</p>
                <Button asChild className="mt-4 h-9 rounded-xl px-4 text-xs font-black uppercase tracking-[0.18em]">
                  <Link href="/subscription">Upgrade Now</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      <Card className="overflow-hidden rounded-3xl border-border/40 shadow-sm">
        <CardHeader className="border-b border-border/40 bg-card/60 px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground">Progress Graph</p>
              <CardTitle className="mt-1 text-lg md:text-xl font-semibold tracking-tight">Band score over time</CardTitle>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
              <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Last 10-day average</p>
              <div className="mt-2 flex items-end gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <p className={cn(
                  "text-2xl tracking-tight text-foreground",
                  lastTenDayAverage.reading === null ? "font-semibold" : "font-black"
                )}>
                  {lastTenDayAverage.reading?.toFixed(1) ?? "N/A"}
                </p>
              </div>
              <p className="mt-1 text-xs font-medium text-muted-foreground">Reading</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Last 10-day average</p>
              <div className="mt-2 flex items-end gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <p className={cn(
                  "text-2xl tracking-tight text-foreground",
                  lastTenDayAverage.listening === null ? "font-semibold" : "font-black"
                )}>
                  {lastTenDayAverage.listening?.toFixed(1) ?? "N/A"}
                </p>
              </div>
              <p className="mt-1 text-xs font-medium text-muted-foreground">Listening</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {progressSeries.length === 0 ? (
            <EmptyState message="Complete scored Reading or Listening tests to unlock your progress graph." />
          ) : (
            <div className="h-[312px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressSeries} margin={{ left: 40, right: 24, top: 8, bottom: 12 }}>
                    <CartesianGrid stroke="rgba(148, 163, 184, 0.16)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      interval={0}
                      minTickGap={0}
                      tickLine={false}
                      axisLine={false}
                      tick={<ProgressDateTick />}
                      height={36}
                      padding={{ left: 28, right: 20 }}
                    />
                    <YAxis domain={[0, 9]} tickLine={false} axisLine={false} fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 16,
                        border: "1px solid rgba(148, 163, 184, 0.18)",
                        background: "rgba(15, 23, 42, 0.96)",
                        color: "#fff"
                      }}
                      formatter={(value, name) => {
                        const normalizedValue = Array.isArray(value) ? value[0] : value;
                        return [
                          normalizedValue === null || normalizedValue === undefined ? "N/A" : `${Number(normalizedValue).toFixed(1)} band`,
                          name === "reading" ? "Reading" : "Listening"
                        ];
                      }}
                      labelFormatter={(value: string) => `Date: ${value}`}
                    />
                    <Legend />
                    <Line
                      type="linear"
                      dataKey="reading"
                      name="Reading"
                      connectNulls
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4.5, fill: "#2563eb", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#2563eb", strokeWidth: 0 }}
                    />
                    <Line
                      type="linear"
                      dataKey="listening"
                      name="Listening"
                      connectNulls
                      stroke="#059669"
                      strokeWidth={3}
                      dot={{ r: 4.5, fill: "#059669", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#059669", strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-3xl border-primary/15 bg-gradient-to-br from-primary/[0.05] via-card to-card shadow-[0_24px_80px_-48px_rgba(37,99,235,0.45)]">
        <CardHeader className="space-y-4 border-b border-primary/10 bg-gradient-to-r from-primary/[0.08] via-card/95 to-card/85 px-4 py-4 md:px-6">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Question Type Analysis</p>
                <CardTitle className="mt-1 text-base md:text-lg font-semibold tracking-tight">Worked, correct, accuracy, and errors across every question type</CardTitle>
              </div>
              <button
                type="button"
                onClick={() => setIsAnalysisOpen((current) => !current)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                aria-expanded={isAnalysisOpen}
                aria-label={isAnalysisOpen ? "Collapse question type analysis" : "Expand question type analysis"}
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isAnalysisOpen && "rotate-180")} />
              </button>
            </div>
            {isAnalysisOpen ? (
              <div className="flex justify-end">
                <SectionFilter value={analysisFilter} onChange={setAnalysisFilter} />
              </div>
            ) : null}
          </div>
        </CardHeader>
        {isAnalysisOpen ? (
        <CardContent className={cn("p-0", !isPremium && "select-none blur-[3px] opacity-75")}>
          {analysisAnalytics.questionTypeAnalysis.length === 0 ? (
            <div className="p-4 md:p-6">
              <EmptyState message="Answer a few scored questions to unlock question-type analysis." />
            </div>
          ) : (
            <div className="divide-y divide-border/40">
                <div className="grid grid-cols-[minmax(0,2.25fr)_44px_44px_58px_46px] gap-2 px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground sm:grid-cols-[minmax(0,2.15fr)_54px_54px_66px_52px] sm:gap-3 sm:px-4 sm:text-[10px] md:grid-cols-[minmax(0,2fr)_68px_68px_82px_60px] md:px-5">
                  <span>Question Type</span>
                  <span className="text-right">Worked</span>
                  <span className="text-right">Correct</span>
                  <span className="text-right">Acc.</span>
                  <span className="text-right">Err.</span>
                </div>
                {analysisAnalytics.questionTypeAnalysis.map((item) => (
                  <div key={item.label} className="grid grid-cols-[minmax(0,2.25fr)_44px_44px_58px_46px] gap-2 px-3 py-3 sm:grid-cols-[minmax(0,2.15fr)_54px_54px_66px_52px] sm:gap-3 sm:px-4 md:grid-cols-[minmax(0,2fr)_68px_68px_82px_60px] md:px-5">
                    <div className="space-y-1.5">
                      <p className="text-[12px] font-bold leading-tight text-foreground sm:text-[13px] md:text-sm">{item.label}</p>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            item.accuracy >= 75 ? "bg-emerald-500" : item.accuracy >= 60 ? "bg-amber-500" : "bg-rose-500"
                          )}
                          style={{ width: `${Math.min(item.accuracy, 100)}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-right text-[12px] font-bold text-foreground sm:text-[13px] md:text-sm">{item.workedCount}</p>
                    <p className="text-right text-[12px] font-bold text-foreground sm:text-[13px] md:text-sm">{item.correctCount}</p>
                    <p className={cn("text-right text-[12px] font-black sm:text-[13px] md:text-sm", item.accuracy >= 75 ? "text-emerald-600" : item.accuracy >= 60 ? "text-amber-600" : "text-rose-600")}>
                      {item.accuracy.toFixed(1)}%
                    </p>
                    <p className="text-right text-[12px] font-black text-rose-600 sm:text-[13px] md:text-sm">{item.errorCount}</p>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
        ) : null}
        {!isPremium && isAnalysisOpen ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-5">
            <div className="rounded-2xl border border-amber-500/25 bg-background/90 px-5 py-4 text-center shadow-lg backdrop-blur-sm">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/12 text-amber-600 dark:text-amber-400">
                <Lock className="h-4 w-4" />
              </div>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">Premium Feature</p>
              <p className="mt-1 text-sm font-bold text-foreground">Unlock question-type analysis</p>
              <Button asChild className="mt-4 h-9 rounded-xl px-4 text-xs font-black uppercase tracking-[0.18em]">
                <Link href="/subscription">Upgrade Now</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="relative overflow-hidden rounded-3xl border-primary/15 bg-gradient-to-br from-primary/[0.05] via-card to-card shadow-[0_24px_80px_-48px_rgba(37,99,235,0.45)]">
        <CardHeader className="space-y-4 border-b border-primary/10 bg-gradient-to-r from-primary/[0.08] via-card/95 to-card/85 px-4 py-4 md:px-6">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Question-type comparison</p>
                <CardTitle className="mt-1 text-base md:text-lg font-semibold tracking-tight">Last four tests compared side by side</CardTitle>
              </div>
              <button
                type="button"
                onClick={() => setIsComparisonOpen((current) => !current)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                aria-expanded={isComparisonOpen}
                aria-label={isComparisonOpen ? "Collapse question type comparison" : "Expand question type comparison"}
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isComparisonOpen && "rotate-180")} />
              </button>
            </div>
            {isComparisonOpen ? (
              <div className="flex justify-end">
                <SectionFilter value={comparisonFilter} onChange={setComparisonFilter} />
              </div>
            ) : null}
          </div>
          {isComparisonOpen ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {comparisonAnalytics.comparison.tests.map((test, index) => (
              <div
                key={`${test.testTitle}-${test.testDate}`}
                className={cn(
                  "rounded-2xl border p-4 shadow-sm backdrop-blur-sm",
                  index === comparisonAnalytics.comparison.tests.length - 1
                    ? "border-primary/30 bg-gradient-to-br from-primary/12 via-primary/6 to-transparent shadow-[0_16px_40px_-28px_rgba(37,99,235,0.65)]"
                    : "border-border/50 bg-background/75"
                )}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/80">Test {index + 1}</p>
                <p className="mt-2 text-sm font-bold text-foreground">{test.testTitle}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">{formatAttemptDate(test.testDate)}</p>
              </div>
            ))}
          </div>
          ) : null}
        </CardHeader>
        {isComparisonOpen ? (
        <CardContent className={cn("space-y-4 p-4 md:p-6", !isPremium && "select-none blur-[3px] opacity-75")}>
          {comparisonTests.length === 0 ? (
            <EmptyState message="Take at least two completed tests in the same module to compare changes across question types." />
          ) : (
            <>
              <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-background via-primary/[0.03] to-background p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-4">
                <div className="flex flex-wrap items-center gap-2 border-b border-primary/10 pb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Heatmap</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">70-100%</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700 dark:text-amber-400">50-69%</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rose-700 dark:text-rose-400">0-49%</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">No question</span>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <div
                    className="min-w-[660px]"
                    style={{ display: "grid", gridTemplateColumns: `minmax(200px, 2fr) repeat(${comparisonTests.length}, minmax(88px, 1fr))` }}
                  >
                    <div className="border-b border-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                      Question Type
                    </div>
                    {comparisonTests.map((test, index) => (
                      <div key={`${test.testTitle}-${test.testDate}`} className="border-b border-primary/10 px-2 py-2 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary/80">Test {index + 1}</p>
                      </div>
                    ))}

                    {comparisonRows.map((item) => (
                      <div key={item.label} className="contents">
                        <div key={`${item.label}-label`} className="border-b border-border/30 px-2.5 py-2">
                          <div className="rounded-xl border border-transparent bg-background/50 px-2.5 py-1.5">
                            <p className="text-[11px] font-bold leading-tight text-foreground">{item.label}</p>
                          </div>
                        </div>
                        {comparisonTests.map((test, index) => {
                          const value = item.accuracies[index] ?? null;
                          return (
                            <div
                              key={`${item.label}-${test.testTitle}-${index}`}
                              className="border-b border-border/30 px-1.5 py-1.5"
                            >
                              <div
                                className={cn(
                                  "flex min-h-[46px] items-center justify-center rounded-lg border text-[13px] font-black",
                                  getHeatmapCellClass(value)
                                )}
                              >
                                {formatHeatmapValue(value)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
        ) : null}
        {!isPremium && isComparisonOpen ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-5">
            <div className="rounded-2xl border border-amber-500/25 bg-background/90 px-5 py-4 text-center shadow-lg backdrop-blur-sm">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/12 text-amber-600 dark:text-amber-400">
                <Lock className="h-4 w-4" />
              </div>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">Premium Feature</p>
              <p className="mt-1 text-sm font-bold text-foreground">Unlock question-type comparison</p>
              <Button asChild className="mt-4 h-9 rounded-xl px-4 text-xs font-black uppercase tracking-[0.18em]">
                <Link href="/subscription">Upgrade Now</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
