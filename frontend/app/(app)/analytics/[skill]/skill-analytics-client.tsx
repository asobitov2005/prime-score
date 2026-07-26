"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  CheckCircle,
  ClipboardList,
  Clock3,
  Crown,
  FileText,
  Headphones,
  Info,
  Lightbulb,
  MessageCircle,
  Mic,
  PencilLine,
  ScanSearch,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Minus,
  Volume2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { roundIeltsBand } from "@/lib/ielts-band";
import { cn } from "@/lib/utils";
import { getSubscriptionPageHref } from "@/lib/subscription-navigation";
import { useAuthStore } from "@/store/auth-store";
import type { DashboardAnalytics } from "@/lib/types";

type Skill = "reading" | "listening" | "writing" | "speaking";
type IconComponent = React.ComponentType<{ className?: string }>;

type WritingTaskTab = "task1" | "task2";

type WritingPromptRow = {
  promptType: string;
  band: string;
  attempts: string;
  issue: string;
  status: "Good" | "Needs practice" | "Limited data" | "Not practiced";
};

function Card({
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

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-[17px] font-semibold tracking-tight text-[#0F172A]">{children}</h2>
      <Info className="h-4 w-4 text-slate-300" />
    </div>
  );
}

function AccuracyBar({
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

function progressColor(tone: string) {
  if (tone === "green") return "bg-emerald-500";
  if (tone === "blue") return "bg-blue-500";
  if (tone === "orange") return "bg-orange-500";
  return "bg-red-500";
}

function writingStatusClassName(status: WritingPromptRow["status"]) {
  if (status === "Good") return "bg-emerald-50 text-emerald-700";
  if (status === "Needs practice") return "bg-orange-50 text-orange-700";
  if (status === "Limited data") return "bg-slate-100 text-slate-600";
  return "bg-slate-50 text-slate-500";
}

function formatSeconds(totalSeconds: number | null | undefined) {
  if (totalSeconds === null || totalSeconds === undefined) return "No data";
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function roundWholeBand(value: number | string | null | undefined) {
  const rounded = roundIeltsBand(value);
  return rounded === null ? null : Math.min(9, Math.max(0, Math.round(rounded)));
}

function formatBand(value: number | string | null | undefined, fallback = "—") {
  const rounded = roundWholeBand(value);
  return rounded === null ? fallback : String(rounded);
}

function formatPercent(value: number | null | undefined, fallback = "—") {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}%` : fallback;
}

function formatWholeBandDelta(value: number | string | null | undefined, fallback = "No previous data") {
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

function formatTrendValue(value: unknown, name: unknown): [string, string] {
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

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function toLocalDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTrendDayLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildNineDayPerformanceTrend(accuracyTrend: DashboardAnalytics["accuracyTrend"]) {
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
      // Empty days fall back to 0 so the lines stay continuous (matches the
      // overview Band Score Trend) instead of breaking on missing data.
      band: band ?? 0,
      accuracy: accuracy === null ? 0 : Math.round(accuracy),
    };
  });
}

function buildSevenDayBandTrend(
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
      // Empty days fall back to 0 so the line stays continuous (matches the
      // overview Band Score Trend) instead of breaking on missing data.
      score: roundWholeBand(average(values)) ?? 0,
    };
  });
}

function skillStatus(score: number | null) {
  if (score === null) return { label: "No data", className: "bg-slate-100 text-slate-500", icon: Info };
  if (score >= 6.5) return { label: "Strength", className: "bg-emerald-50 text-emerald-600", icon: CheckCircle2 };
  if (score >= 5) return { label: "Improving", className: "bg-amber-50 text-amber-700", icon: CheckCircle2 };
  return { label: "Needs focus", className: "bg-red-50 text-red-600", icon: AlertTriangle };
}

function bandChangePill(delta: number | string | null | undefined): { className: string; icon: IconComponent } {
  const numeric = delta === null || delta === undefined ? null : Number(delta);
  if (numeric === null || !Number.isFinite(numeric) || numeric === 0) {
    return { className: "bg-slate-100 text-slate-500", icon: Minus };
  }
  if (numeric > 0) {
    return { className: "bg-emerald-50 text-emerald-600", icon: TrendingUp };
  }
  return { className: "bg-red-50 text-red-500", icon: TrendingDown };
}

function BandScoreSummary({
  band,
  status,
  StatusIcon,
  secondary,
}: {
  band: string;
  status: { label: string; className: string };
  StatusIcon: IconComponent;
  secondary: { className: string; icon: IconComponent; text: string };
}) {
  const SecondaryIcon = secondary.icon;
  return (
    <div className="flex flex-col justify-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Overall Band</p>
      <div className="mt-2 flex items-end gap-1.5">
        <p className="text-[3.25rem] font-bold leading-none tracking-tight text-[#0F172A]">{band}</p>
        <span className="mb-1.5 text-sm font-bold text-slate-300">/9</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold", status.className)}>
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </span>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold", secondary.className)}>
          <SecondaryIcon className="h-3.5 w-3.5" />
          {secondary.text}
        </span>
      </div>
    </div>
  );
}

function questionTone(accuracy: number) {
  if (accuracy >= 70) return "green";
  if (accuracy >= 50) return "blue";
  if (accuracy >= 35) return "orange";
  return "red";
}

function focusIcon(key: string, fallback: IconComponent): IconComponent {
  if (key === "weakest_section") return AlertTriangle;
  if (key === "best_section") return CheckCircle;
  if (key === "detail_recognition") return ScanSearch;
  if (key === "paraphrase_understanding") return FileText;
  if (key === "distractor_handling") return Volume2;
  if (key === "spelling_accuracy") return CheckCircle;
  if (key === "avg_time") return Clock3;
  if (key === "recommended_time") return Timer;
  if (key === "time_management") return AlertTriangle;
  if (key === "slowest_section") return Clock3;
  if (key === "fastest_section") return CheckCircle;
  if (key === "unanswered") return ClipboardList;
  return fallback;
}

function noDataMessage(label: string) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-500">
      {label}
    </div>
  );
}

function SkillDetailContent({ variant, analytics }: { variant: "reading" | "listening"; analytics: DashboardAnalytics }) {
  const isListening = variant === "listening";
  const pageTitle = isListening ? "Listening Analytics" : "Reading Analytics";
  const pageSubtitle = isListening
    ? "Track your listening performance and understand audio-specific weak spots"
    : "Track your reading performance and find areas to improve";
  const HeaderIcon = isListening ? Headphones : BookOpenText;
  const skillKey = variant;
  const bandValues = analytics.progressSeries
    .map((point) => point[skillKey])
    .filter((value): value is number => typeof value === "number");
  const averageBand = roundWholeBand(average(bandValues.slice(-10)));
  const bandTrend = buildSevenDayBandTrend(analytics.progressSeries, skillKey);
  const performanceTrend = buildNineDayPerformanceTrend(analytics.accuracyTrend);
  const practicedQuestionTypes = analytics.questionTypeAnalysis.filter((item) => item.workedCount > 0);
  const totalWorked = practicedQuestionTypes.reduce((sum, item) => sum + item.workedCount, 0);
  const totalCorrect = practicedQuestionTypes.reduce((sum, item) => sum + item.correctCount, 0);
  const averageAccuracy = totalWorked > 0 ? (totalCorrect / totalWorked) * 100 : null;
  const completedCount = analytics.performanceSummary[skillKey].fullCount
    + analytics.performanceSummary[skillKey].section1Count
    + analytics.performanceSummary[skillKey].section2Count
    + analytics.performanceSummary[skillKey].section3Count
    + analytics.performanceSummary[skillKey].section4Count;
  const metrics = [
    { label: "Avg. Score", value: formatBand(averageBand), subtext: "of recent completed tests", icon: Target, iconClassName: "bg-indigo-50 text-indigo-600" },
    { label: "Accuracy", value: formatPercent(averageAccuracy), subtext: "Average answered accuracy", icon: CheckCircle2, iconClassName: "bg-emerald-50 text-emerald-600" },
    { label: "Avg. Time", value: formatSeconds(analytics.timeAnalysis.avgTimePerTestSec), subtext: "Per completed test", icon: Clock3, iconClassName: "bg-violet-50 text-violet-600" },
    { label: "Compl. Tests", value: String(completedCount), subtext: "Completed attempts", icon: ClipboardList, iconClassName: "bg-blue-50 text-blue-600" },
  ];
  const strengthItems = [...practicedQuestionTypes]
    .sort((a, b) => b.accuracy - a.accuracy || b.workedCount - a.workedCount)
    .slice(0, 4)
    .map((item) => ({ label: item.label, accuracy: item.accuracy }));
  const weakItems = [...practicedQuestionTypes]
    .sort((a, b) => a.accuracy - b.accuracy || b.workedCount - a.workedCount)
    .slice(0, 4)
    .map((item) => ({ label: item.label, accuracy: item.accuracy }));
  const questionTypeItems = analytics.questionTypeAnalysis.map((item) => ({
    label: item.label,
    accuracy: item.accuracy,
    attempts: item.workedCount,
    tone: questionTone(item.accuracy),
  }));
  const timeFocusItems = [
    { key: "avg_time", label: "Average Time per Test", valueLabel: formatSeconds(analytics.timeAnalysis.avgTimePerTestSec), subtext: null, status: null },
    { key: "recommended_time", label: "Recommended Time", valueLabel: formatSeconds(analytics.timeAnalysis.recommendedTimeSec), subtext: null, status: null },
    { key: "time_management", label: "Time Management", valueLabel: analytics.timeAnalysis.timeManagementStatus, subtext: null, status: analytics.timeAnalysis.timeManagementStatus === "Needs improvement" ? "needs_work" : "stable" },
    {
      key: "slowest_section",
      label: "Slowest Section",
      valueLabel: analytics.timeAnalysis.slowestSection?.label ?? "No data",
      subtext: analytics.timeAnalysis.slowestSection?.avgTimeSec ? `${formatSeconds(analytics.timeAnalysis.slowestSection.avgTimeSec)} average` : "Not enough section timing data",
      status: null,
    },
    {
      key: "fastest_section",
      label: "Fastest Section",
      valueLabel: analytics.timeAnalysis.fastestSection?.label ?? "No data",
      subtext: analytics.timeAnalysis.fastestSection?.avgTimeSec ? `${formatSeconds(analytics.timeAnalysis.fastestSection.avgTimeSec)} average` : "Not enough section timing data",
      status: null,
    },
    {
      key: "unanswered",
      label: "Unanswered Questions",
      valueLabel: analytics.timeAnalysis.unansweredAvgPercent === null ? "No data" : formatPercent(analytics.timeAnalysis.unansweredAvgPercent),
      subtext: "Average per test",
      status: null,
    },
  ];
  const focusItems = isListening ? analytics.skillFocus : timeFocusItems;
  const priorityItems = weakItems.slice(0, 3).map((item, index) => ({
    number: index + 1,
    title: item.label,
    metric: `${Math.round(item.accuracy)}% accuracy`,
    focus: `Focus: improve accuracy on ${item.label}.`,
    badgeClassName: index === 0 ? "bg-red-50 text-red-600" : index === 1 ? "bg-orange-50 text-orange-600" : "bg-amber-50 text-amber-700",
  }));
  const overallChange = analytics.improvementRate.delta ?? null;
  const overallChangeLabel = formatWholeBandDelta(overallChange);
  const analysisTitle = isListening ? "Listening Focus" : "Time Analysis";
  const primaryChartColor = isListening ? "#10B981" : "#4F46E5";
  const status = skillStatus(averageBand);
  const StatusIcon = status.icon;

  return (
    <div className="analytics-night space-y-5 pb-10 text-[#0F172A]">
      <main className="space-y-5">
        <Link href="/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-indigo-600">
          <ArrowLeft className="h-4 w-4 text-indigo-600" />
          Back to Analytics
        </Link>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] border",
              isListening ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-blue-100 bg-blue-50 text-blue-600",
            )}>
              <HeaderIcon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">{pageTitle}</h1>
              <p className="mt-2 text-sm font-medium text-[#64748B] sm:text-base">
                {pageSubtitle}
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[0.48fr_0.52fr]">
          <Card className="p-5">
            <div className="grid h-full gap-5 md:grid-cols-[150px_minmax(0,1fr)]">
              <BandScoreSummary
                band={formatBand(averageBand)}
                status={status}
                StatusIcon={StatusIcon}
                secondary={{
                  ...bandChangePill(overallChange),
                  text: overallChange === null ? "No previous data" : `${overallChangeLabel} from previous attempts`,
                }}
              />

              <div className="h-[200px] min-w-0 md:h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bandTrend} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="readingBandFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={primaryChartColor} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={primaryChartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#EEF2F7" />
                    <XAxis dataKey="date" padding={{ left: 16, right: 8 }} interval="preserveStartEnd" minTickGap={20} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
	                    <YAxis domain={[0, 9]} ticks={[0, 3, 6, 9]} width={26} tickFormatter={(value) => formatBand(Number(value))} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => [formatBand(Number(value)), "Band"]} contentStyle={{ border: "1px solid #E5E7EB", borderRadius: 12, fontSize: 12, boxShadow: "0 14px 32px rgba(15,23,42,0.12)" }} />
                    <Area type="monotone" dataKey="score" stroke={primaryChartColor} strokeWidth={2.6} fill="url(#readingBandFill)" dot={{ r: 3.5, fill: primaryChartColor, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          <Card className="p-0">
            <div className="grid grid-cols-2 gap-2.5 p-3 sm:gap-3 sm:p-4 xl:grid-cols-4">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="flex flex-col rounded-2xl bg-slate-50 p-3.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", metric.iconClassName)}>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <p className="min-w-0 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{metric.label}</p>
                    </div>
                    <p className="mt-3 truncate text-2xl font-semibold tracking-tight text-[#0F172A]">{metric.value}</p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-[#64748B]">{metric.subtext}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.48fr_0.52fr]">
          <Card className="p-5">
            <CardTitle>Section Breakdown</CardTitle>
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-2xl bg-emerald-50/70 p-4">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Strengths
                </div>
                <div className="space-y-4">
	                  {strengthItems.length === 0 ? noDataMessage("Complete attempts to reveal strengths.") : strengthItems.map((item) => (
	                    <div key={item.label}>
                      <div className="mb-2 text-sm">
                        <p className="font-semibold text-slate-800">{item.label}</p>
                        <p className="mt-0.5 text-xs font-bold text-emerald-700">{Math.round(item.accuracy)}% accuracy</p>
                      </div>
                      <AccuracyBar value={item.accuracy} />
                    </div>
	                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-red-50/65 p-4">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Weak Areas
                </div>
                <div className="space-y-4">
	                  {weakItems.length === 0 ? noDataMessage("Complete attempts to reveal weak areas.") : weakItems.map((item) => (
	                    <div key={item.label}>
                      <div className="mb-2 text-sm">
                        <p className="font-semibold text-slate-800">{item.label}</p>
                        <p className="mt-0.5 text-xs font-bold text-red-600">{Math.round(item.accuracy)}% accuracy</p>
                      </div>
                      <AccuracyBar value={item.accuracy} color="bg-red-500" />
                    </div>
	                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card id="question-type-performance" className="scroll-mt-24 p-5">
            <CardTitle>Performance Trend</CardTitle>
            <div className="mt-4 h-[310px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceTrend} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEF2F7" />
                  <XAxis dataKey="date" padding={{ left: 20, right: 12 }} interval="preserveStartEnd" minTickGap={24} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="band" domain={[0, 9]} ticks={[0, 3, 6, 9]} width={26} tickFormatter={(value) => formatBand(Number(value))} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="accuracy" orientation="right" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={formatTrendValue} contentStyle={{ border: "1px solid #E5E7EB", borderRadius: 12, fontSize: 12, boxShadow: "0 14px 32px rgba(15,23,42,0.12)" }} />
                  <Line yAxisId="band" type="monotone" dataKey="band" name="Band Score" stroke="#4F46E5" strokeWidth={2.8} dot={{ r: 3.5, fill: "#4F46E5", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  <Line yAxisId="accuracy" type="monotone" dataKey="accuracy" name="Accuracy (%)" stroke="#10B981" strokeWidth={2.8} dot={{ r: 3.5, fill: "#10B981", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center justify-center gap-5 text-xs font-bold text-slate-500">
              <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 rounded-full bg-indigo-600" />Band Score</span>
              <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 rounded-full bg-emerald-500" />Accuracy (%)</span>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.9fr)]">
          <Card className="p-5">
            <CardTitle>Question Type Performance</CardTitle>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,1.75fr)_96px] gap-6 bg-slate-50 px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                <span>Question Type</span>
                <span>Accuracy</span>
                <span className="text-right">Attempts</span>
              </div>
              <div className="divide-y divide-slate-100">
	                {questionTypeItems.length === 0 ? (
                    <div className="p-5">{noDataMessage("No question type data yet.")}</div>
                  ) : questionTypeItems.map((item) => (
                  <div key={item.label} className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,1.75fr)_96px] items-center gap-6 px-5 py-5">
                    <p className="min-w-0 text-sm font-semibold text-slate-800">{item.label}</p>
                    <div className="flex w-full items-center gap-4 [&_.h-2]:h-2.5">
                      <span className="w-12 shrink-0 text-sm font-bold text-slate-900">{Math.round(item.accuracy)}%</span>
                      <div className="min-w-0 flex-1">
                        <AccuracyBar value={item.accuracy} color={progressColor(item.tone)} />
                      </div>
                    </div>
                    <p className="text-right text-sm font-bold text-slate-700">{item.attempts}</p>
                  </div>
	                ))}
              </div>
            </div>
          </Card>

          <div className="grid gap-4">
            <Card className="p-5">
              <CardTitle>{analysisTitle}</CardTitle>
              <div className="mt-4 divide-y divide-slate-100">
	                {focusItems.length === 0 ? noDataMessage("No focus data yet.") : focusItems.map((item) => {
	                  const Icon = focusIcon(item.key, Info);
	                  return (
                    <div key={item.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                          {item.subtext ? <p className="mt-0.5 text-xs font-medium text-[#64748B]">{item.subtext}</p> : null}
                        </div>
                      </div>
	                      {item.status === "needs_work" ? (
	                        <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">{item.valueLabel}</span>
	                      ) : (
	                        <span className="shrink-0 text-sm font-bold text-slate-900">{item.valueLabel}</span>
	                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5">
              <CardTitle>What to improve first</CardTitle>
              <div className="mt-4 space-y-3">
	                {priorityItems.length === 0 ? noDataMessage("Complete more attempts to build priorities.") : priorityItems.map((item) => (
                  <div key={item.number} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", item.badgeClassName)}>
                      {item.number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900">{item.title}</p>
                        <span className="text-xs font-bold text-red-500">{item.metric}</span>
                      </div>
                      <p className="mt-1 text-xs font-medium leading-5 text-[#64748B]">{item.focus}</p>
                    </div>
                  </div>
	                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function WritingAnalyticsContent({ analytics }: { analytics: DashboardAnalytics }) {
  // Single Task 1 / Task 2 tab drives both the descriptor label and the
  // breakdown table filter. (Previously the breakdown tab had no control, so
  // Task 2 was unreachable, and a separate prompt-type filter was dead.)
  const [activeTaskTab, setActiveTaskTab] = useState<WritingTaskTab>("task1");
  const writingBands = analytics.progressSeries
    .map((point) => point.writing)
    .filter((value): value is number => typeof value === "number");
  const averageWritingBand = roundWholeBand(average(writingBands.slice(-10)));
  const writingTrend = buildSevenDayBandTrend(analytics.progressSeries, "writing");
  const writingCriteria = analytics.writingCriteria;
  const writingMetricsData = [
    { label: "Average Band", value: formatBand(averageWritingBand), subtext: "of recent graded tasks", icon: Target, iconClassName: "bg-violet-50 text-violet-600" },
    { label: "Task Achievement", value: formatBand(writingCriteria?.taskAchievement ?? null), subtext: "Average criterion band", icon: CheckCircle2, iconClassName: "bg-emerald-50 text-emerald-600" },
    { label: "Avg. Completion Time", value: formatSeconds(analytics.timeAnalysis.avgTimePerTestSec), subtext: "Per writing submission", icon: Clock3, iconClassName: "bg-violet-50 text-violet-600" },
    {
      label: "Tasks Completed",
      value: String(
        analytics.performanceSummary.writing
          ? analytics.performanceSummary.writing.section1Count + analytics.performanceSummary.writing.section2Count + analytics.performanceSummary.writing.fullCount
          : 0
      ),
      subtext: "Graded and submitted tasks",
      icon: FileText,
      iconClassName: "bg-indigo-50 text-indigo-600",
    },
  ];
  const descriptorRows = [
    { label: activeTaskTab === "task1" ? "Task Achievement" : "Task Response", value: roundWholeBand(writingCriteria?.taskAchievement), color: "bg-emerald-500" },
    { label: "Coherence & Cohesion", value: roundWholeBand(writingCriteria?.coherenceCohesion), color: "bg-violet-500" },
    { label: "Lexical Resource", value: roundWholeBand(writingCriteria?.lexicalResource), color: "bg-indigo-500" },
    { label: "Grammatical Range & Accuracy", value: roundWholeBand(writingCriteria?.grammaticalRangeAccuracy), color: "bg-orange-500" },
  ];
  const writingPerformanceTrend = writingTrend.map((point) => ({
    date: point.date,
    band: point.score,
  }));
  const promptTypeRows: WritingPromptRow[] = analytics.sectionAnalysis
    .filter((item) => item.sectionNumber === (activeTaskTab === "task1" ? 1 : 2))
    .map((item) => ({
      promptType: item.label,
      band: averageWritingBand === null ? "—" : formatBand(averageWritingBand),
      attempts: String(item.attemptsCount || item.workedCount),
      issue: item.workedCount > 0 ? `${Math.round(item.accuracy)}% completion accuracy from stored results` : "No scored submissions yet",
      status: item.workedCount === 0 ? "Not practiced" : item.accuracy >= 70 ? "Good" : item.accuracy >= 50 ? "Needs practice" : "Limited data",
    }));
  const activeTaskRows = promptTypeRows;
  const activeDescriptors = descriptorRows;
  const writingStatus = skillStatus(averageWritingBand);
  const WritingStatusIcon = writingStatus.icon;
  const weakestCriterion = [...descriptorRows]
    .filter((item) => item.value !== null)
    .sort((a, b) => Number(a.value) - Number(b.value))[0];
  const writingPriorityItems = descriptorRows
    .filter((item) => item.value !== null)
    .sort((a, b) => Number(a.value) - Number(b.value))
    .slice(0, 3)
    .map((item, index) => ({
      number: index + 1,
      title: item.label,
      metric: `Band ${formatBand(item.value)}`,
      focus: `Focus: improve ${item.label.toLowerCase()} in the next writing submission.`,
      badgeClassName: index === 0 ? "bg-red-50 text-red-600" : index === 1 ? "bg-orange-50 text-orange-600" : "bg-amber-50 text-amber-700",
    }));

  return (
    <div className="analytics-night space-y-5 pb-10 text-[#0F172A]">
      <main className="space-y-5">
        <Link href="/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-violet-600">
          <ArrowLeft className="h-4 w-4 text-violet-600" />
          Back to Analytics
        </Link>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] border border-violet-100 bg-violet-50 text-violet-600">
              <PencilLine className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">Writing Analytics</h1>
              <p className="mt-2 text-sm font-medium text-[#64748B] sm:text-base">
                Track your Writing performance and find areas to improve
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[0.48fr_0.52fr]">
          <Card className="p-5">
            <div className="grid h-full gap-5 md:grid-cols-[150px_minmax(0,1fr)]">
              <BandScoreSummary
                band={formatBand(averageWritingBand)}
                status={writingStatus}
                StatusIcon={WritingStatusIcon}
                secondary={{
                  ...bandChangePill(analytics.improvementRate.delta ?? null),
                  text: (analytics.improvementRate.delta ?? null) === null ? "No previous data" : `${formatWholeBandDelta(analytics.improvementRate.delta)} from previous tasks`,
                }}
              />

              <div className="h-[200px] min-w-0 md:h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
	                  <AreaChart data={writingTrend} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="writingBandFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#EEF2F7" />
                    <XAxis dataKey="date" padding={{ left: 16, right: 8 }} interval="preserveStartEnd" minTickGap={20} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 9]} ticks={[0, 3, 6, 9]} width={26} tickFormatter={(value) => formatBand(Number(value))} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => [formatBand(Number(value)), "Band"]} contentStyle={{ border: "1px solid #E5E7EB", borderRadius: 12, fontSize: 12, boxShadow: "0 14px 32px rgba(15,23,42,0.12)" }} />
                    <Area type="monotone" dataKey="score" stroke="#7C3AED" strokeWidth={2.6} fill="url(#writingBandFill)" dot={{ r: 3.5, fill: "#7C3AED", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          <Card className="p-0">
            <div className="grid grid-cols-2 gap-2.5 p-3 sm:gap-3 sm:p-4 xl:grid-cols-4">
              {writingMetricsData.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="flex flex-col rounded-2xl bg-slate-50 p-3.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", metric.iconClassName)}>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <p className="min-w-0 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{metric.label}</p>
                    </div>
                    <p className="mt-3 truncate text-2xl font-semibold tracking-tight text-[#0F172A]">{metric.value}</p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-[#64748B]">{metric.subtext}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.38fr_0.62fr]">
          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <CardTitle>Band Descriptors Overview</CardTitle>
              <div className="flex gap-4 border-b border-slate-100">
                {([
                  ["task1", "Task 1"],
                  ["task2", "Task 2"],
                ] as const).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTaskTab(tab)}
                    className={cn(
                      "border-b-2 pb-2 text-sm font-bold transition",
                      activeTaskTab === tab ? "border-violet-600 text-violet-600" : "border-transparent text-slate-400 hover:text-slate-700",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 space-y-5">
	              {activeDescriptors.map((item) => (
	                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
	                    <p className="text-sm font-bold text-slate-950">{formatBand(item.value)}</p>
	                  </div>
	                  <AccuracyBar value={item.value === null ? 0 : (item.value / 9) * 100} color={item.color} />
	                </div>
	              ))}
            </div>
          </Card>

          <Card className="p-5">
            <CardTitle>Performance Trend</CardTitle>
            <div className="mt-4 h-[310px]">
              <ResponsiveContainer width="100%" height="100%">
	                <LineChart data={writingPerformanceTrend} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEF2F7" />
                  <XAxis dataKey="date" padding={{ left: 20, right: 12 }} interval="preserveStartEnd" minTickGap={24} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[1, 9]} ticks={[1, 3, 5, 7, 9]} width={26} tickFormatter={(value) => formatBand(Number(value))} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={formatTrendValue} contentStyle={{ border: "1px solid #E5E7EB", borderRadius: 12, fontSize: 12, boxShadow: "0 14px 32px rgba(15,23,42,0.12)" }} />
                  <Line type="monotone" dataKey="band" name="Overall Band" stroke="#7C3AED" strokeWidth={2.8} dot={{ r: 3.5, fill: "#7C3AED", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-5 text-xs font-bold text-slate-500">
              <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 rounded-full bg-violet-600" />Overall Band</span>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.9fr)]">
          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Task Performance Breakdown</CardTitle>
                <p className="mt-1 text-sm font-medium text-[#64748B]">
                  Compare your performance across Task 1 and Task 2 prompt types.
                </p>
              </div>
              <p className="text-xs font-semibold text-slate-400">Based on your recent Writing submissions</p>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <div className="hidden grid-cols-[minmax(0,1fr)_110px_80px_minmax(0,1.2fr)_130px] gap-4 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 md:grid">
                <span>Prompt Type</span>
                <span>Average Band</span>
                <span>Attempts</span>
                <span>Main Issue</span>
                <span>Status</span>
              </div>
              <div className="divide-y divide-slate-100">
	                {activeTaskRows.length === 0 ? (
                    <div className="p-4">{noDataMessage("No Task 1/Task 2 analytics yet.")}</div>
                  ) : activeTaskRows.map((item) => (
                  <div key={item.promptType} className="p-4 md:grid md:grid-cols-[minmax(0,1fr)_110px_80px_minmax(0,1.2fr)_130px] md:items-center md:gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.promptType}</p>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:hidden">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Average Band</p>
                          <p className={cn("mt-1 font-bold", item.band === "—" ? "text-slate-400" : "text-slate-900")}>{item.band}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Attempts</p>
                          <p className="mt-1 font-bold text-slate-900">{item.attempts} tasks</p>
                        </div>
                      </div>
                    </div>
                    <p className={cn("mt-3 text-sm font-bold md:mt-0", item.band === "—" ? "text-slate-400" : "text-slate-900")}>{item.band}</p>
                    <p className="mt-1 text-sm font-bold text-slate-700 md:mt-0">{item.attempts}<span className="ml-1 font-medium text-slate-400 md:hidden">tasks</span></p>
                    <p className="mt-3 text-sm font-medium leading-5 text-[#64748B] md:mt-0">{item.issue}</p>
                    <span className={cn("mt-3 inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-bold md:mt-0", writingStatusClassName(item.status))}>
                      {item.status}
                    </span>
                  </div>
	                ))}
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-xl bg-violet-50/70 px-4 py-3 text-sm font-semibold text-slate-700">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
	              <p>
                  {weakestCriterion
                    ? `${weakestCriterion.label} is currently the lowest stored criterion at Band ${formatBand(weakestCriterion.value)}.`
                    : "Submit graded writing tasks to build Task 1 and Task 2 analytics."}
                </p>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-4">
              <Link href="/writing/tasks" className="inline-flex items-center gap-1 text-sm font-bold text-violet-600 hover:text-violet-700">
                Choose a Writing Prompt <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/writing" className="inline-flex items-center gap-1 text-sm font-bold text-violet-600 hover:text-violet-700">
                Check My Essay <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Card>

          <div className="grid gap-4">
            <Card className="p-5">
              <CardTitle>Time & Writing Behavior</CardTitle>
              <div className="mt-4 divide-y divide-slate-100">
	                {[
                    { label: "Average Completion Time", value: formatSeconds(analytics.timeAnalysis.avgTimePerTestSec), subtext: "Per writing submission", icon: Clock3 },
                    { label: "Recommended Time", value: formatSeconds(analytics.timeAnalysis.recommendedTimeSec), subtext: "IELTS Writing task target", icon: Timer },
                    { label: "Time Management", value: analytics.timeAnalysis.timeManagementStatus, icon: CheckCircle, badge: analytics.timeAnalysis.timeManagementStatus === "On track" ? "green" : undefined },
                    { label: "Unanswered Questions", value: analytics.timeAnalysis.unansweredAvgPercent === null ? "No data" : formatPercent(analytics.timeAnalysis.unansweredAvgPercent), subtext: "Average per task", icon: ClipboardList },
                  ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                          {item.subtext ? <p className="mt-0.5 text-xs font-medium text-[#64748B]">{item.subtext}</p> : null}
                        </div>
                      </div>
                      {item.badge === "green" ? (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">{item.value}</span>
                      ) : (
                        <span className="shrink-0 text-sm font-bold text-slate-900">{item.value}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5">
              <CardTitle>What to improve first</CardTitle>
              <div className="mt-4 space-y-3">
	                {writingPriorityItems.length === 0 ? noDataMessage("Complete graded submissions to build priorities.") : writingPriorityItems.map((item) => (
                  <div key={item.number} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", item.badgeClassName)}>
                      {item.number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900">{item.title}</p>
                        <span className="text-xs font-bold text-violet-600">{item.metric}</span>
                      </div>
                      <p className="mt-1 text-xs font-medium leading-5 text-[#64748B]">{item.focus}</p>
                    </div>
                  </div>
	                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function SpeakingAnalyticsContent({ analytics }: { analytics: DashboardAnalytics }) {
  const speakingBands = analytics.progressSeries
    .map((point) => point.speaking)
    .filter((value): value is number => typeof value === "number");
  const averageSpeakingBand = roundWholeBand(average(speakingBands.slice(-10)));
  const speakingTrend = buildSevenDayBandTrend(analytics.progressSeries, "speaking");
  const speakingCriteria = analytics.speakingCriteria;
  const completedCount = (analytics.performanceSummary.speaking?.fullCount ?? 0)
    + (analytics.performanceSummary.speaking?.section1Count ?? 0)
    + (analytics.performanceSummary.speaking?.section2Count ?? 0)
    + (analytics.performanceSummary.speaking?.section3Count ?? 0)
    + (analytics.performanceSummary.speaking?.section4Count ?? 0);
  const criteriaRows = [
    { label: "Fluency & Coherence", value: roundWholeBand(speakingCriteria?.fluency), color: "bg-emerald-500" },
    { label: "Lexical Resource", value: roundWholeBand(speakingCriteria?.lexicalResource), color: "bg-blue-500" },
    { label: "Grammar Range & Accuracy", value: roundWholeBand(speakingCriteria?.grammar), color: "bg-orange-500" },
    { label: "Pronunciation", value: roundWholeBand(speakingCriteria?.pronunciation), color: "bg-violet-500" },
  ];
  const status = skillStatus(averageSpeakingBand);
  const StatusIcon = status.icon;
  const priorityItems = criteriaRows
    .filter((item) => item.value !== null)
    .sort((a, b) => Number(a.value) - Number(b.value))
    .slice(0, 3)
    .map((item, index) => ({
      number: index + 1,
      title: item.label,
      metric: `Band ${formatBand(item.value)}`,
      focus: `Focus: improve ${item.label.toLowerCase()} in your next speaking session.`,
      badgeClassName: index === 0 ? "bg-red-50 text-red-600" : index === 1 ? "bg-orange-50 text-orange-600" : "bg-amber-50 text-amber-700",
    }));

  return (
    <div className="analytics-night space-y-5 pb-10 text-[#0F172A]">
      <main className="space-y-5">
        <Link href="/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-violet-600">
          <ArrowLeft className="h-4 w-4 text-violet-600" />
          Back to Analytics
        </Link>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] border border-violet-100 bg-violet-50 text-violet-600 shadow-sm">
              <Mic className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">Speaking Analytics</h1>
              <p className="mt-2 text-sm font-medium text-[#64748B] sm:text-base">
                Track graded Speaking sessions, criterion bands, and recent movement.
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[0.48fr_0.52fr]">
          <Card className="p-5">
            <div className="grid h-full gap-5 md:grid-cols-[150px_minmax(0,1fr)]">
              <BandScoreSummary
                band={formatBand(averageSpeakingBand)}
                status={status}
                StatusIcon={StatusIcon}
                secondary={{
                  className: "bg-slate-100 text-slate-600",
                  icon: ClipboardList,
                  text: `${completedCount} graded sessions`,
                }}
              />

              <div className="h-[200px] min-w-0 md:h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={speakingTrend} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="speakingBandFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#F97316" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#EEF2F7" />
                    <XAxis dataKey="date" padding={{ left: 16, right: 8 }} interval="preserveStartEnd" minTickGap={20} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 9]} ticks={[0, 3, 6, 9]} width={26} tickFormatter={(value) => formatBand(Number(value))} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => [formatBand(Number(value)), "Band"]} contentStyle={{ border: "1px solid #E5E7EB", borderRadius: 12, fontSize: 12, boxShadow: "0 14px 32px rgba(15,23,42,0.12)" }} />
                    <Area type="monotone" dataKey="score" stroke="#F97316" strokeWidth={2.6} fill="url(#speakingBandFill)" dot={{ r: 3.5, fill: "#F97316", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          <Card className="p-0">
            <div className="grid grid-cols-2 gap-2.5 p-3 sm:gap-3 sm:p-4 xl:grid-cols-4">
              {[
                { label: "Fluency", value: formatBand(speakingCriteria?.fluency), icon: MessageCircle, iconClassName: "bg-emerald-50 text-emerald-600" },
                { label: "Lexical", value: formatBand(speakingCriteria?.lexicalResource), icon: FileText, iconClassName: "bg-blue-50 text-blue-600" },
                { label: "Grammar", value: formatBand(speakingCriteria?.grammar), icon: CheckCircle2, iconClassName: "bg-orange-50 text-orange-600" },
                { label: "Pronunciation", value: formatBand(speakingCriteria?.pronunciation), icon: Volume2, iconClassName: "bg-violet-50 text-violet-600" },
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="flex flex-col rounded-2xl bg-slate-50 p-3.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", metric.iconClassName)}>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <p className="min-w-0 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{metric.label}</p>
                    </div>
                    <p className="mt-3 truncate text-2xl font-semibold tracking-tight text-[#0F172A]">{metric.value}</p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-[#64748B]">Average criterion band</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.48fr_0.52fr]">
          <Card className="p-5">
            <CardTitle>Criterion Breakdown</CardTitle>
            <div className="mt-5 space-y-5">
              {completedCount === 0 ? noDataMessage("Complete a graded Speaking session to build analytics.") : criteriaRows.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    <p className="text-sm font-bold text-slate-950">{formatBand(item.value)}</p>
                  </div>
                  <AccuracyBar value={item.value === null ? 0 : (item.value / 9) * 100} color={item.color} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <CardTitle>What to improve first</CardTitle>
            <div className="mt-4 space-y-3">
              {priorityItems.length === 0 ? noDataMessage("Complete graded Speaking sessions to build priorities.") : priorityItems.map((item) => (
                <div key={item.number} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", item.badgeClassName)}>
                    {item.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">{item.title}</p>
                      <span className="text-xs font-bold text-orange-600">{item.metric}</span>
                    </div>
                    <p className="mt-1 text-xs font-medium leading-5 text-[#64748B]">{item.focus}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

function SkillAnalyticsPremiumGate({ subscriptionHref }: { subscriptionHref: string }) {
  return (
    <div className="analytics-night grid min-h-[calc(100vh-8rem)] place-items-center bg-[#F8FAFC] px-4 py-10 text-[#0F172A]">
      <div className="w-full max-w-xl rounded-[22px] border border-amber-200 bg-white p-7 text-center shadow-[0_24px_70px_-44px_rgba(154,52,18,0.45)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
          <Crown className="h-7 w-7" />
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-amber-600">Premium Analytics</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0F172A]">Skill analytics is a Premium feature</h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[#64748B]">
	          Upgrade to Premium to unlock detailed skill breakdowns, trends, and improvement priorities.
        </p>
        <Link
          href={subscriptionHref}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 text-sm font-bold text-white transition hover:bg-amber-600"
        >
          Upgrade to Premium
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function SkillAnalyticsClient({
  skill,
  initialAnalytics,
}: {
  skill: Skill;
  initialAnalytics: DashboardAnalytics;
}) {
  const { isPremium, isAuthenticated } = useAuthStore();
  const subscriptionHref = getSubscriptionPageHref(isAuthenticated);

  if (!isPremium) {
    return <SkillAnalyticsPremiumGate subscriptionHref={subscriptionHref} />;
  }

  if (skill === "reading") {
    return <SkillDetailContent variant="reading" analytics={initialAnalytics} />;
  }

  if (skill === "listening") {
    return <SkillDetailContent variant="listening" analytics={initialAnalytics} />;
  }

  if (skill === "writing") {
    return <WritingAnalyticsContent analytics={initialAnalytics} />;
  }

  if (skill === "speaking") {
    return <SpeakingAnalyticsContent analytics={initialAnalytics} />;
  }

  return (
    <div className="analytics-night space-y-5 pb-10 text-[#0F172A]">
      <Link href="/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-indigo-600">
        <ArrowLeft className="h-4 w-4 text-indigo-600" />
        Back to Analytics
      </Link>
      <div className="mt-6 rounded-[18px] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)]">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Skill Analytics</p>
        <h1 className="mt-2 text-3xl font-semibold capitalize tracking-tight text-[#0F172A]">{skill} Analytics</h1>
        <p className="mt-2 text-sm font-medium text-[#64748B]">Detailed analytics for this skill will appear here.</p>
      </div>
    </div>
  );
}
