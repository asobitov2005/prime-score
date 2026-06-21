import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Lightbulb,
  ListChecks,
  MinusCircle,
  ShieldAlert,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { HistoryRetakeButton } from "@/app/(app)/history/retake-button";
import { AnswersOverviewCard } from "./answers-overview-card";
import { ResultBackGuard } from "./result-back-guard";
import { ResultViewTracker } from "./result-view-tracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_TIME_ZONE } from "@/lib/date-time";
import { getBackendAttempt, getBackendAttemptResult, getBackendAttemptReview, type BackendAttemptEvent, type BackendAttemptSnapshot } from "@/lib/server-attempts";
import { getTestSourceDetail } from "@/lib/test-source";
import type { TestType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AttemptResultPageProps {
  params: {
    attemptId: string;
  };
}

type BreakdownItem = {
  label: string;
  correct: number;
  total: number;
};

type SectionBreakdownItem = BreakdownItem & {
  title: string;
  reviewLabel: string;
  percent: number;
  href: string;
};

type QuestionTypeBreakdownItem = BreakdownItem & {
  title: string;
  reviewLabel: string;
  percent: number;
  href: string;
};

type ReviewTarget = {
  sectionId?: string;
  questionId?: string;
  questionType?: string;
};

type IntegrityViolationItem = {
  key: string;
  label: string;
  time: string;
};

export default async function AttemptResultPage({ params }: AttemptResultPageProps) {
  const result = await getBackendAttemptResult(params.attemptId).catch(() => null);
  if (!result) {
    notFound();
  }

  const attempt = await getBackendAttempt(params.attemptId).catch(() => null);
  const review = await getBackendAttemptReview(params.attemptId).catch(() => null);
  const answerItems = (review?.items ?? []).map((item) => ({
    question_id: item.question_id,
    question_number: item.question_number,
    question_label: item.question_label,
    answer_value: item.answer_value,
    is_correct: item.is_correct,
    correct_answers: item.correct_answers,
  }));
  const totalQuestions = Math.max(0, result.total_questions ?? 0);
  const correctCount = Math.max(0, result.raw_score ?? 0);
  const answeredCount = Math.max(0, result.answered_slots_count ?? result.answers_count ?? 0);
  const incorrectCount = Math.max(0, answeredCount - correctCount);
  const notAnsweredCount = Math.max(0, totalQuestions - answeredCount);
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const estimatedScore = formatBandScore(result.band_score, result.raw_score, result.test_type);
  const formatLabel = formatTestFormat(result.test_format);
  const sourceLabel = getTestSourceDetail(result.source, result.source_detail);
  const completedDate = formatCompletedDate(result.completed_at);
  const completedLabel = completedDate ? `Completed on ${completedDate}` : null;
  const reviewHref = `/exam-preview/${result.test_type === "listening" ? "listening" : "reading"}?attemptId=${params.attemptId}&mode=review&resume=${Date.now()}`;
  const skillLabel = result.test_type === "listening" ? "Listening" : "Reading";
  const sectionTargets = buildSectionReviewTargets(attempt?.test_snapshot ?? null);
  const sectionItems = buildSectionBreakdown(result.section_breakdown, result.test_type, totalQuestions, reviewHref, sectionTargets);
  const questionTypeItems = buildQuestionTypeBreakdown(result.question_type_breakdown, reviewHref);
  const scoreStatus = getScoreStatus(scorePercent);
  const xpEarned = formatXpAmount(result.xp_awarded_total ?? 0);
  const levelAfter = result.xp_level_after ?? 1;
  const currentStreak = result.xp_current_streak ?? 0;
  const integrityViolations = buildIntegrityViolationItems(result.events ?? []);

  return (
    <div className="mx-auto w-full max-w-[82rem] pb-1">
      <ResultBackGuard testType={result.test_type} />
      <ResultViewTracker
        attemptId={params.attemptId}
        testId={result.test_id}
        testTitle={result.test_title ?? "Unknown test"}
        testType={result.test_type}
        testFormat={result.test_format}
        rawScore={result.raw_score}
        totalQuestions={result.total_questions}
        bandScore={result.band_score}
      />

      <div className="space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 sm:text-[2rem]">
                {result.test_title ?? "Unknown test"}
              </h1>
              <Badge tone="outline" className="border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {formatLabel}
              </Badge>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              {sourceLabel}
              {completedLabel ? <span>{` · ${completedLabel}`}</span> : null}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
            <Button
              asChild
              className="h-11 rounded-[10px] bg-orange-500 px-5 text-sm font-semibold text-white shadow-[0_12px_24px_-16px_rgba(249,115,22,0.75)] hover:bg-orange-600 dark:text-white"
            >
              <Link href={reviewHref}>
                {"Review Mistakes"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <HistoryRetakeButton
              testId={result.test_id}
              testType={result.test_type}
              mode="practice"
              showModeChooser={!result.test_format || result.test_format === "full"}
              testTitle={result.test_title}
              testFormat={result.test_format}
              idleLabel={"Try Again"}
              className="h-11 rounded-[10px] border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-none hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            />
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
          <ScoreSummaryCard
            correctCount={correctCount}
            totalQuestions={totalQuestions}
            estimatedScore={estimatedScore}
            reviewHref={reviewHref}
            statusLabel={scoreStatus.label}
            statusClassName={scoreStatus.className}
            statusIcon={scoreStatus.icon}
          />
          <PerformanceOverviewCard
            correctCount={correctCount}
            incorrectCount={incorrectCount}
            notAnsweredCount={notAnsweredCount}
            timeTaken={formatTimeTaken(result.time_spent_sec ?? 0)}
            insight={buildInsightText(correctCount, incorrectCount, notAnsweredCount)}
            xpStrip={`+${xpEarned.toLocaleString("en-US")} XP earned · Level ${levelAfter} · ${currentStreak} day streak`}
          />
        </section>

        {integrityViolations.length > 0 ? (
          <ExamIntegrityViolationsCard items={integrityViolations} />
        ) : null}

        <SectionBreakdownCard items={sectionItems} />

        {questionTypeItems.length > 0 ? (
          <QuestionTypeBreakdownCard items={questionTypeItems} />
        ) : null}

        <AnswersOverviewCard items={answerItems} />

        <RecommendedNextSteps
          reviewHref={reviewHref}
          testType={result.test_type}
          skillLabel={skillLabel}
          notAnsweredCount={notAnsweredCount}
        />
      </div>
    </div>
  );
}

function ScoreSummaryCard({
  correctCount,
  totalQuestions,
  estimatedScore,
  reviewHref,
  statusLabel,
  statusClassName,
  statusIcon: StatusIcon,
}: {
  correctCount: number;
  totalQuestions: number;
  estimatedScore: string;
  reviewHref: string;
  statusLabel: string;
  statusClassName: string;
  statusIcon: LucideIcon;
}) {
  return (
    <article className="overflow-hidden rounded-[18px] border border-orange-100 bg-[linear-gradient(135deg,rgba(255,247,237,0.96),rgba(255,255,255,0.92)_52%,rgba(254,243,199,0.72))] p-5 shadow-[0_18px_42px_-34px_rgba(154,52,18,0.5)] dark:border-orange-500/20 dark:bg-[linear-gradient(135deg,rgba(67,20,7,0.5),rgba(15,23,42,0.92)_58%,rgba(67,20,7,0.35))]">
      <div className="rounded-2xl border border-white/80 bg-white/78 p-5 shadow-[0_12px_28px_-24px_rgba(154,52,18,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/50">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{"Reading Score"}</p>
        <div className="mt-4 flex items-end gap-2">
          <span className="text-7xl font-semibold leading-none tracking-[-0.05em] text-slate-950 dark:text-slate-50">
            {correctCount}
          </span>
          <span className="pb-2 text-2xl font-semibold text-slate-400 dark:text-slate-500">
            / {totalQuestions}
          </span>
        </div>
        <p className="mt-3 text-base font-semibold text-slate-700 dark:text-slate-200">
          {"Estimated Band"}: {estimatedScore}
        </p>

        <div className={cn("mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold", statusClassName)}>
          <StatusIcon className="h-3.5 w-3.5" />
          {statusLabel}
        </div>

        <Button
          asChild
          className="mt-6 h-11 w-full rounded-[10px] bg-orange-500 text-sm font-semibold text-white shadow-[0_14px_26px_-18px_rgba(249,115,22,0.8)] hover:bg-orange-600 dark:text-white"
        >
          <Link href={reviewHref}>
            {"Review Mistakes"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

function PerformanceOverviewCard({
  correctCount,
  incorrectCount,
  notAnsweredCount,
  timeTaken,
  insight,
  xpStrip,
}: {
  correctCount: number;
  incorrectCount: number;
  notAnsweredCount: number;
  timeTaken: string;
  insight: string;
  xpStrip: string;
}) {
  const metrics = [
    {
      label: "Correct",
      value: String(correctCount),
      icon: CheckCircle2,
      iconClassName: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    },
    {
      label: "Incorrect",
      value: String(incorrectCount),
      icon: XCircle,
      iconClassName: "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20",
    },
    {
      label: "Not answered",
      value: String(notAnsweredCount),
      icon: MinusCircle,
      iconClassName: "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    },
    {
      label: "Time taken",
      value: timeTaken,
      icon: Clock3,
      iconClassName: "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20",
    },
  ] as const;

  return (
    <article className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-900/70">
      <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">{"Performance Overview"}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricBlock
            key={metric.label}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
            iconClassName={metric.iconClassName}
          />
        ))}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm leading-6 text-sky-900 dark:border-sky-500/15 dark:bg-sky-500/10 dark:text-sky-100">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sky-600 ring-1 ring-sky-100 dark:bg-slate-950/60 dark:text-sky-300 dark:ring-sky-500/20">
          <Lightbulb className="h-4 w-4" />
        </span>
        <p className="font-medium">{insight}</p>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,rgba(255,247,237,0.9),rgba(254,243,199,0.6))] p-4 text-sm font-semibold text-orange-900 dark:border-orange-500/20 dark:bg-[linear-gradient(135deg,rgba(67,20,7,0.35),rgba(15,23,42,0.4))] dark:text-orange-100">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-orange-500 ring-1 ring-orange-100 dark:bg-slate-950/60 dark:text-orange-300 dark:ring-orange-500/20">
          <Sparkles className="h-4 w-4" />
        </span>
        <span>{xpStrip}</span>
      </div>
    </article>
  );
}

function MetricBlock({
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClassName: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/55 p-4 dark:border-slate-800 dark:bg-slate-950/35">
      <div className="flex items-center gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1", iconClassName)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xl font-semibold leading-none text-slate-950 dark:text-slate-50">{value}</p>
          <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ExamIntegrityViolationsCard({ items }: { items: IntegrityViolationItem[] }) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-red-200 bg-white shadow-[0_18px_42px_-34px_rgba(127,29,29,0.45)] dark:border-red-500/25 dark:bg-slate-900/70">
      <div className="flex flex-col gap-3 border-b border-red-100 bg-red-50/65 px-5 py-4 dark:border-red-500/15 dark:bg-red-500/10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/25">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-red-950 dark:text-red-100">Exam Integrity Violations</h2>
            <p className="mt-1 text-sm font-medium leading-6 text-red-700/80 dark:text-red-200/75">
              These actions would result in disqualification in a real exam environment.
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit shrink-0 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
          {items.length} Violation{items.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="divide-y divide-red-100 dark:divide-red-500/15">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{item.label}</p>
            </div>
            <time className="shrink-0 font-mono text-sm font-semibold text-slate-500 dark:text-slate-400">
              {item.time}
            </time>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionBreakdownCard({ items }: { items: SectionBreakdownItem[] }) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-900/70">
      <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">{"Section breakdown"}</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {`${item.correct} / ${item.total} correct`}
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.percent}%</span>
            </div>
            <ProgressBar value={item.percent} className="mt-4" tone={item.percent > 0 ? "green" : "gray"} />
            <Link
              href={item.href}
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-300 dark:hover:text-orange-200"
            >
              {item.reviewLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuestionTypeBreakdownCard({ items }: { items: QuestionTypeBreakdownItem[] }) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white shadow-[0_18px_42px_-34px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-900/70">
      <div className="px-6 py-5">
        <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Question type breakdown</h2>
      </div>
      <div className="px-6 pb-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <div
                key={item.title}
                className="grid gap-3 px-5 py-4 transition-colors hover:bg-orange-50/25 dark:hover:bg-orange-500/5 md:grid-cols-[minmax(0,1fr)_7rem_30rem_auto] md:items-center"
              >
                <div className="min-w-0">
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{item.title}</span>
                </div>

                <span className={cn(
                  "inline-flex w-[4.75rem] justify-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ring-1 md:justify-self-center",
                  item.correct === item.total
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"
                    : item.correct > 0
                      ? "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20"
                      : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
                )}>
                  {item.correct} / {item.total}
                </span>

                <div className="grid gap-2 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:items-center">
                  <span className="min-w-10 text-right text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {item.percent}%
                  </span>
                  <ProgressBar value={item.percent} tone={item.percent > 0 ? "orange" : "gray"} className="h-2.5" />
                </div>

                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-300 dark:hover:text-orange-200 md:justify-end"
                >
                  Review
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RecommendedNextSteps({
  reviewHref,
  testType,
  skillLabel,
  notAnsweredCount,
}: {
  reviewHref: string;
  testType: TestType;
  skillLabel: string;
  notAnsweredCount: number;
}) {
  const testsHref = `/tests?type=${testType}`;
  const recommendations = [
    {
      title: "Review unanswered questions",
      text: `You left ${notAnsweredCount} questions unanswered.`,
      href: reviewHref,
      icon: ListChecks,
      className: "bg-orange-50 text-orange-600 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20",
    },
    {
      title: "Practice test timing",
      text: "Try completing each passage within the time limit.",
      href: testsHref,
      icon: Clock3,
      className: "bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20",
    },
    {
      title: `Try another ${skillLabel} test`,
      text: "Build consistency with a similar test.",
      href: testsHref,
      icon: BookOpen,
      className: "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20",
    },
  ] as const;

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-900/70">
      <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">{"Recommended next steps"}</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {recommendations.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className="group flex min-h-[8rem] items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-orange-200 hover:bg-orange-50/30 dark:border-slate-800 dark:bg-slate-950/30 dark:hover:border-orange-500/25 dark:hover:bg-orange-500/5"
            >
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1", item.className)}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-950 dark:text-slate-50">{item.title}</span>
                <span className="mt-1.5 block text-sm leading-6 text-slate-500 dark:text-slate-400">{item.text}</span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ProgressBar({
  value,
  tone,
  className,
}: {
  value: number;
  tone: "green" | "orange" | "gray";
  className?: string;
}) {
  const progress = Math.min(100, Math.max(0, value));
  const fillClassName = tone === "green"
    ? "bg-emerald-500"
    : tone === "orange"
      ? "bg-orange-500"
      : "bg-slate-300 dark:bg-slate-700";

  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", className)}>
      <div className={cn("h-full rounded-full transition-all", fillClassName)} style={{ width: `${progress}%` }} />
    </div>
  );
}

function buildInsightText(correctCount: number, incorrectCount: number, notAnsweredCount: number): string {
  if (notAnsweredCount > Math.max(correctCount, incorrectCount)) {
    return "Most questions were left unanswered. Focus on completing the test before improving accuracy.";
  }
  if (incorrectCount > correctCount) {
    return "Accuracy is the main issue. Review the question types where you lost the most marks.";
  }
  return "You completed most of the test. Keep reviewing mistakes to build consistency.";
}

function buildSectionBreakdown(
  items: BreakdownItem[],
  testType: TestType,
  totalQuestions: number,
  reviewHref: string,
  targets: ReviewTarget[],
): SectionBreakdownItem[] {
  const sectionPrefix = testType === "listening" ? "Part" : "Passage";
  const fallbackTotals = testType === "listening" ? [10, 10, 10, 10] : [13, 13, 14];
  const sourceItems = items.length > 0
    ? items
    : fallbackTotals.map((total, index) => ({
        label: `${sectionPrefix} ${index + 1}`,
        correct: 0,
        total,
      }));

  const targetItems = testType === "reading" ? sourceItems.slice(0, 3) : sourceItems;
  const normalizedItems = targetItems.length > 0
    ? targetItems
    : fallbackTotals.map((total, index) => ({ label: `${sectionPrefix} ${index + 1}`, correct: 0, total }));

  return normalizedItems.map((item, index) => {
    const total = Math.max(0, item.total || fallbackTotals[index] || Math.ceil(totalQuestions / normalizedItems.length) || 0);
    const correct = Math.max(0, item.correct || 0);
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    const title = `${sectionPrefix} ${index + 1}`;

    return {
      label: item.label,
      title,
      reviewLabel: `Review ${title}`,
      correct,
      total,
      percent,
      href: withReviewTarget(reviewHref, targets[index] ?? {}),
    };
  });
}

function buildQuestionTypeBreakdown(
  items: BreakdownItem[],
  reviewHref: string,
): QuestionTypeBreakdownItem[] {
  return items
    .filter((item) => item.total > 0)
    .map((item) => {
      const total = Math.max(0, item.total || 0);
      const correct = Math.max(0, item.correct || 0);
      const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
      const title = formatQuestionTypeLabel(item.label);

      return {
        ...item,
        title,
        reviewLabel: `Review ${title}`,
        correct,
        total,
        percent,
        href: withReviewTarget(reviewHref, { questionType: item.label }),
      };
    });
}

function formatQuestionTypeLabel(value: string): string {
  return String(value || "Question type")
    .replace(/^(reading|listening)[_\s-]+/i, "")
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "mc") return "MC";
      if (lower === "tfng") return "TFNG";
      if (lower === "ynng") return "YNNG";
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function buildSectionReviewTargets(snapshot: BackendAttemptSnapshot | null): ReviewTarget[] {
  return (snapshot?.sections ?? []).map((section) => ({ sectionId: section.section_id }));
}

function withReviewTarget(baseHref: string, target: ReviewTarget): string {
  const params = new URLSearchParams();

  if (target.sectionId) {
    params.set("sectionId", target.sectionId);
  }
  if (target.questionId) {
    params.set("questionId", target.questionId);
  }
  if (target.questionType) {
    params.set("questionType", normalizeQuestionTypeKey(target.questionType));
  }

  const query = params.toString();
  if (!query) {
    return baseHref;
  }

  return `${baseHref}${baseHref.includes("?") ? "&" : "?"}${query}`;
}

function normalizeQuestionTypeKey(value: string | null | undefined): string {
  const normalized = String(value ?? "")
    .replace(/^(reading|listening)_/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  if (normalized === "tfng") return "true_false_not_given";
  if (normalized === "ynng") return "yes_no_not_given";
  if (normalized === "mcq" || normalized === "mc") return "multiple_choice";
  return normalized;
}

function getScoreStatus(scorePercent: number): {
  label: string;
  icon: LucideIcon;
  className: string;
} {
  if (scorePercent >= 80) {
    return {
      label: "Strong result",
      icon: CheckCircle2,
      className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    };
  }
  if (scorePercent >= 50) {
    return {
      label: "Developing",
      icon: Target,
      className: "bg-sky-50 text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20",
    };
  }
  return {
    label: "Needs more practice",
    icon: CircleHelp,
    className: "bg-orange-50 text-orange-700 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20",
  };
}

function formatXpAmount(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
}

function formatCompletedDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: APP_TIME_ZONE,
  }).format(parsed);
}

function formatViolationTime(value: string | null | undefined): string {
  if (!value) {
    return "--:--:--";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--:--:--";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: APP_TIME_ZONE,
  }).format(parsed);
}

function formatViolationLabel(eventType: string): string {
  switch (eventType) {
    case "violation_window_blur":
      return "Lost focus (another app opened or overlay)";
    case "violation_exit_fullscreen":
      return "Exited full screen mode";
    case "violation_tab_switch":
      return "Switched tab or browser was hidden";
    case "violation_devtools":
      return "Developer tools were opened";
    default:
      return "Exam integrity violation";
  }
}

function buildIntegrityViolationItems(events: BackendAttemptEvent[]): IntegrityViolationItem[] {
  return events
    .filter((event) => event.event_type.startsWith("violation_"))
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .map((event, index) => ({
      key: `${event.event_type}-${event.created_at}-${index}`,
      label: formatViolationLabel(event.event_type),
      time: formatViolationTime(event.created_at),
    }));
}

function formatTestFormat(value: string | null | undefined): string {
  if (!value || value === "full") {
    return "Full Test";
  }
  return value.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function deriveBandScore(
  value: number | string | null | undefined,
  rawScore: number | null | undefined,
  testType: TestType
): number | null {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue;
  }

  if (rawScore === null || rawScore === undefined) {
    return null;
  }

  const table = testType === "listening"
    ? [
        [39, 40, 9.0],
        [37, 38, 8.5],
        [35, 36, 8.0],
        [32, 34, 7.5],
        [30, 31, 7.0],
        [26, 29, 6.5],
        [23, 25, 6.0],
        [18, 22, 5.5],
        [16, 17, 5.0],
        [13, 15, 4.5],
        [11, 12, 4.0],
        [8, 10, 3.5],
        [6, 7, 3.0],
        [4, 5, 2.5],
        [3, 3, 2.0],
        [2, 2, 1.0],
      ]
    : [
        [39, 40, 9.0],
        [37, 38, 8.5],
        [35, 36, 8.0],
        [33, 34, 7.5],
        [30, 32, 7.0],
        [27, 29, 6.5],
        [23, 26, 6.0],
        [19, 22, 5.5],
        [15, 18, 5.0],
        [13, 14, 4.5],
        [10, 12, 4.0],
        [8, 9, 3.5],
        [6, 7, 3.0],
        [4, 5, 2.5],
        [3, 3, 2.0],
        [2, 2, 1.0],
      ];

  const normalizedRawScore = Math.max(0, Math.floor(rawScore));
  const match = table.find(([min, max]) => normalizedRawScore >= min && normalizedRawScore <= max);
  return match ? match[2] : null;
}

function formatBandScore(
  value: number | string | null | undefined,
  rawScore: number | null | undefined,
  testType: TestType
): string {
  const derivedBandScore = deriveBandScore(value, rawScore, testType);
  if (derivedBandScore === null) {
    return "—";
  }
  return derivedBandScore.toFixed(1);
}

function formatTimeTaken(value: number): string {
  const totalSeconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
