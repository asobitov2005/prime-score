"use client";
import { PrimePremiumIcon } from "@/components/ui/prime-premium-icon";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Gem, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DashboardAnalytics, TestType } from "@/lib/types";
import { roundToIeltsBand, useDashboardAnalytics } from "@/components/charts/use-dashboard-analytics";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { WritingCriteriaRadar } from "@/components/charts/writing-criteria-radar";
import { Lock } from "lucide-react";

interface DashboardChartsProps {
  analytics: DashboardAnalytics;
}

const EMPTY_ANALYTICS: DashboardAnalytics = {
  performanceSummary: {
    studyTime: { totalTimeSec: 0, readingTimeSec: 0, listeningTimeSec: 0, writingTimeSec: 0 },
    reading: { fullCount: 0, section1Count: 0, section2Count: 0, section3Count: 0, section4Count: 0 },
    listening: { fullCount: 0, section1Count: 0, section2Count: 0, section3Count: 0, section4Count: 0 },
    writing: { fullCount: 0, section1Count: 0, section2Count: 0, section3Count: 0, section4Count: 0 }
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
  progressSeries: [],
  accuracyTrend: [],
  weeklyActivity: [],
  scoreDistribution: { band1To3: 0, band3_5To5: 0, band5To6_5: 0, band6_5To7_5: 0, band7_5To9: 0 },
  personalBests: { bestBand: null, bestAccuracy: null, longestStreak: 0, currentStreak: 0, fastestFullTestSec: null },
  speedMetrics: { avgTimePerQuestionSec: null, readingAvgSecPerQuestion: null, listeningAvgSecPerQuestion: null },
  improvementRate: { last5AvgBand: null, prev5AvgBand: null, delta: null, percentChange: null },
};

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

  const byDate = new Map<string, { reading: number | null; listening: number | null; writing: number | null }>();
  for (const point of sorted) {
    const key = toLocalDateKey(new Date(point.occurredAt));
    byDate.set(key, {
      reading: point.reading,
      listening: point.listening,
      writing: point.writing ?? null
    });
  }

  const items: DashboardAnalytics["progressSeries"] = [];

  for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    const key = toLocalDateKey(current);
    const entry = byDate.get(key);
    items.push({
      label: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(current)),
      occurredAt: `${key}T00:00:00`,
      reading: entry?.reading ?? 0,
      listening: entry?.listening ?? 0,
      writing: entry?.writing ?? 0
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
      {(["reading", "listening", "writing"] as TestType[]).map((option) => (
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
  const writingValues = recent.map((item) => item.writing).filter((value): value is number => value !== null);

  return {
    reading: readingValues.length > 0
      ? roundToIeltsBand(readingValues.reduce((sum, value) => sum + value, 0) / readingValues.length)
      : null,
    listening: listeningValues.length > 0
      ? roundToIeltsBand(listeningValues.reduce((sum, value) => sum + value, 0) / listeningValues.length)
      : null,
    writing: writingValues.length > 0
      ? roundToIeltsBand(writingValues.reduce((sum, value) => sum + value, 0) / writingValues.length)
      : null
  };
}

export function DashboardCharts({ analytics: initialAnalytics }: DashboardChartsProps) {
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

  const overallAnalytics = overallData;
  const analysisAnalytics = analysisData;
  const comparisonAnalytics = comparisonData;

  const progressSeries = useMemo(() => buildDailyProgressSeries(overallAnalytics.progressSeries), [overallAnalytics.progressSeries]);
  const lastTenDayAverage = buildLastTenDayAverage(overallAnalytics);
  const comparisonTests = comparisonAnalytics.comparison.tests;
  const comparisonRows = comparisonAnalytics.comparison.items;

  return (
    <section className="space-y-6">
      <Card className="overflow-hidden rounded-[2.5rem] border border-border/40 shadow-sm bg-card/60 backdrop-blur-md">
        <CardHeader className="border-b border-border/40 bg-card/40 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary/10 text-primary shadow-sm">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Progress Graph</p>
              </div>
              <CardTitle className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">Band score over time</CardTitle>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 min-w-full lg:min-w-[420px]">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-center shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600/80 dark:text-blue-400/80 mb-1">Reading</p>
                <div className="flex items-center justify-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {lastTenDayAverage.reading?.toFixed(1) ?? "—"}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-center shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400/80 mb-1">Listening</p>
                <div className="flex items-center justify-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {lastTenDayAverage.listening?.toFixed(1) ?? "—"}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-center shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600/80 dark:text-violet-400/80 mb-1">Writing</p>
                <div className="flex items-center justify-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-violet-500" />
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {lastTenDayAverage.writing?.toFixed(1) ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 md:p-8">
          {progressSeries.length === 0 ? (
            <EmptyState message="Complete scored Reading or Listening tests to unlock your progress graph." />
          ) : (
            <div className="h-[360px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressSeries} margin={{ left: -20, right: 10, top: 20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReading" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorListening" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorWriting" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                    <XAxis
                      dataKey="label"
                      interval="preserveStartEnd"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis 
                      domain={[0, 9]} 
                      ticks={[0, 3, 5, 7, 9]} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }}
                    />
                    <Tooltip
                      cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                        boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)",
                        padding: "12px 16px"
                      }}
                      labelStyle={{
                        color: "hsl(var(--muted-foreground))",
                        fontSize: "11px",
                        fontWeight: 800,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        marginBottom: "8px"
                      }}
                      itemStyle={{
                        fontWeight: 700,
                        fontSize: "13px",
                        padding: "2px 0"
                      }}
                      formatter={(value, name) => {
                        const normalizedValue = Array.isArray(value) ? value[0] : value;
                        const label = typeof name === "string" ? name : "Score";
                        const scoreText = normalizedValue === null || normalizedValue === undefined ? "—" : Number(normalizedValue).toFixed(1);
                        return [`${scoreText} band`, label];
                      }}
                      labelFormatter={(value: string) => value}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      iconType="circle" 
                      wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 600 }} 
                    />
                    <Line
                      type="monotone"
                      dataKey="reading"
                      name="Reading"
                      connectNulls
                      stroke="#3b82f6"
                      strokeWidth={4}
                      dot={{ r: 4, fill: "hsl(var(--background))", stroke: "#3b82f6", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#3b82f6", strokeWidth: 0, className: "drop-shadow-md" }}
                      animationDuration={1500}
                    />
                    <Line
                      type="monotone"
                      dataKey="listening"
                      name="Listening"
                      connectNulls
                      stroke="#10b981"
                      strokeWidth={4}
                      dot={{ r: 4, fill: "hsl(var(--background))", stroke: "#10b981", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#10b981", strokeWidth: 0, className: "drop-shadow-md" }}
                      animationDuration={1500}
                    />
                    <Line
                      type="monotone"
                      dataKey="writing"
                      name="Writing"
                      connectNulls
                      stroke="#8b5cf6"
                      strokeWidth={4}
                      dot={{ r: 4, fill: "hsl(var(--background))", stroke: "#8b5cf6", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#8b5cf6", strokeWidth: 0, className: "drop-shadow-md" }}
                      animationDuration={1500}
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
          {analysisFilter === "writing" && analysisAnalytics.writingCriteria ? (
            <div className="p-4 md:p-6">
              <WritingCriteriaRadar criteria={analysisAnalytics.writingCriteria} />
            </div>
          ) : analysisAnalytics.questionTypeAnalysis.length === 0 ? (
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
      {/* ---- NEW: Accuracy Trend ---- */}
      <Card className="overflow-hidden rounded-3xl border-border/40 shadow-sm">
        <CardHeader className="border-b border-border/40 bg-card/60 px-4 py-4 md:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground">Accuracy Trend</p>
            <CardTitle className="mt-1 text-lg md:text-xl font-semibold tracking-tight">Accuracy % across recent tests</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {overallAnalytics.accuracyTrend.length === 0 ? (
            <EmptyState message="Complete scored tests to see your accuracy trend." />
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overallAnalytics.accuracyTrend} margin={{ left: 0, right: 16, top: 8, bottom: 12 }}>
                  <defs>
                    <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.16)" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 16, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Accuracy"]}
                  />
                  <Area type="monotone" dataKey="accuracy" connectNulls stroke="#8b5cf6" strokeWidth={2.5} fill="url(#accuracyGrad)" dot={{ r: 3.5, fill: "#8b5cf6", strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- NEW: Weekly Activity + Score Distribution ---- */}
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden rounded-3xl border-border/40 shadow-sm">
          <CardHeader className="border-b border-border/40 bg-card/60 px-4 py-4 md:px-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground">Weekly Activity</p>
              <CardTitle className="mt-1 text-lg font-semibold tracking-tight">12-week practice history</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {overallAnalytics.weeklyActivity.every(w => w.attemptsCount === 0) ? (
              <EmptyState message="Start practicing to build your activity history." />
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overallAnalytics.weeklyActivity} margin={{ left: 0, right: 8, top: 8, bottom: 12 }}>
                    <CartesianGrid stroke="rgba(148,163,184,0.16)" vertical={false} />
                    <XAxis dataKey="weekLabel" tickLine={false} axisLine={false} fontSize={10} interval={1} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 16, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
                      formatter={(value: number, name: string) => [value, name === "attemptsCount" ? "Tests" : "Minutes"]}
                    />
                    <Bar dataKey="attemptsCount" name="Tests" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border-border/40 shadow-sm">
          <CardHeader className="border-b border-border/40 bg-card/60 px-4 py-4 md:px-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground">Score Distribution</p>
              <CardTitle className="mt-1 text-lg font-semibold tracking-tight">Band score breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {(() => {
              const sd = overallAnalytics.scoreDistribution;
              const data = [
                { name: "1.0–3.0", value: sd.band1To3, color: "#ef4444" },
                { name: "3.5–5.0", value: sd.band3_5To5, color: "#f59e0b" },
                { name: "5.0–6.5", value: sd.band5To6_5, color: "#3b82f6" },
                { name: "6.5–7.5", value: sd.band6_5To7_5, color: "#8b5cf6" },
                { name: "7.5–9.0", value: sd.band7_5To9, color: "#10b981" },
              ];
              const total = data.reduce((s, d) => s + d.value, 0);
              if (total === 0) {
                return <EmptyState message="Complete scored tests to see your score distribution." />;
              }
              return (
                <div className="flex flex-col items-center gap-4">
                  <div className="h-[200px] w-full max-w-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {data.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid hsl(var(--border))",
                            background: "hsl(var(--background))",
                            color: "hsl(var(--foreground))",
                            boxShadow: "0 20px 48px -24px rgba(15, 23, 42, 0.45)"
                          }}
                          labelStyle={{
                            color: "hsl(var(--foreground))",
                            fontSize: 12,
                            fontWeight: 800,
                            letterSpacing: "0.04em"
                          }}
                          itemStyle={{
                            color: "hsl(var(--foreground))",
                            fontWeight: 700
                          }}
                          formatter={(value: number, name: string) => [`${value} tests`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {data.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 rounded-full border border-border/50 bg-background/60 px-2.5 py-1">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-[10px] font-bold text-muted-foreground">{d.name}</span>
                        <span className="text-[10px] font-black text-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* ---- NEW: Speed Metrics ---- */}
      <Card className="overflow-hidden rounded-3xl border-border/40 shadow-sm">
        <CardHeader className="border-b border-border/40 bg-card/60 px-4 py-4 md:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground">Speed Metrics</p>
            <CardTitle className="mt-1 text-lg font-semibold tracking-tight">Average time per question by section</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {overallAnalytics.speedMetrics.avgTimePerQuestionSec === null ? (
            <EmptyState message="Complete scored tests to see your speed metrics." />
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {([
                { label: "Overall", value: overallAnalytics.speedMetrics.avgTimePerQuestionSec, accent: "text-primary", bg: "bg-primary/10 border-primary/20" },
                { label: "Reading", value: overallAnalytics.speedMetrics.readingAvgSecPerQuestion, accent: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                { label: "Listening", value: overallAnalytics.speedMetrics.listeningAvgSecPerQuestion, accent: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              ]).map((item) => (
                <div key={item.label} className={cn("rounded-2xl border p-4 text-center", item.bg)}>
                  <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", item.accent)}>{item.label}</p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-foreground">
                    {item.value !== null ? `${item.value.toFixed(0)}s` : "—"}
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">per question</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
