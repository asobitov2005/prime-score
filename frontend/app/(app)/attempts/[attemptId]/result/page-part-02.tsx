import { ArrowRight, Button, CheckCircle2, Clock3, Lightbulb, Link, LucideIcon, MinusCircle, ShieldAlert, Sparkles, XCircle, cn } from "./page-dependencies";
import { IntegrityViolationItem } from "./page-part-01";

export function ScoreSummaryCard({
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

export function PerformanceOverviewCard({
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

export function MetricBlock({
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

export function ExamIntegrityViolationsCard({ items }: { items: IntegrityViolationItem[] }) {
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
