import Link from "next/link";
import { ArrowRight, BookOpenText, Clock3, Headphones, PenSquare } from "lucide-react";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { MockSessions } from "@/components/marketing/mock-sessions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLandingFeaturedTests } from "@/lib/server-data";
import { getUserAttempts } from "@/lib/server-me";
import { getWritingHistory, type WritingHistoryItem } from "@/lib/server-writing";
import { landingFont } from "@/components/marketing/landing-font";
import type { AttemptRow } from "@/lib/types";

interface InProgressTest {
  title: string;
  progressPercent: number;
  answeredLabel: string;
  timeSpentLabel: string;
  attemptId: string;
  type: string;
  mode: string;
}

type RecentActivityItem =
  | { kind: "attempt"; key: string; sortAt: string; attempt: AttemptRow }
  | { kind: "writing"; key: string; sortAt: string; submission: WritingHistoryItem };

interface DashboardLoadResult<T> {
  value: T | null;
  failed: boolean;
}

async function loadDashboardData<T>(load: () => Promise<T>): Promise<DashboardLoadResult<T>> {
  try {
    return { value: await load(), failed: false };
  } catch {
    return { value: null, failed: true };
  }
}

function formatSecondsAsClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getInProgressTest(attempts: AttemptRow[]): InProgressTest | null {
  const attempt = attempts.find((item) => item.status === "in_progress");
  if (!attempt) return null;

  const total = Math.max(0, attempt.totalQuestions ?? 0);
  const answered = Math.max(0, attempt.answeredCount ?? 0);
  const calculated = total > 0 ? Math.floor((Math.min(answered, total) / total) * 100) : attempt.progressPercent ?? 0;
  const progressPercent = Math.max(0, Math.min(100, Math.floor(calculated)));
  return {
    title: attempt.testTitle,
    progressPercent,
    answeredLabel: total > 0 ? `${Math.min(answered, total)}/${total}` : String(answered),
    timeSpentLabel: attempt.timeSpentSec == null
      ? attempt.timeSpent
      : formatSecondsAsClock(attempt.timeSpentSec),
    attemptId: attempt.id,
    type: attempt.type,
    mode: attempt.mode,
  };
}

function getRecentActivity(attempts: AttemptRow[], writing: WritingHistoryItem[]): RecentActivityItem[] {
  return [
    ...attempts
      .filter((item) => item.status === "completed" || item.status === "submitted")
      .map((attempt) => ({
        kind: "attempt" as const,
        key: attempt.id,
        sortAt: attempt.lastSavedAt,
        attempt,
      })),
    ...writing.map((submission) => ({
      kind: "writing" as const,
      key: submission.submission_id,
      sortAt: submission.submitted_at ?? submission.graded_at ?? "",
      submission,
    })),
  ]
    .sort((left, right) => {
      const rightTime = Date.parse(right.sortAt) || 0;
      const leftTime = Date.parse(left.sortAt) || 0;
      return rightTime - leftTime;
    })
    .slice(0, 5);
}

function formatActivityDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function DashboardPage() {
  const [attemptsResult, writingResult, mockTests] = await Promise.all([
    loadDashboardData(() => getUserAttempts({ throwOnError: true })),
    loadDashboardData(() => getWritingHistory()),
    getLandingFeaturedTests(),
  ]);

  const attempts = attemptsResult.value ?? [];
  const writingHistory = writingResult.value?.items ?? [];
  const inProgressTest = getInProgressTest(attempts);
  const recentActivity = getRecentActivity(attempts, writingHistory);
  const unavailableSources = [
    attemptsResult.failed && "test history",
    writingResult.failed && "writing history",
  ].filter((value): value is string => Boolean(value));

  return (
    <div className={`${landingFont.className} space-y-7 pb-10`}>
      <DashboardGreeting />

      {unavailableSources.length > 0 ? (
        <div role="status" className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Some practice data could not load: {unavailableSources.join(", ")}. Refresh to try again.
        </div>
      ) : null}

      <MockSessions tests={mockTests} variant="dashboard" showBookingFirst />

      {inProgressTest ? (
        <section className="max-w-3xl" aria-label="Continue your test">
          <Card className="rounded-lg border-border bg-card shadow-none">
            <CardContent className="flex h-full flex-col justify-between gap-5 p-5 sm:p-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Continue your test</p>
                <h2 className="mt-2 line-clamp-2 text-lg font-semibold tracking-tight text-foreground">{inProgressTest.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Pick up where you left off.</p>
                <div className="mt-5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{inProgressTest.answeredLabel} answers</span>
                  <span className="flex items-center gap-1.5"><Clock3 size={14} aria-hidden="true" />{inProgressTest.timeSpentLabel}</span>
                  <span>{inProgressTest.progressPercent}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-label={`${inProgressTest.progressPercent}% complete`}>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${inProgressTest.progressPercent}%` }} />
                </div>
              </div>
              <Button asChild className="w-full rounded-md">
                <Link href={`/exam-preview/${inProgressTest.type}?attemptId=${inProgressTest.attemptId}&mode=${inProgressTest.mode}&resume=${Date.now()}`}>
                  Continue test <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section aria-labelledby="recent-activity-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Your work</p>
            <h2 id="recent-activity-title" className="mt-1 text-lg font-semibold tracking-tight text-foreground">Recent activity</h2>
          </div>
          <Button variant="link" asChild className="h-auto px-0 text-sm text-primary">
            <Link href="/history">View history <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>

        <Card className="overflow-hidden rounded-lg border-border bg-card shadow-none">
          {recentActivity.length === 0 ? (
            <div className="grid min-h-40 place-items-center px-5 py-8 text-center">
              <div>
                <Clock3 className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-foreground">No practice yet</h3>
                <p className="mt-1 text-xs text-muted-foreground">Your completed tests and Writing work will appear here.</p>
                <Link href="/#mock" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Start online practice <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentActivity.map((entry) => {
                if (entry.kind === "attempt") {
                  const isReading = entry.attempt.type === "reading";
                  const Icon = isReading ? BookOpenText : Headphones;
                  return (
                    <li key={entry.key} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent text-primary">
                        <Icon size={17} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium text-foreground">{entry.attempt.testTitle}</h3>
                        <p className="mt-1 text-[11px] capitalize text-muted-foreground">{entry.attempt.type} · {formatActivityDate(entry.sortAt)} · {entry.attempt.mode}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">Band <strong className="ml-1 font-semibold text-foreground">{entry.attempt.band ?? "-"}</strong></span>
                        <Link href={`/attempts/${entry.attempt.id}/result`} className="text-xs font-semibold text-primary">Review</Link>
                      </div>
                    </li>
                  );
                }

                const status = String(entry.submission.status).toLowerCase();
                const result = status === "completed" && entry.submission.overall_band !== null
                  ? String(entry.submission.overall_band)
                  : status === "failed" ? "Failed" : "Grading";
                return (
                  <li key={entry.key} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent text-primary">
                      <PenSquare size={17} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium text-foreground">{entry.submission.task_title}</h3>
                      <p className="mt-1 text-[11px] text-muted-foreground">{entry.submission.task_type === "task_1" ? "Writing Task 1" : "Writing Task 2"} · {formatActivityDate(entry.sortAt)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">Result <strong className="ml-1 font-semibold text-foreground">{result}</strong></span>
                      <Link href={`/writing/submissions/${entry.submission.submission_id}/result`} className="text-xs font-semibold text-primary">Review</Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
