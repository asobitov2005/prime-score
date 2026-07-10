import { ArrowRight, BookOpen, Clock3, Link, ListChecks, TestType, cn } from "./page-dependencies";
import { QuestionTypeBreakdownItem, SectionBreakdownItem } from "./page-part-01";

export function SectionBreakdownCard({ items }: { items: SectionBreakdownItem[] }) {
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

export function QuestionTypeBreakdownCard({ items }: { items: QuestionTypeBreakdownItem[] }) {
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

export function RecommendedNextSteps({
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

export function ProgressBar({
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

export function buildInsightText(correctCount: number, incorrectCount: number, notAnsweredCount: number): string {
  if (notAnsweredCount > Math.max(correctCount, incorrectCount)) {
    return "Most questions were left unanswered. Focus on completing the test before improving accuracy.";
  }
  if (incorrectCount > correctCount) {
    return "Accuracy is the main issue. Review the question types where you lost the most marks.";
  }
  return "You completed most of the test. Keep reviewing mistakes to build consistency.";
}
