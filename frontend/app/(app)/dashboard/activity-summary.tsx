"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowRight, BookOpen, Clock, Headphones, MessageSquareQuote, PenSquare, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DashboardAnalytics } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

interface ActivitySummaryProps {
  analytics: DashboardAnalytics;
}

interface StudyTimeCardProps extends ActivitySummaryProps {
  className?: string;
}

function formatHours(value: number | null | undefined): string {
  const safeHours = Math.max(0, Number(value ?? 0));
  return `${safeHours === 0 ? 0 : safeHours.toFixed(1)}h`;
}

function formatPlainHours(value: number | null | undefined): string {
  const safeHours = Math.max(0, Number(value ?? 0));
  return safeHours === 0 ? "0" : safeHours.toFixed(1);
}

function parseWeekLabelMonth(label: string): number | null {
  const parsed = new Date(`${label} ${new Date().getFullYear()}`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.getMonth();
}

function buildMonthlyStudyData(analytics: DashboardAnalytics) {
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

function StudyTimeTooltipCursor(props: { x?: number; y?: number; width?: number; height?: number }) {
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

export function ActivitySummary({ analytics }: ActivitySummaryProps) {
  const progressSeries = analytics.progressSeries;
  const buildTrend = (key: "reading" | "listening" | "writing", fallback: number[]) => {
    const values = progressSeries
      .map((point) => point[key])
      .filter((value): value is number => value !== null && value !== undefined)
      .slice(-5);

    return values.length >= 2 ? values : fallback;
  };

  const getLastTestDate = (key: "reading" | "listening" | "writing") => {
    const point = [...progressSeries].reverse().find((item) => item[key] !== null && item[key] !== undefined);
    return formatShortDate(point?.occurredAt);
  };

  const skillCards = [
    {
      id: "reading",
      label: "Reading",
      score: "3.0",
      status: "Needs focus",
      xp: "+20 XP this week",
      href: "/analytics/reading",
      lastTest: getLastTestDate("reading"),
      trend: buildTrend("reading", [2.5, 2.5, 3.0, 3.0, 3.0]),
      icon: BookOpen,
      accent: "text-blue-700 dark:text-blue-300",
      iconBg: "bg-blue-500/12",
      badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
      chart: "#2563EB",
    },
    {
      id: "listening",
      label: "Listening",
      score: "3.0",
      status: "Needs focus",
      xp: "+80 XP this week",
      href: "/analytics/listening",
      lastTest: getLastTestDate("listening"),
      trend: buildTrend("listening", [2.0, 2.5, 2.5, 3.0, 3.0]),
      icon: Headphones,
      accent: "text-emerald-700 dark:text-emerald-300",
      iconBg: "bg-emerald-500/12",
      badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      chart: "#059669",
    },
    {
      id: "writing",
      label: "Writing",
      score: "6.5",
      status: "Strength",
      xp: "+140 XP this week",
      href: "/analytics/writing",
      lastTest: getLastTestDate("writing"),
      trend: buildTrend("writing", [5.5, 5.5, 6.0, 6.0, 6.5]),
      icon: PenSquare,
      accent: "text-violet-700 dark:text-violet-300",
      iconBg: "bg-violet-500/12",
      badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
      chart: "#7C3AED",
    },
    {
      id: "speaking",
      label: "Speaking",
      score: "3.5",
      status: "Improving",
      xp: "+60 XP this week",
      href: "/analytics/speaking",
      lastTest: "No speaking test yet",
      trend: [2.5, 3.0, 3.0, 3.5, 3.5],
      icon: MessageSquareQuote,
      accent: "text-amber-700 dark:text-amber-300",
      iconBg: "bg-amber-500/12",
      badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
      chart: "#D97706",
    },
  ] as const;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Skill Performance</p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">Track your current band, weekly XP, and recent movement by skill.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {skillCards.map((skill) => {
          const Icon = skill.icon;
          const trendPoints = skill.trend;
          const max = Math.max(...trendPoints);
          const min = Math.min(...trendPoints);
          const range = Math.max(max - min, 0.5);
          const points = trendPoints.map((value, index) => {
            const x = (index / Math.max(trendPoints.length - 1, 1)) * 100;
            const y = 100 - ((value - min) / range) * 84 - 8;
            return `${x},${y}`;
          }).join(" ");

          return (
            <Card key={skill.id} className="overflow-hidden rounded-[1.4rem] border border-border/50 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-950/75">
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", skill.iconBg)}>
                    <Icon className={cn("h-5 w-5", skill.accent)} />
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]", skill.badge)}>
                    {skill.status}
                  </span>
                </div>

                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{skill.label}</p>
                    <p className="mt-1 text-[2rem] font-semibold leading-none tracking-tight text-foreground">{skill.score}</p>
                  </div>
                  <div className="w-[88px] shrink-0">
                    <svg viewBox="0 0 100 100" className="h-14 w-full overflow-visible" aria-hidden="true">
                      <polyline
                        points={points}
                        fill="none"
                        stroke={skill.chart}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.14"
                      />
                      <polyline
                        points={points}
                        fill="none"
                        stroke={skill.chart}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{skill.xp}</p>
                  <p className="text-xs font-medium text-muted-foreground">Last test: {skill.lastTest}</p>
                </div>

                <Link
                  href={skill.href}
                  className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-foreground transition hover:text-primary"
                >
                  View Analytics
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export function StudyTimeCard({ analytics, className }: StudyTimeCardProps) {
  const summary = analytics.performanceSummary;
  const studyTime = summary.studyTime;
  const createdAt = useAuthStore((state) => state.createdAt);
  const [range, setRange] = useState<"all_time" | "this_month" | "this_week">("all_time");
  const monthlyData = useMemo(() => buildMonthlyStudyData(analytics), [analytics]);
  const totalHours = studyTime.totalTimeSec / 3600;
  const thisWeekHours = (analytics.weeklyActivity.at(-1)?.timeSpentMin ?? 0) / 60;
  const previousWeekHours = (analytics.weeklyActivity.at(-2)?.timeSpentMin ?? 0) / 60;
  const thisMonthHours = monthlyData.at(-1)?.hours ?? 0;
  const previousMonthHours = monthlyData.at(-2)?.hours ?? 0;
  const joinedDate = createdAt ? new Date(createdAt) : null;
  const joinedTime = joinedDate && !Number.isNaN(joinedDate.getTime()) ? joinedDate.getTime() : null;
  const daysSinceJoined = joinedTime
    ? Math.max(1, Math.ceil((Date.now() - joinedTime) / (1000 * 60 * 60 * 24)))
    : 7;
  const dailyAverageHours = totalHours > 0
    ? totalHours / daysSinceJoined
    : thisWeekHours / 7;
  const previousDailyAverageHours = previousWeekHours / 7;
  const selectedHours = {
    all_time: totalHours,
    this_month: thisMonthHours,
    this_week: thisWeekHours,
  }[range];

  return (
    <Card className={cn("overflow-hidden rounded-[1.5rem] border border-sky-100 bg-white shadow-lg shadow-sky-950/5 dark:border-sky-500/20 dark:bg-slate-950/80", className)}>
      <CardContent className="flex h-full flex-col justify-between gap-2 p-3">
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="min-w-[142px]">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-sky-500/10 p-1.5">
                  <Clock className="h-3.5 w-3.5 text-sky-600" />
                </div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Study Time</h3>
              </div>
              <div className="mt-7 flex items-end gap-1.5">
                <span className="text-[2rem] font-semibold leading-none tracking-tight text-slate-950 dark:text-white">
                  {formatPlainHours(selectedHours)}
                </span>
                <span className="pb-1 text-sm font-semibold text-slate-500 dark:text-slate-400">h</span>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {range === "all_time" ? "Total study time" : range === "this_month" ? "Study time this month" : "Study time this week"}
              </p>
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex justify-end">
                <Select
                  value={range}
                  onChange={(event) => setRange(event.target.value as typeof range)}
                  className="h-8 w-[118px] rounded-xl border-sky-200 bg-sky-50 px-2 text-xs font-semibold text-sky-800 focus-visible:border-sky-400 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200"
                >
                  <option value="all_time">All time</option>
                  <option value="this_month">This month</option>
                  <option value="this_week">This week</option>
                </Select>
              </div>
              <div className="ml-auto mt-7 h-[72px] w-[260px] max-w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="18%">
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "rgb(100 116 139)", fontSize: 11, fontWeight: 700 }}
                    />
                    <Tooltip
                      cursor={<StudyTimeTooltipCursor />}
                      formatter={(value) => [`${Number(value).toFixed(1)}h`, "Study time"]}
                      contentStyle={{
                        border: "1px solid rgba(14,165,233,0.18)",
                        borderRadius: 12,
                        boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="hours" radius={[7, 7, 3, 3]} fill="#0EA5E9" maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "This week", value: formatHours(thisWeekHours), trend: thisWeekHours - previousWeekHours },
            { label: "This month", value: formatHours(thisMonthHours), trend: thisMonthHours - previousMonthHours },
            { label: "Daily average", value: formatHours(dailyAverageHours), trend: dailyAverageHours - previousDailyAverageHours },
          ].map((item) => {
            const isDown = item.trend < 0;
            const TrendIcon = isDown ? TrendingDown : TrendingUp;
            return (
            <div key={item.label} className="rounded-xl bg-sky-50 px-2.5 py-1.5 dark:bg-sky-500/10">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-sky-700/70 dark:text-sky-200/65">
                {item.label}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold tracking-tight text-slate-950 dark:text-white">
                <TrendIcon className={cn("h-3.5 w-3.5", isDown ? "text-rose-500" : "text-emerald-500")} />
                <span>{item.value}</span>
              </p>
            </div>
          );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
