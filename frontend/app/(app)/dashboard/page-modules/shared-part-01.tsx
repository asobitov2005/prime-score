import { ArrowRight, AttemptRow, LeaderboardPreviewSummary, Link, TestCatalogItem, WritingHistoryItem, getTestSourceLabel } from "./dependencies";



export interface InProgressTestCardState {
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

export type RecentActivityItem =
  | { kind: "attempt"; key: string; sortAt: string; attempt: AttemptRow }
  | { kind: "writing"; key: string; sortAt: string; submission: WritingHistoryItem };

export function formatSecondsAsClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatMinutesEstimate(totalSeconds: number): string {
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  return `${minutes} min`;
}

export function getInProgressTest(attempts: AttemptRow[]): InProgressTestCardState | null {
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

export function getDashboardBookmarkItem(test: TestCatalogItem) {
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

export function LeaderboardPreviewCard({ summary }: { summary: LeaderboardPreviewSummary }) {
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
