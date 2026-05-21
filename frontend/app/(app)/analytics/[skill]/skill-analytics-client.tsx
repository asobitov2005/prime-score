"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, Headphones, MessageSquareQuote, PenSquare } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardAnalytics, TestType } from "@/lib/types";
import { useDashboardAnalytics } from "@/components/charts/use-dashboard-analytics";

type Skill = "reading" | "listening" | "writing" | "speaking";

const skillMeta = {
  reading: {
    label: "Reading",
    score: "3.0",
    status: "Needs focus",
    xp: "+20 XP this week",
    icon: BookOpen,
    accent: "text-blue-700 dark:text-blue-300",
    iconBg: "bg-blue-500/12",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    chart: "#2563EB",
    description: "Reading analytics focus on comprehension accuracy, passage pacing, and recent band movement.",
    fallbackTrend: [2.5, 2.5, 3.0, 3.0, 3.0],
  },
  listening: {
    label: "Listening",
    score: "3.0",
    status: "Needs focus",
    xp: "+80 XP this week",
    icon: Headphones,
    accent: "text-emerald-700 dark:text-emerald-300",
    iconBg: "bg-emerald-500/12",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    chart: "#059669",
    description: "Listening analytics show recent band changes, section consistency, and time-to-accuracy trends.",
    fallbackTrend: [2.0, 2.5, 2.5, 3.0, 3.0],
  },
  writing: {
    label: "Writing",
    score: "6.5",
    status: "Strength",
    xp: "+140 XP this week",
    icon: PenSquare,
    accent: "text-violet-700 dark:text-violet-300",
    iconBg: "bg-violet-500/12",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    chart: "#7C3AED",
    description: "Writing analytics track recent band performance and the overall direction of your written responses.",
    fallbackTrend: [5.5, 5.5, 6.0, 6.0, 6.5],
  },
  speaking: {
    label: "Speaking",
    score: "3.5",
    status: "Improving",
    xp: "+60 XP this week",
    icon: MessageSquareQuote,
    accent: "text-amber-700 dark:text-amber-300",
    iconBg: "bg-amber-500/12",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    chart: "#D97706",
    description: "Speaking analytics are currently estimated from your dashboard progression until dedicated speaking attempts land.",
    fallbackTrend: [2.5, 3.0, 3.0, 3.5, 3.5],
  },
} satisfies Record<Skill, {
  label: string;
  score: string;
  status: string;
  xp: string;
  icon: typeof BookOpen;
  accent: string;
  iconBg: string;
  badge: string;
  chart: string;
  description: string;
  fallbackTrend: number[];
}>;

function formatShortDate(value: string | null | undefined): string {
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

function getLastSkillPoint(analytics: DashboardAnalytics, skill: Exclude<Skill, "speaking">) {
  return [...analytics.progressSeries].reverse().find((point) => point[skill] !== null && point[skill] !== undefined);
}

function buildTrendData(analytics: DashboardAnalytics, skill: Skill) {
  if (skill === "speaking") {
    return skillMeta.speaking.fallbackTrend.map((value, index) => ({
      label: `W${index + 1}`,
      score: value,
    }));
  }

  const values = analytics.progressSeries
    .filter((point) => point[skill] !== null && point[skill] !== undefined)
    .slice(-5)
    .map((point, index) => ({
      label: point.label || `T${index + 1}`,
      score: point[skill] as number,
    }));

  if (values.length >= 2) {
    return values;
  }

  return skillMeta[skill].fallbackTrend.map((value, index) => ({
    label: `W${index + 1}`,
    score: value,
  }));
}

export default function SkillAnalyticsClient({
  skill,
  initialAnalytics,
}: {
  skill: Skill;
  initialAnalytics: DashboardAnalytics;
}) {
  const filter = skill === "speaking" ? "all" : (skill as TestType);
  const analyticsQuery = useDashboardAnalytics(initialAnalytics, filter);
  const analytics = analyticsQuery.data ?? initialAnalytics;
  const meta = skillMeta[skill];
  const Icon = meta.icon;
  const trendData = buildTrendData(analytics, skill);
  const lastPoint = skill === "speaking" ? null : getLastSkillPoint(analytics, skill);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Skill Analytics
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{meta.label}</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-muted-foreground">{meta.description}</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="overflow-hidden rounded-[1.6rem] border border-border/50 bg-white shadow-sm dark:bg-slate-950/75">
          <CardContent className="space-y-5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", meta.iconBg)}>
                <Icon className={cn("h-6 w-6", meta.accent)} />
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]", meta.badge)}>
                {meta.status}
              </span>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Current score</p>
              <p className="mt-2 text-[3rem] font-semibold leading-none tracking-tight text-foreground">{meta.score}</p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/70">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">This week</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{meta.xp}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/70">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Last test</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{skill === "speaking" ? "No speaking test yet" : formatShortDate(lastPoint?.occurredAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[1.6rem] border border-border/50 bg-white shadow-sm dark:bg-slate-950/75">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Recent trend</p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">Last five checkpoints</p>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.16)" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgb(100 116 139)", fontSize: 12, fontWeight: 700 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    domain={["dataMin - 0.5", "dataMax + 0.5"]}
                    tick={{ fill: "rgb(100 116 139)", fontSize: 11, fontWeight: 700 }}
                  />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toFixed(1)}`, "Band"]}
                    contentStyle={{
                      border: "1px solid rgba(148,163,184,0.22)",
                      borderRadius: 14,
                      boxShadow: "0 12px 28px rgba(15,23,42,0.12)",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={meta.chart}
                    strokeWidth={3}
                    dot={{ r: 4, fill: meta.chart, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: meta.chart, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
