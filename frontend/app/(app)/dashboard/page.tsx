import Link from "next/link";
import { ArrowRight, BookOpenText, ClipboardList, Headphones, Play, Target, Clock, PenSquare, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardCharts } from "@/components/charts/dashboard-charts";
import { getCatalogTests } from "@/lib/server-data";
import { getDashboardAnalytics, getUserAttempts } from "@/lib/server-me";
import { getWritingHistory, type WritingHistoryItem } from "@/lib/server-writing";
import { DashboardAverageCards } from "./dashboard-average-cards";
import { WelcomeHeader } from "./welcome-header";
import { ActivitySummary } from "./activity-summary";
import { cn } from "@/lib/utils";
import type { AttemptRow } from "@/lib/types";
import { pickQuickTests } from "./quick-tests";

interface InProgressTestCardState {
  title: string;
  progressPercent: number;
  answeredLabel: string;
  timingLabel: string;
  detailLabel: string;
  attemptId: string;
  type: string;
  mode: string;
}

type RecentActivityItem =
  | { kind: "attempt"; key: string; sortAt: string; attempt: AttemptRow }
  | { kind: "writing"; key: string; sortAt: string; submission: WritingHistoryItem };

function formatSecondsAsClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getInProgressTest(attempts: AttemptRow[]): InProgressTestCardState | null {
  const inProgressAttempt = attempts.find(a => a.status === "in_progress");
  if (!inProgressAttempt) return null;

  const totalQuestions = Math.max(0, inProgressAttempt.totalQuestions ?? 0);
  const answeredCount = Math.max(0, inProgressAttempt.answeredCount ?? 0);
  const progressPercent = Math.max(
    0,
    Math.min(
      inProgressAttempt.progressPercent ?? (totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0),
      100,
    ),
  );
  const timeSpentSec = Math.max(0, inProgressAttempt.timeSpentSec ?? 0);
  const timeLimitSeconds = Math.max(0, inProgressAttempt.timeLimitSeconds ?? 0);
  const remainingSeconds = timeLimitSeconds > 0 ? Math.max(0, timeLimitSeconds - timeSpentSec) : 0;
  const timingLabel = inProgressAttempt.mode === "exam" && timeLimitSeconds > 0
    ? formatSecondsAsClock(remainingSeconds)
    : inProgressAttempt.timeSpent;
  const answeredLabel = totalQuestions > 0
    ? `${Math.min(answeredCount, totalQuestions)}/${totalQuestions}`
    : String(answeredCount);
  const detailLabel = inProgressAttempt.mode === "exam"
    ? "Resume under exam conditions."
    : "Pick up exactly where you paused.";

  return {
    attemptId: inProgressAttempt.id,
    type: inProgressAttempt.type,
    mode: inProgressAttempt.mode,
    title: inProgressAttempt.testTitle,
    progressPercent,
    answeredLabel,
    timingLabel,
    detailLabel,
  };
}

export default async function DashboardPage() {
  const [attempts, analytics, writingHistory, catalogTests] = await Promise.all([
    getUserAttempts(),
    getDashboardAnalytics(),
    getWritingHistory().catch(() => ({ items: [], total: 0 })),
    getCatalogTests().catch(() => []),
  ]);
  const recentAttempts = attempts.filter((attempt) => attempt.status === "completed" || attempt.status === "submitted");
  const recentActivity: RecentActivityItem[] = [
    ...recentAttempts.map((attempt) => ({
      kind: "attempt" as const,
      key: attempt.id,
      sortAt: attempt.lastSavedAt,
      attempt,
    })),
    ...writingHistory.items.map((submission) => ({
      kind: "writing" as const,
      key: submission.submission_id,
      sortAt: submission.submitted_at ?? submission.graded_at ?? "",
      submission,
    })),
  ]
    .sort((left, right) => new Date(right.sortAt).getTime() - new Date(left.sortAt).getTime())
    .slice(0, 3);

  const attemptedTestIds = new Set(attempts.map((attempt) => attempt.testId));
  const featuredTests = pickQuickTests(
    catalogTests.filter((test) => test.type === "reading" || test.type === "listening"),
    attemptedTestIds,
    3,
  );

  const inProgressTest = getInProgressTest(attempts);

  const now = new Date();
  const hasTests = attempts.length > 0;
  const lastAttempt = hasTests ? attempts[0] : null;

  let daysSinceLast = 0;
  if (lastAttempt) {
    const lastDate = new Date(lastAttempt.date);
    if (!Number.isNaN(lastDate.getTime())) {
      daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
    }
  }

  const lastBand = lastAttempt && lastAttempt.band ? parseFloat(lastAttempt.band) : 0;

  // Mock weak type logic
  const weakType = analytics.errorDistribution[0]?.label ?? (lastAttempt?.type === "reading" ? "True / False / Not Given" : "Map / Diagram");
  const hasWeakType = analytics.errorDistribution.length > 0;

  let recTitle = "";
  let recDesc = "";
  let recBtnText = "";
  let recHref = "/tests";

  if (!hasTests) {
    recTitle = "Start your first test";
    recDesc = "Take your first IELTS mock test to establish your baseline score and identify your weak areas.";
    recBtnText = "Explore Tests";
  } else if (daysSinceLast > 3) {
    recTitle = "Get back on track";
    recDesc = `You haven't practiced in ${daysSinceLast} days. Consistency is key to improving your score.`;
    recBtnText = "Take a quick test";
  } else if (lastBand > 0 && lastBand < 6.0) {
    recTitle = `Practice more ${lastAttempt?.type} section`;
    recDesc = `Your last ${lastAttempt?.type} score was ${lastBand}. Try another test specifically for this section to improve.`;
    recBtnText = `Practice ${lastAttempt?.type}`;
    recHref = `/tests?type=${lastAttempt?.type}`;
  } else if (hasWeakType && lastBand >= 6.0 && lastBand < 7.5) {
    recTitle = `Improve ${weakType} questions`;
    recDesc = `Analytics show you lose points on ${weakType}. Focus your next practice on passage structure and techniques for this type.`;
    recBtnText = "Practice targeted skills";
    recHref = `/tests?type=${lastAttempt?.type}`;
  } else {
    recTitle = "Try a full mock test";
    recDesc = "You are scoring consistently well! Challenge yourself with a full mock test under strict exam conditions.";
    recBtnText = "Start Full Mock";
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-12">

      {/* 1. Welcome + Quick Action & Continue Test */}
      <div className="space-y-6">
        <div>
          <WelcomeHeader />
        </div>


        {/* Top Row: Recommended and Scores aligned in height */}
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 items-stretch">
          <div className="space-y-3">
            {inProgressTest ? (
              <Card className="relative min-h-[228px] overflow-hidden bg-blue-50 dark:bg-slate-950 border border-blue-100 dark:border-border/50 shadow-sm hover:shadow-md transition-all group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-80" />
                <div className="absolute top-0 right-0 p-2 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                  <Clock className="w-20 h-20 -rotate-12 text-blue-900 dark:text-white" />
                </div>
                <CardContent className="flex h-full p-3 relative z-10">
                  <div className="flex w-full flex-col justify-between gap-2">
                    <div className="flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <Badge variant="outline" className="bg-blue-100/50 dark:bg-white/10 text-blue-800 dark:text-white border-blue-200 dark:border-white/20 mb-1.5 font-bold tracking-wider uppercase text-[9px] backdrop-blur-sm">
                          In Progress
                        </Badge>
                        <h2 className="truncate text-base md:text-lg font-semibold tracking-tight text-blue-950 dark:text-white">
                          {inProgressTest.title}
                        </h2>
                        <p className="mt-1 text-blue-800/80 dark:text-white/70 font-medium text-[11px]">
                          {inProgressTest.detailLabel}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white/50 dark:bg-white/[0.04] px-2.5 py-1.5">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-blue-700/70 dark:text-white/50">
                            Progress
                          </p>
                          <p className="text-sm font-semibold text-blue-950 dark:text-white">
                            {inProgressTest.progressPercent}%
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-blue-700/70 dark:text-white/50">
                            Answers
                          </p>
                          <p className="text-sm font-semibold text-blue-950 dark:text-white">
                            {inProgressTest.answeredLabel}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-blue-700/70 dark:text-white/50">
                            Time
                          </p>
                          <p className="text-sm font-semibold text-blue-950 dark:text-white">
                            {inProgressTest.timingLabel}
                          </p>
                        </div>
                      </div>

                      <div className="mt-1.5 space-y-1">
                        <div className="h-1.5 w-full bg-blue-200/70 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-600 dark:bg-blue-400 transition-[width]"
                            style={{ width: `${inProgressTest.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-1.5">
                      <Button
                        asChild
                        className="w-fit bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white font-semibold shadow-md transition-all active:scale-95 text-[11px] h-7 rounded-lg px-3"
                      >
                        <Link href={`/exam-preview/${inProgressTest.type}?attemptId=${inProgressTest.attemptId}&mode=${inProgressTest.mode}&resume=${Date.now()}`}>
                          Continue <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="relative min-h-[228px] overflow-hidden bg-blue-50 dark:bg-slate-950 border border-blue-100 dark:border-border/50 shadow-sm hover:shadow-md transition-all group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-80" />
                <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                  <Target className="w-32 h-32 -rotate-12 text-blue-900 dark:text-white" />
                </div>
                <CardContent className="flex h-full flex-col justify-between p-4 md:p-5 relative z-10">
                  <div>
                    <Badge variant="outline" className="bg-blue-100/50 dark:bg-white/10 text-blue-800 dark:text-white border-blue-200 dark:border-white/20 mb-2 font-bold tracking-wider uppercase text-[9px] backdrop-blur-sm">
                      Recommended For You
                    </Badge>
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-1.5 text-blue-950 dark:text-white">{recTitle}</h2>
                    <p className="text-blue-800/80 dark:text-white/70 font-medium mb-4 text-xs max-w-md">
                      {recDesc}
                    </p>
                  </div>

                  <div className="flex justify-start pt-2">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 h-9 rounded-lg text-xs shadow-lg shadow-primary/20 transition-transform active:scale-95" asChild>
                      <Link href={recHref}>
                        <Play className="mr-1.5 h-4 w-4 fill-current" /> {recBtnText}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <ActivitySummary analytics={analytics} />
          </div>

          <div className="h-full">
            <DashboardAverageCards initialAnalytics={analytics} />
          </div>
        </div>

        {/* Second Row: Remaining widgets */}
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
          <div className="space-y-4">
            {/* Weekly Streak + Personal Bests */}
            <Card className="border-border/40 shadow-sm rounded-2xl bg-card/60 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  {/* Weekly Streak */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <h3 className="text-sm font-semibold text-foreground">
                        {analytics.personalBests.currentStreak > 0
                          ? `${analytics.personalBests.currentStreak} Day Streak 🔥`
                          : "Start Your Streak"}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-2 relative">
                      {/* Connecting line */}
                      <div className="absolute top-4 left-4 right-4 h-0.5 bg-muted/30 -z-10" />

                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                        const isActive = i < analytics.personalBests.currentStreak;
                        const isToday = i === new Date().getDay() - 1 || (new Date().getDay() === 0 && i === 6);
                        return (
                          <div key={day} className="flex flex-col items-center gap-2 flex-1">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all relative z-10 shadow-sm",
                                isActive
                                  ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white"
                                  : isToday
                                    ? "bg-background border-2 border-orange-500 text-orange-500"
                                    : "bg-muted/60 text-muted-foreground/40 border-2 border-transparent"
                              )}
                            >
                              {isActive ? <Flame className="h-3.5 w-3.5 fill-current" /> : i + 1}
                            </div>
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-tighter",
                              isActive ? "text-orange-600" : isToday ? "text-foreground" : "text-muted-foreground/40"
                            )}>
                              {day}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Streak Milestone */}
                    <div className="mt-4 p-2.5 rounded-xl bg-orange-500/5 border border-orange-500/10 flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-orange-700/80 dark:text-orange-400/80 flex items-center gap-1.5">
                        <Target className="h-3 w-3" />
                        Next Milestone: 7-Day Master
                      </p>
                      <span className="text-[10px] font-black text-orange-600 dark:text-orange-500 uppercase tracking-widest">
                        {analytics.personalBests.currentStreak}/7
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommended Next Step */}
            <Card className="border-border/40 shadow-sm relative overflow-hidden rounded-2xl group bg-card/40 hover:bg-card/80 transition-colors">
              {/* Decorative icon — right side */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 -rotate-12 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 hidden sm:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/recommended-icon.png" alt="" className="w-24 h-24 drop-shadow-lg blur-[0.5px]" />
              </div>
              <CardContent className="p-5 relative z-10 flex flex-col justify-center h-full">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="bg-primary/15 p-1.5 rounded-md">
                    <ClipboardList className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-primary">Recommended Next Step</h3>
                </div>
                <p className="font-semibold text-foreground text-base leading-tight mb-1.5">{recTitle}</p>
                <p className="text-xs font-medium text-muted-foreground mb-3 leading-5 max-w-md">
                  {recDesc}
                </p>
                <Button asChild size="sm" className="w-fit bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-md transition-transform active:scale-95">
                  <Link href={recHref}>{recBtnText} <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Quick Start */}
          <div className="flex flex-col gap-4">
            <Link href="/tests?type=reading" className="block">
              <Card className="bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40 transition-colors shadow-sm flex items-center p-4 cursor-pointer group rounded-2xl">
                <div className="bg-blue-500/10 p-3 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                  <BookOpenText className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-950 dark:text-blue-100 text-sm">Start Reading Test</h3>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600/70 dark:text-blue-400/80 mt-0.5">Academic · 60 min</p>
                </div>
                <ArrowRight className="ml-auto h-5 w-5 text-blue-500/50 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </Card>
            </Link>

            <Link href="/tests?type=listening" className="block">
              <Card className="bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 transition-colors shadow-sm flex items-center p-4 cursor-pointer group rounded-2xl">
                <div className="bg-emerald-500/10 p-3 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                  <Headphones className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-950 dark:text-emerald-100 text-sm">Start Listening Test</h3>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/80 mt-0.5">Academic · 30 min</p>
                </div>
                <ArrowRight className="ml-auto h-5 w-5 text-emerald-500/50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </Card>
            </Link>

            <Link href="/writing" className="block">
              <Card className="bg-violet-500/5 border-violet-500/20 hover:border-violet-500/40 transition-colors shadow-sm flex items-center p-4 cursor-pointer group rounded-2xl">
                <div className="bg-violet-500/10 p-3 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                  <PenSquare className="h-5 w-5 text-violet-600 dark:text-violet-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-violet-950 dark:text-violet-100 text-sm">Start Writing Task</h3>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600/70 dark:text-violet-400/80 mt-0.5">AI Graded · Task 1 &amp; 2</p>
                </div>
                <ArrowRight className="ml-auto h-5 w-5 text-violet-500/50 group-hover:text-violet-600 dark:group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
              </Card>
            </Link>
          </div>
        </div>
      </div>

      <DashboardCharts analytics={analytics} />

      {/* 4 & 5. Recent Activity & Featured Tests */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-8">

        {/* Left: Recent Activity */}
        <div className="min-w-0 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Recent Activity</h2>
            <Button variant="link" asChild className="text-primary font-bold px-0 h-auto">
              <Link href="/history">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>

          <Card className="border-border/40 shadow-sm overflow-hidden rounded-3xl bg-card/30">
            <div className="divide-y divide-border/40">
              {recentActivity.map((entry) =>
                entry.kind === "attempt" ? (
                  <div key={entry.key} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
                        entry.attempt.type === "reading" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      )}>
                        {entry.attempt.type === "reading" ? <BookOpenText className="h-6 w-6" /> : <Headphones className="h-6 w-6" />}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="truncate font-bold text-foreground text-[15px]" title={entry.attempt.testTitle}>{entry.attempt.testTitle}</h4>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <span>{entry.attempt.date}</span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                          <span className="text-foreground/70">{entry.attempt.mode}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-5 border-t sm:border-t-0 pt-4 sm:pt-0 border-border/40 mt-2 sm:mt-0 sm:ml-auto">
                      <div className="text-right">
                        <p className="text-base font-semibold text-foreground">
                          {entry.attempt.totalQuestions && entry.attempt.score !== "Pending"
                            ? `${entry.attempt.score}/${entry.attempt.totalQuestions}`
                            : entry.attempt.score}
                        </p>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Score</p>
                      </div>
                      <div className="text-right border-l border-border/50 pl-4">
                        <p className="text-base font-semibold text-primary">{entry.attempt.band ?? "-"}</p>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Band</p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="rounded-xl h-8 px-3 text-xs font-bold border-border/60 shadow-sm hover:bg-muted ml-2">
                        <Link href={`/attempts/${entry.attempt.id}/result`}>Review</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div key={entry.key} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner bg-violet-500/10 text-violet-600 dark:text-violet-400">
                        <PenSquare className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="truncate font-bold text-foreground text-[15px]" title={entry.submission.task_title}>{entry.submission.task_title}</h4>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <span>{entry.submission.task_type === "task_1" ? "task 1" : "task 2"}</span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                          <span className="text-foreground/70">{entry.submission.submitted_at ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(entry.submission.submitted_at)) : "-"}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-5 border-t sm:border-t-0 pt-4 sm:pt-0 border-border/40 mt-2 sm:mt-0 sm:ml-auto">
                      <div className="text-right">
                        <p className="text-base font-semibold text-foreground">{entry.submission.word_count}</p>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Words</p>
                      </div>
                      <div className="text-right border-l border-border/50 pl-4">
                        <p className="text-base font-semibold text-primary">
                          {String(entry.submission.status).toLowerCase() === "completed" && entry.submission.overall_band !== null
                            ? entry.submission.overall_band
                            : String(entry.submission.status).toLowerCase() === "failed"
                              ? "Failed"
                              : "Grading"}
                        </p>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Result</p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="rounded-xl h-8 px-3 text-xs font-bold border-border/60 shadow-sm hover:bg-muted ml-2">
                        <Link href={`/writing/submissions/${entry.submission.submission_id}/result`}>Review</Link>
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          </Card>
        </div>

        {/* Right: Featured / Quick Tests */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Quick Tests</h2>
            <Button variant="link" asChild className="text-primary font-bold px-0 h-auto">
              <Link href="/tests">Browse <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>

          <div className="space-y-3">
            {featuredTests.map(test => {
              const isReading = test.type === "reading";
              return (
                <Link key={test.id} href="/tests" className="block">
                  <Card className="p-4 border-border/40 shadow-sm hover:border-primary/30 transition-all hover:shadow-md cursor-pointer group rounded-2xl bg-card/30">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                        isReading ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      )}>
                        {isReading ? <BookOpenText className="h-5 w-5" /> : <Headphones className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="font-bold text-[14px] text-foreground truncate">{test.title}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          {test.source.replace("Official", "").trim()}
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                          {test.estimatedMinutes}m
                        </p>
                      </div>
                      <div className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm",
                        isReading ? "bg-blue-600 text-white dark:text-slate-950" : "bg-emerald-600 text-white dark:text-slate-950"
                      )}>
                        <Play className="h-4 w-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}
