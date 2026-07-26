import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpenText, Brain, Clock, Gauge, Headphones, Play, Target, PenSquare } from "lucide-react";
import { BookmarkToggleButton } from "@/components/bookmark-toggle-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getCatalogTests } from "@/lib/server-data";
import { getDashboardActivity, getDashboardAnalytics, getUserAttempts, getWeeklyLeaderboardPreview, getXpSummary, type LeaderboardPreviewSummary } from "@/lib/server-me";
import { getWritingHistory, type WritingHistoryItem } from "@/lib/server-writing";
import { getTestSourceLabel } from "@/lib/test-source";
import { OverallBandKpiCard } from "./dashboard-average-cards";
import { WelcomeHeader } from "./welcome-header";
import { StudyTimeCard } from "./activity-summary";
import { StreakHeatmap } from "./streak-heatmap";
import { PremiumFeatureGate } from "./premium-feature-gate";
import { XpSummaryCard } from "./xp-summary-card";
import { SkillPerformance } from "./skill-performance";
import { cn } from "@/lib/utils";
import { buildWeaknessDiagnosis } from "@/lib/weakness-diagnosis";
import type { AttemptRow, TestCatalogItem } from "@/lib/types";
import { pickQuickTests } from "./quick-tests";

interface InProgressTestCardState {
  title: string;
  progressPercent: number;
  answeredLabel: string;
  timeSpentLabel: string;
  estimatedFinishLabel: string;
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

function formatMinutesEstimate(totalSeconds: number): string {
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  return `${minutes} min`;
}

function getInProgressTest(attempts: AttemptRow[]): InProgressTestCardState | null {
  const inProgressAttempt = attempts.find(a => a.status === "in_progress");
  if (!inProgressAttempt) return null;

  const totalQuestions = Math.max(0, inProgressAttempt.totalQuestions ?? 0);
  const answeredCount = Math.max(0, inProgressAttempt.answeredCount ?? 0);
  const computedProgress = totalQuestions > 0 ? Math.floor((Math.min(answeredCount, totalQuestions) / totalQuestions) * 100) : null;
  const progressPercent = Math.max(
    0,
    Math.min(
      computedProgress ?? Math.floor(inProgressAttempt.progressPercent ?? 0),
      100,
    ),
  );
  const timeSpentSec = Math.max(0, inProgressAttempt.timeSpentSec ?? 0);
  const timeLimitSeconds = Math.max(0, inProgressAttempt.timeLimitSeconds ?? 0);
  const remainingSeconds = timeLimitSeconds > 0 ? Math.max(0, timeLimitSeconds - timeSpentSec) : 0;
  const unansweredCount = totalQuestions > 0 ? Math.max(0, totalQuestions - answeredCount) : 0;
  const paceEstimateSeconds = answeredCount > 0 ? (timeSpentSec / answeredCount) * unansweredCount : 0;
  const estimatedFinishLabel = remainingSeconds > 0
    ? formatMinutesEstimate(remainingSeconds)
    : paceEstimateSeconds > 0
      ? formatMinutesEstimate(paceEstimateSeconds)
      : "—";
  const answeredLabel = totalQuestions > 0
    ? `${Math.min(answeredCount, totalQuestions)}/${totalQuestions}`
    : String(answeredCount);
  const detailLabel = "Pick up exactly where you paused.";

  return {
    attemptId: inProgressAttempt.id,
    type: inProgressAttempt.type,
    mode: inProgressAttempt.mode,
    title: inProgressAttempt.testTitle,
    progressPercent,
    answeredLabel,
    timeSpentLabel: timeSpentSec > 0 ? formatSecondsAsClock(timeSpentSec) : inProgressAttempt.timeSpent,
    estimatedFinishLabel,
    detailLabel,
  };
}

function getDashboardBookmarkItem(test: TestCatalogItem) {
  return {
    id: test.id,
    slug: test.slug,
    title: test.title,
    type: test.type,
    format: test.format,
    accessType: test.accessType,
    source: test.source,
    sourceLabel: getTestSourceLabel(test.source),
    description: test.description,
    questionCount: test.questionCount,
    estimatedMinutes: test.estimatedMinutes,
    href: `/tests/${test.slug || test.id}`,
    actionLabel: test.accessType === "premium" ? "Unlock" : "Open Test",
  };
}

function LeaderboardPreviewCard({ summary }: { summary: LeaderboardPreviewSummary }) {
  const rankLabel = summary.rank ? `#${summary.rank}` : "—";
  const topLabel = summary.topPercent ? `Top ${summary.topPercent}%` : "Not ranked yet";

  return (
    <section className="relative h-full overflow-hidden rounded-[1.2rem] border border-orange-200/60 bg-card p-4 text-foreground shadow-xl shadow-orange-950/8 dark:border-orange-500/20 dark:bg-slate-950/80 dark:shadow-black/30">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-orange-200/25 dark:bg-orange-500/10" />
      <div className="absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-amber-200/18 dark:bg-amber-500/8" />

      <div className="relative flex min-h-[142px] flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Your Rank (This Week)</p>
            <div className="mt-2">
              <p className="text-4xl font-semibold leading-none tracking-tight text-orange-600">{rankLabel}</p>
              <span className="mt-2 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {topLabel}
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/leaderboard"
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-orange-200/70 bg-orange-50/70 px-3 text-xs font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100/70 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:border-orange-400/40 dark:hover:bg-orange-500/15"
        >
          View Leaderboard
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const [attempts, analytics, writingHistory, catalogTests, activity, xpSummary, leaderboardPreview] = await Promise.all([
    getUserAttempts(),
    getDashboardAnalytics(),
    getWritingHistory().catch(() => ({ items: [], total: 0 })),
    getCatalogTests().catch(() => []),
    getDashboardActivity(),
    getXpSummary(),
    getWeeklyLeaderboardPreview(),
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

  const completedAttempts = attempts.filter(
    (attempt) => attempt.status === "completed" || attempt.status === "submitted",
  );
  const now = new Date();
  const hasTests = completedAttempts.length > 0;
  const lastAttempt = hasTests ? completedAttempts[0] : null;

  let daysSinceLast = 0;
  if (lastAttempt?.lastSavedAt) {
    const lastDate = new Date(lastAttempt.lastSavedAt);
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

  const weaknessDiagnosis = buildWeaknessDiagnosis(analytics, attempts, daysSinceLast);
  const diagnosisAccent = {
    critical: {
      ring: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
      dot: "bg-red-500",
      wash: "from-red-500/12 via-orange-500/8 to-transparent",
    },
    attention: {
      ring: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
      wash: "from-amber-500/12 via-blue-500/8 to-transparent",
    },
    steady: {
      ring: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
      wash: "from-emerald-500/12 via-blue-500/8 to-transparent",
    },
  }[weaknessDiagnosis.severity];

  return (
    <div className="space-y-5 pb-12">

      {/* 1. Welcome + Quick Action & Continue Test */}
      <div className="space-y-6">
        <div>
          <WelcomeHeader analytics={analytics} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_340px_210px] xl:items-stretch">
          <XpSummaryCard summary={xpSummary} />
          <OverallBandKpiCard initialAnalytics={analytics} />
          <LeaderboardPreviewCard summary={leaderboardPreview} />
        </div>

        {/* Top Row: Continue progress + study analytics */}
        <div className="space-y-3">
          <div className="grid gap-4 xl:grid-cols-[580px_minmax(0,1fr)] xl:items-stretch">
            {inProgressTest ? (
              <Card className="group relative min-h-[176px] w-full max-w-[580px] overflow-hidden rounded-2xl border border-sky-100 bg-sky-50 shadow-md shadow-sky-950/8 transition-shadow hover:shadow-lg hover:shadow-sky-950/12 dark:border-sky-500/20 dark:bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(14,165,233,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(219,234,254,0.5)_45%,rgba(186,230,253,0.42))] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(8,47,73,0.7))]" />
                <div className="absolute -right-10 -top-12 h-28 w-28 rounded-full bg-sky-300/18 dark:bg-sky-500/10" />
                <CardContent className="relative z-10 flex h-full flex-col justify-between gap-3 p-3 md:p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 flex-1">
                      <Badge variant="outline" className="mb-2 rounded-full border-sky-300/70 bg-white/75 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-sky-700 shadow-sm dark:border-sky-400/25 dark:bg-white/10 dark:text-sky-200">
                        IN PROGRESS
                      </Badge>
                      <div className="max-w-xl">
                        <h2 className="line-clamp-1 text-lg font-semibold leading-tight tracking-tight text-sky-950 dark:text-white">
                          {inProgressTest.title}
                        </h2>
                        <p className="mt-1 text-[13px] font-medium text-sky-800/75 dark:text-sky-100/70">
                          {inProgressTest.detailLabel}
                        </p>
                      </div>
                    </div>

                    <div className="relative mx-auto flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white/65 shadow-inner shadow-sky-900/10 dark:bg-white/10">
                      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 112 112" aria-hidden="true">
                        <circle cx="56" cy="56" r="44" fill="none" stroke="rgba(14,165,233,0.16)" strokeWidth="10" />
                        <circle
                          cx="56"
                          cy="56"
                          r="44"
                          fill="none"
                          stroke="url(#in-progress-test-progress)"
                          strokeLinecap="round"
                          strokeWidth="10"
                          strokeDasharray={276.46}
                          strokeDashoffset={276.46 - (276.46 * inProgressTest.progressPercent) / 100}
                          className="transition-[stroke-dashoffset] duration-300"
                        />
                        <defs>
                          <linearGradient id="in-progress-test-progress" x1="20" x2="96" y1="20" y2="96" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#38BDF8" />
                            <stop offset="0.55" stopColor="#2563EB" />
                            <stop offset="1" stopColor="#0EA5E9" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="text-center">
                        <p className="text-2xl font-semibold leading-none tracking-tight text-sky-950 dark:text-white">
                          {inProgressTest.progressPercent}%
                        </p>
                        <p className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-sky-700/65 dark:text-sky-100/55">
                          Progress
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    <div className="min-w-0 rounded-xl bg-white/72 px-2 py-2 shadow-sm shadow-sky-950/5 sm:px-3 dark:bg-white/[0.07]">
                      <p className="truncate text-[9px] font-bold uppercase tracking-[0.1em] text-sky-700/65 sm:tracking-[0.14em] dark:text-sky-100/55">Answers</p>
                      <p className="mt-0.5 truncate text-sm font-semibold tracking-tight text-sky-950 sm:text-base dark:text-white">{inProgressTest.answeredLabel}</p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-white/72 px-2 py-2 shadow-sm shadow-sky-950/5 sm:px-3 dark:bg-white/[0.07]">
                      <p className="truncate text-[9px] font-bold uppercase tracking-[0.1em] text-sky-700/65 sm:tracking-[0.14em] dark:text-sky-100/55">Time spent</p>
                      <p className="mt-0.5 truncate text-sm font-semibold tracking-tight text-sky-950 sm:text-base dark:text-white">{inProgressTest.timeSpentLabel}</p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-white/72 px-2 py-2 shadow-sm shadow-sky-950/5 sm:px-3 dark:bg-white/[0.07]">
                      <p className="truncate text-[9px] font-bold uppercase tracking-[0.1em] text-sky-700/65 sm:tracking-[0.14em] dark:text-sky-100/55">Est. finish</p>
                      <p className="mt-0.5 truncate text-sm font-semibold tracking-tight text-sky-950 sm:text-base dark:text-white">{inProgressTest.estimatedFinishLabel}</p>
                    </div>
                  </div>

                  <Button
                    asChild
                    className="h-9 w-full rounded-xl bg-sky-600 text-[13px] font-semibold text-white shadow-md shadow-sky-700/20 transition-colors hover:bg-sky-700 active:scale-[0.99] dark:bg-sky-500 dark:hover:bg-sky-400"
                  >
                    <Link href={`/exam-preview/${inProgressTest.type}?attemptId=${inProgressTest.attemptId}&mode=${inProgressTest.mode}&resume=${Date.now()}`}>
                      Continue Test <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="relative min-h-[228px] overflow-hidden bg-blue-50 dark:bg-slate-950 border border-blue-100 dark:border-border/50 shadow-sm hover:shadow-md transition-shadow group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-80" />
                <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                  <Target className="w-32 h-32 -rotate-12 text-blue-900 dark:text-white" />
                </div>
                <CardContent className="flex h-full flex-col justify-between p-4 md:p-5 relative z-10">
                  <div>
                    <Badge variant="outline" className="bg-blue-100/50 dark:bg-white/10 text-blue-800 dark:text-white border-blue-200 dark:border-white/20 mb-2 font-bold tracking-wider uppercase text-[9px]">
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

            <StudyTimeCard analytics={analytics} className="h-full min-h-[176px]" />
          </div>

        </div>

        <section className="[content-visibility:auto] [contain-intrinsic-size:420px]">
          <SkillPerformance
            analytics={analytics}
            attempts={attempts}
            writingHistory={writingHistory}
          />
        </section>

        {/* Second Row: Remaining widgets */}
        <div className="grid grid-cols-1 gap-6 items-start [content-visibility:auto] [contain-intrinsic-size:900px]">
          <div className="w-full">
            <StreakHeatmap
              activity={activity}
              currentStreak={analytics.personalBests.currentStreak}
              longestStreak={analytics.personalBests.longestStreak}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 items-start">
            <PremiumFeatureGate
              title="Weakness Diagnosis"
              description="Unlock detailed weak-area analysis, mistake patterns, and targeted next actions."
            >
              <Card className="relative h-full overflow-hidden rounded-3xl border-border/50 bg-card/80 shadow-sm">
                <div className={cn("absolute inset-0 bg-gradient-to-br", diagnosisAccent.wash)} />
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border border-border/40 bg-background/25" />
                <CardContent className="relative z-10 p-5 md:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl border border-primary/15 bg-primary/10 p-2.5 shadow-sm">
                        <Brain className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                          {weaknessDiagnosis.label}
                        </p>
                        <h3 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                          {weaknessDiagnosis.status === "Stable" || weaknessDiagnosis.status === "Baseline needed"
                            ? weaknessDiagnosis.title
                            : `Focus on ${weaknessDiagnosis.title}`}
                        </h3>
                        <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-muted-foreground">
                          {weaknessDiagnosis.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold", diagnosisAccent.ring)}>
                      <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", diagnosisAccent.dot)} />
                      {weaknessDiagnosis.status}
                    </Badge>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.72fr]">
                    <div className="rounded-3xl border border-border/50 bg-background/55 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                            Weak areas
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                            Based on enough answered questions to trust the signal
                          </p>
                        </div>
                        <span className="rounded-full bg-card px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                          Latest first
                        </span>
                      </div>

                      {weaknessDiagnosis.insights.length > 0 ? (
                        <div className="space-y-3">
                          {weaknessDiagnosis.insights.map((item, index) => (
                            <div key={item.label} className="space-y-1.5">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className={cn(
                                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                                    index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                                  )}>
                                    {index + 1}
                                  </span>
                                  <span className="truncate text-sm font-semibold text-foreground">{item.label}</span>
                                </div>
                                <span className="text-sm font-semibold text-foreground">{item.value}</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-[width]",
                                    item.scorePercent < 50
                                      ? "bg-red-500"
                                      : item.scorePercent < 70
                                        ? "bg-amber-500"
                                        : "bg-emerald-500",
                                  )}
                                  style={{ width: `${item.scorePercent}%` }}
                                />
                              </div>
                              <p className="text-[11px] font-medium text-muted-foreground">{item.detail}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-4 text-sm font-medium text-muted-foreground">
                          Complete one test to reveal your weakest question types.
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-between gap-3 rounded-3xl border border-border/50 bg-card/65 p-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-2xl bg-background/70 p-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span className="text-[9px] font-bold uppercase tracking-[0.12em]">
                              {weaknessDiagnosis.primaryMetricLabel}
                            </span>
                          </div>
                          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                            {weaknessDiagnosis.primaryMetric}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-background/70 p-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Gauge className="h-3.5 w-3.5" />
                            <span className="text-[9px] font-bold uppercase tracking-[0.12em]">
                              {weaknessDiagnosis.secondaryMetricLabel}
                            </span>
                          </div>
                          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                            {weaknessDiagnosis.secondaryMetric}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          Next action
                        </p>
                        <div className="mt-2 space-y-2">
                          {weaknessDiagnosis.focusItems.slice(0, 3).map((item) => (
                            <div key={item} className="flex items-center gap-2 text-xs font-semibold text-foreground">
                              <span className={cn("h-1.5 w-1.5 rounded-full", diagnosisAccent.dot)} />
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button asChild size="sm" className="mt-1 w-full rounded-xl font-semibold shadow-md transition-transform active:scale-95">
                        <Link href={weaknessDiagnosis.href}>
                          {weaknessDiagnosis.cta} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PremiumFeatureGate>

          </div>
        </div>
      </div>

      <section className="grid items-stretch gap-8 lg:grid-cols-[1.5fr_1fr] [content-visibility:auto] [contain-intrinsic-size:720px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Recent Activity</h2>
            <Button variant="link" asChild className="text-primary font-bold px-0 h-auto">
              <Link href="/history">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>

          <Card className="flex-1 border-border/40 shadow-sm overflow-hidden rounded-3xl bg-card/30">
            {recentActivity.length === 0 ? (
              <EmptyState
                icon="clock"
                title="No activity yet"
                description="Complete a Reading, Listening, or Writing task to build your activity feed."
                action={{ href: "/tests", label: "Start practice" }}
                compact
                className="h-full rounded-3xl border-0 bg-transparent shadow-none"
              />
            ) : (
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
                          <h4 className="max-w-full line-clamp-2 font-bold text-foreground text-[15px] sm:max-w-[170px] sm:line-clamp-1 lg:max-w-[210px]" title={entry.attempt.testTitle}>{entry.attempt.testTitle}</h4>
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
                          <h4 className="max-w-full line-clamp-2 font-bold text-foreground text-[15px] sm:max-w-[170px] sm:line-clamp-1 lg:max-w-[210px]" title={entry.submission.task_title}>{entry.submission.task_title}</h4>
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
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Quick Tests</h2>
            <Button variant="link" asChild className="text-primary font-bold px-0 h-auto">
              <Link href="/tests">Browse <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>

          <Card className="flex-1 overflow-hidden rounded-3xl border-border/40 bg-card/30 shadow-sm">
            {featuredTests.length === 0 ? (
              <EmptyState
                icon="book"
                title="No quick tests available"
                description="Published quick tests will appear here when they are available."
                action={{ href: "/tests", label: "Browse all tests" }}
                compact
                className="h-full rounded-3xl border-0 bg-transparent shadow-none"
              />
            ) : (
              <div className="divide-y divide-border/40">
                {featuredTests.map(test => {
                  const isReading = test.type === "reading";
                  const testHref = `/tests/${test.slug || test.id}`;
                  return (
                    <div key={test.id} className="p-5 transition-colors hover:bg-muted/30 group">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <Link href={testHref} className="flex min-w-0 flex-1 items-center gap-4">
                          <div className={cn(
                            "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                            isReading ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          )}>
                            {isReading ? <BookOpenText className="h-5 w-5" /> : <Headphones className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="font-bold text-[14px] text-foreground truncate">{test.title}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                              {getTestSourceLabel(test.source)}
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              {test.estimatedMinutes}m
                            </p>
                          </div>
                        </Link>
                        <BookmarkToggleButton item={getDashboardBookmarkItem(test)} className="h-9 w-9" iconClassName="h-4 w-4" />
                        <Link
                          href={testHref}
                          className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm",
                            isReading ? "bg-blue-600 text-white dark:text-slate-950" : "bg-emerald-600 text-white dark:text-slate-950"
                          )}
                          aria-label={`Open ${test.title}`}
                        >
                          <Play className="h-4 w-4 fill-current ml-0.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </section>

    </div>
  );
}
