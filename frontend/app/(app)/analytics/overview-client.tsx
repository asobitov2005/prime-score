"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight, BookOpenText, CalendarCheck, Clock3, Crown, Headphones, Mic, PencilLine, Target, Zap } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { roundIeltsBand } from "@/lib/ielts-band";
import { getSubscriptionPageHref } from "@/lib/subscription-navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import type { AttemptRow, DashboardAnalytics, XpSummary } from "@/lib/types";

type SkillKey = "reading" | "listening" | "writing" | "speaking";

type Props = {
  overall: DashboardAnalytics;
  reading: DashboardAnalytics;
  listening: DashboardAnalytics;
  writing: DashboardAnalytics;
  speaking: DashboardAnalytics;
  attempts: AttemptRow[];
  xpSummary: XpSummary;
};

function formatHours(seconds: number) {
  return `${(seconds / 3600).toFixed(1)}h`;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
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

function toLocalDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTrendDayLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildTenDayBandTrend(progressSeries: DashboardAnalytics["progressSeries"]) {
  const pointsByDay = new Map<string, DashboardAnalytics["progressSeries"]>();

  progressSeries.forEach((point) => {
    const occurredAt = new Date(point.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      return;
    }

    const dayKey = toLocalDayKey(occurredAt);
    pointsByDay.set(dayKey, [...(pointsByDay.get(dayKey) ?? []), point]);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 10 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (9 - index));
    const dayPoints = pointsByDay.get(toLocalDayKey(day)) ?? [];

    const reading = roundWholeBand(average(dayPoints.map((point) => point.reading).filter((value): value is number => typeof value === "number")));
    const listening = roundWholeBand(average(dayPoints.map((point) => point.listening).filter((value): value is number => typeof value === "number")));
    const writing = roundWholeBand(average(dayPoints.map((point) => point.writing).filter((value): value is number => typeof value === "number")));
    const speaking = roundWholeBand(average(dayPoints.map((point) => point.speaking).filter((value): value is number => typeof value === "number")));

    return {
      date: formatTrendDayLabel(day),
      overall: roundWholeBand(average([reading, listening, writing, speaking].filter((value): value is number => value !== null))) ?? 0,
      reading: reading ?? 0,
      listening: listening ?? 0,
      writing: writing ?? 0,
      speaking: speaking ?? 0,
    };
  });
}

function skillBand(analytics: DashboardAnalytics, key: "reading" | "listening" | "writing" | "speaking") {
  return roundWholeBand(average(
    analytics.progressSeries
      .map((point) => point[key])
      .filter((value): value is number => typeof value === "number")
      .slice(-10)
  ));
}

function skillAccuracy(analytics: DashboardAnalytics) {
  const practiced = analytics.questionTypeAnalysis.filter((item) => item.workedCount > 0);
  const worked = practiced.reduce((sum, item) => sum + item.workedCount, 0);
  const correct = practiced.reduce((sum, item) => sum + item.correctCount, 0);
  return worked > 0 ? (correct / worked) * 100 : null;
}

function skillBestBand(analytics: DashboardAnalytics, key: "reading" | "listening" | "writing" | "speaking") {
  const values = analytics.progressSeries
    .map((point) => point[key])
    .filter((value): value is number => typeof value === "number");
  return values.length ? roundWholeBand(Math.max(...values)) : null;
}

function skillStatus(score: number | null) {
  if (score === null) return { label: "No data", className: "border-slate-200 bg-slate-50 text-slate-500" };
  if (score >= 6.5) return { label: "Strength", className: "border-emerald-100 bg-emerald-50 text-emerald-600" };
  if (score >= 5) return { label: "Improving", className: "border-amber-100 bg-amber-50 text-amber-700" };
  return { label: "Needs focus", className: "border-red-100 bg-red-50 text-red-600" };
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold tracking-tight text-slate-950">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

function AnalyticsPremiumGate({ subscriptionHref }: { subscriptionHref: string }) {
  return (
    <div className="analytics-night analytics-overview grid min-h-[calc(100vh-8rem)] place-items-center bg-[#F8FAFC] px-4 py-10 text-slate-950">
      <Card className="w-full max-w-xl overflow-hidden rounded-[1.35rem] border-amber-200 bg-white shadow-[0_24px_70px_-44px_rgba(154,52,18,0.45)]">
        <CardContent className="p-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
            <Crown className="h-7 w-7" />
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-amber-600">Premium Analytics</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Analytics is available for Premium users</h1>
          <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-slate-500">
            Upgrade to Premium to unlock overall analytics, skill breakdowns, and trends.
          </p>
          <Button asChild className="mt-6 h-11 rounded-xl bg-amber-500 px-6 text-sm font-bold text-white hover:bg-amber-600">
            <Link href={subscriptionHref}>
              Upgrade to Premium
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AnalyticsOverviewClient({ overall, reading, listening, writing, speaking, attempts, xpSummary }: Props) {
  const { isPremium, isAuthenticated } = useAuthStore();
  const subscriptionHref = getSubscriptionPageHref(isAuthenticated);

  if (!isPremium) {
    return <AnalyticsPremiumGate subscriptionHref={subscriptionHref} />;
  }

  const readingBand = skillBand(reading, "reading");
  const listeningBand = skillBand(listening, "listening");
  const writingBand = skillBand(writing, "writing");
  const speakingBand = skillBand(speaking, "speaking");
  const overallBand = roundWholeBand(average([readingBand, listeningBand, writingBand, speakingBand].filter((value): value is number => value !== null)));
  const averageAccuracy = average([skillAccuracy(reading), skillAccuracy(listening)].filter((value): value is number => value !== null));
  const studyTimeSeconds = overall.performanceSummary.studyTime.totalTimeSec;
  const trendData = buildTenDayBandTrend(overall.progressSeries);
  const skills: Array<{
    key: SkillKey;
    title: string;
    score: number | null;
    accuracy: number | null;
    attempts: number;
    metricLabel: string;
    metricValue: string;
    icon: ComponentType<{ className?: string }>;
    color: string;
    iconBoxClassName: string;
    buttonClassName: string;
  }> = [
    {
      key: "reading",
      title: "Reading",
      score: readingBand,
      accuracy: skillAccuracy(reading),
      metricLabel: "Accuracy",
      metricValue: formatPercent(skillAccuracy(reading)),
      attempts: reading.performanceSummary.reading.fullCount + reading.performanceSummary.reading.section1Count + reading.performanceSummary.reading.section2Count + reading.performanceSummary.reading.section3Count,
      icon: BookOpenText,
      color: "#2563EB",
      iconBoxClassName: "border-blue-100 bg-blue-50 text-blue-600",
      buttonClassName: "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100",
    },
    {
      key: "listening",
      title: "Listening",
      score: listeningBand,
      accuracy: skillAccuracy(listening),
      metricLabel: "Accuracy",
      metricValue: formatPercent(skillAccuracy(listening)),
      attempts: listening.performanceSummary.listening.fullCount + listening.performanceSummary.listening.section1Count + listening.performanceSummary.listening.section2Count + listening.performanceSummary.listening.section3Count + listening.performanceSummary.listening.section4Count,
      icon: Headphones,
      color: "#10B981",
      iconBoxClassName: "border-emerald-100 bg-emerald-50 text-emerald-600",
      buttonClassName: "border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    },
    {
      key: "writing",
      title: "Writing",
      score: writingBand,
      accuracy: null,
      metricLabel: "Best Band",
      metricValue: formatBand(skillBestBand(writing, "writing")),
      attempts: writing.performanceSummary.writing ? writing.performanceSummary.writing.section1Count + writing.performanceSummary.writing.section2Count + writing.performanceSummary.writing.fullCount : 0,
      icon: PencilLine,
      color: "#7C3AED",
      iconBoxClassName: "border-violet-100 bg-violet-50 text-violet-600",
      buttonClassName: "border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100",
    },
    {
      key: "speaking",
      title: "Speaking",
      score: speakingBand,
      accuracy: null,
      metricLabel: "Best Band",
      metricValue: formatBand(skillBestBand(speaking, "speaking")),
      attempts: (speaking.performanceSummary.speaking?.fullCount ?? 0)
        + (speaking.performanceSummary.speaking?.section1Count ?? 0)
        + (speaking.performanceSummary.speaking?.section2Count ?? 0)
        + (speaking.performanceSummary.speaking?.section3Count ?? 0)
        + (speaking.performanceSummary.speaking?.section4Count ?? 0),
      icon: Mic,
      color: "#F97316",
      iconBoxClassName: "border-orange-100 bg-orange-50 text-orange-600",
      buttonClassName: "border-orange-100 bg-orange-50 text-orange-700 hover:bg-orange-100",
    },
  ];
  const radarData = skills.map((skill) => ({ skill: skill.title, you: skill.score ?? 0 }));
  const recentActivities = attempts.slice(0, 5);

  return (
    <div className="analytics-night analytics-overview -mx-1 space-y-5 bg-[#F8FAFC] pb-10 text-slate-950 sm:mx-0">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Analytics Overview</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 md:text-base">
          Track your real performance and improvement across IELTS skills.
        </p>
      </div>

      <Card className="rounded-[1.125rem] border-slate-200 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.42)]">
        <CardContent className="grid grid-cols-2 gap-2.5 p-3 sm:gap-3 sm:p-4 xl:grid-cols-5">
          {[
            { label: "Overall Band", value: formatBand(overallBand), detail: "Recent average", icon: Target, iconClassName: "bg-violet-50 text-violet-600" },
            { label: "Total XP", value: `${xpSummary.totalXp.toLocaleString()} XP`, detail: `Level ${xpSummary.level}`, icon: Zap, iconClassName: "bg-orange-50 text-orange-500" },
            { label: "Tests Completed", value: String(attempts.length), detail: "Submitted attempts", icon: CalendarCheck, iconClassName: "bg-emerald-50 text-emerald-500" },
            { label: "Study Time", value: formatHours(studyTimeSeconds), detail: "Recorded attempt time", icon: Clock3, iconClassName: "bg-purple-50 text-purple-600" },
            { label: "Average Accuracy", value: formatPercent(averageAccuracy), detail: "Reading and Listening", icon: Target, iconClassName: "bg-orange-50 text-orange-500" },
          ].map((metric, index) => {
            const Icon = metric.icon;
            const isOverall = index === 0;

            if (isOverall) {
              return (
                <div
                  key={metric.label}
                  className="col-span-2 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 xl:col-span-1 xl:flex-col xl:items-start xl:justify-center xl:gap-0"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl xl:h-9 xl:w-9", metric.iconClassName)}>
                      <Icon className="h-5 w-5 xl:h-[18px] xl:w-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold uppercase tracking-wide text-slate-500">{metric.label}</p>
                      <p className="truncate text-[11px] font-semibold text-slate-400">{metric.detail}</p>
                    </div>
                  </div>
                  <p className="shrink-0 text-4xl font-black tracking-tight text-slate-950 xl:mt-3 xl:text-2xl">{metric.value}</p>
                </div>
              );
            }

            return (
              <div key={metric.label} className="flex flex-col rounded-2xl bg-slate-50 p-3.5">
                <div className="flex items-center gap-2">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", metric.iconClassName)}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <p className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wide text-slate-500">{metric.label}</p>
                </div>
                <p className="mt-3 truncate text-2xl font-bold tracking-tight text-slate-950">{metric.value}</p>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">{metric.detail}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="rounded-[1.125rem] border-slate-200 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
          <CardContent className="p-5">
            <SectionHeader title="Skills Performance" subtitle="Current performance from completed attempts" />
            <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {skills.map((skill) => {
                const Icon = skill.icon;
                const status = skillStatus(skill.score);
                return (
                  <div key={skill.key} className="group flex h-full flex-col">
                    <div className="flex flex-1 flex-col gap-3 rounded-[1.1rem] border border-slate-100 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", skill.iconBoxClassName)}>
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-slate-950">{skill.title}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold tracking-tight text-slate-950">{formatBand(skill.score)}</p>
                          <span className="text-[11px] font-bold text-slate-400">Band</span>
                        </div>
                        <span className={cn("shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold", status.className)}>{status.label}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{skill.metricLabel}</p>
                          <p className="mt-1 text-sm font-bold text-slate-950">{skill.metricValue}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Attempts</p>
                          <p className="mt-1 text-sm font-bold text-slate-950">{skill.attempts}</p>
                        </div>
                      </div>
                    </div>
                    <Link href={`/analytics/${skill.key}`} className={cn("mt-2 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-bold transition", skill.buttonClassName)}>
                      View Analytics <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.125rem] border-slate-200 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
          <CardContent className="p-0">
            <div className="p-5 pb-0">
              <SectionHeader title="Skill Comparison" subtitle="Average band score" />
            </div>
            <div className="mt-4 h-[306px] w-full overflow-visible px-[5px] pb-5">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="70%" margin={{ top: 12, right: 14, bottom: 12, left: 14 }}>
                  <PolarGrid gridType="polygon" stroke="#E5E7EB" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: "#64748B", fontSize: 12, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 9]} tick={false} axisLine={false} />
                  <Radar name="You" dataKey="you" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.18} strokeWidth={3} />
                  <Tooltip formatter={(value) => [formatBand(Number(value)), "Band"]} contentStyle={{ border: "1px solid #E5E7EB", borderRadius: 14, boxShadow: "0 16px 36px rgba(15,23,42,0.12)" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,1fr)]">
        <Card className="rounded-[1.125rem] border-slate-200 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
          <CardContent className="p-5">
            <SectionHeader title="Band Score Trend" />
            <div className="mt-4 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEF2F7" />
                  <XAxis dataKey="date" padding={{ left: 16, right: 8 }} interval="preserveStartEnd" minTickGap={24} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[1, 9]} ticks={[1, 3, 5, 7, 9]} width={26} tickFormatter={(value) => formatBand(Number(value))} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value, name) => [formatBand(Number(value)), String(name)]} contentStyle={{ border: "1px solid #E5E7EB", borderRadius: 14, boxShadow: "0 16px 36px rgba(15,23,42,0.12)" }} />
                  <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 12 }} />
                  <Line type="monotone" dataKey="overall" name="Overall" stroke="#111827" strokeWidth={3} dot={{ r: 3, fill: "#111827", strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="reading" name="Reading" stroke="#2563EB" strokeWidth={2.6} dot={false} />
                  <Line type="monotone" dataKey="listening" name="Listening" stroke="#059669" strokeWidth={2.6} dot={false} />
                  <Line type="monotone" dataKey="writing" name="Writing" stroke="#7C3AED" strokeWidth={2.6} dot={false} />
                  <Line type="monotone" dataKey="speaking" name="Speaking" stroke="#F97316" strokeWidth={2.6} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.125rem] border-slate-200 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <SectionHeader title="Recent Activity" />
              <Link href="/history" className="text-sm font-bold text-violet-600 hover:text-violet-700">View all</Link>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {recentActivities.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm font-semibold text-slate-500">No completed attempts yet.</div>
              ) : recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">{activity.testTitle}</p>
                    <p className="text-xs font-semibold text-slate-500">{activity.type} · Band {formatBand(activity.band)}</p>
                  </div>
                  <p className="shrink-0 text-[11px] font-semibold text-slate-400">{activity.lastSavedAt}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
