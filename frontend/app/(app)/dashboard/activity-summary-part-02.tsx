"use client";

import { ArrowRight, BookOpen, Card, CardContent, Headphones, Link, MessageSquareQuote, PenSquare, cn, getAverageBand } from "./activity-summary-dependencies";
import { ActivitySummaryProps, formatShortDate } from "./activity-summary-part-01";

export function ActivitySummary({ analytics }: ActivitySummaryProps) {
  const progressSeries = analytics.progressSeries;
  const buildScore = (key: "reading" | "listening" | "writing") => {
    const score = getAverageBand(analytics, key);
    return score && score > 0 ? score.toFixed(1) : "—";
  };

  const buildStatus = (scoreText: string) => {
    if (scoreText === "—") return "Not started";
    const score = Number(scoreText);
    if (score < 5) return "Needs focus";
    if (score < 7) return "Improving";
    return "Strength";
  };

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

  const countThisWeek = (key: "reading" | "listening" | "writing") =>
    progressSeries.filter((point) => {
      if (point[key] === null || point[key] === undefined) return false;
      const date = new Date(point.occurredAt);
      if (Number.isNaN(date.getTime())) return false;
      const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }).length;

  const readingScore = buildScore("reading");
  const listeningScore = buildScore("listening");
  const writingScore = buildScore("writing");

  const skillCards = [
    {
      id: "reading",
      label: "Reading",
      score: readingScore,
      status: buildStatus(readingScore),
      xp: `+${countThisWeek("reading") * 20} XP this week`,
      href: "/analytics/reading",
      lastTest: getLastTestDate("reading"),
      trend: buildTrend("reading", [0, 0, 0, 0, 0]),
      icon: BookOpen,
      accent: "text-blue-700 dark:text-blue-300",
      iconBg: "bg-blue-500/12",
      badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
      chart: "#2563EB",
    },
    {
      id: "listening",
      label: "Listening",
      score: listeningScore,
      status: buildStatus(listeningScore),
      xp: `+${countThisWeek("listening") * 20} XP this week`,
      href: "/analytics/listening",
      lastTest: getLastTestDate("listening"),
      trend: buildTrend("listening", [0, 0, 0, 0, 0]),
      icon: Headphones,
      accent: "text-emerald-700 dark:text-emerald-300",
      iconBg: "bg-emerald-500/12",
      badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      chart: "#059669",
    },
    {
      id: "writing",
      label: "Writing",
      score: writingScore,
      status: buildStatus(writingScore),
      xp: `+${countThisWeek("writing") * 30} XP this week`,
      href: "/analytics/writing",
      lastTest: getLastTestDate("writing"),
      trend: buildTrend("writing", [0, 0, 0, 0, 0]),
      icon: PenSquare,
      accent: "text-violet-700 dark:text-violet-300",
      iconBg: "bg-violet-500/12",
      badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
      chart: "#7C3AED",
    },
    {
      id: "speaking",
      label: "Speaking",
      score: "—",
      status: "Not started",
      xp: "+0 XP this week",
      href: "/analytics/speaking",
      lastTest: "No speaking test yet",
      trend: [0, 0, 0, 0, 0],
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
