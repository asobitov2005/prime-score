import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  History,
  Info,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getWritingDashboardSummary,
  getWritingHistory,
  getWritingLimits,
  listWritingTasks,
  resolveWritingAssetUrl,
  type WritingDashboardSummary,
  type WritingHistoryItem,
  type WritingLimitStatus,
  type WritingTaskListItem,
  type WritingTaskType,
} from "@/lib/server-writing";
import { cn } from "@/lib/utils";
import { CheckEssayButton, RandomPromptButton, ScrollToPromptsButton } from "./writing-page-actions";
import { PromptLibraryClient } from "./prompt-library-client";

export const dynamic = "force-dynamic";

interface WritingPageProps {
  searchParams?: {
    task_type?: string;
  };
}

export default async function WritingPage({ searchParams }: WritingPageProps) {
  const explicitTaskType: WritingTaskType | null =
    searchParams?.task_type === "task_2" ? "task_2" : searchParams?.task_type === "task_1" ? "task_1" : null;
  const [summary, history, task1TaskList, task2TaskList, limitStatus] = await Promise.all([
    getWritingDashboardSummary().catch(() => null as WritingDashboardSummary | null),
    getWritingHistory().catch(() => ({ items: [] as WritingHistoryItem[], total: 0 })),
    listWritingTasks({ task_type: "task_1", page_size: 100 }).catch(() => ({ items: [] as WritingTaskListItem[], total: 0 })),
    listWritingTasks({ task_type: "task_2", page_size: 100 }).catch(() => ({ items: [] as WritingTaskListItem[], total: 0 })),
    getWritingLimits().catch(() => null as WritingLimitStatus | null),
  ]);

  // When no tab is explicitly requested, open the task type that actually has
  // graded results so the performance stats aren't blank for users who only
  // practised one task type. Task 1 stays the default when both are empty.
  const task1HasData = summary?.task_1_average != null;
  const task2HasData = summary?.task_2_average != null;
  const activeTaskType: WritingTaskType =
    explicitTaskType ?? (!task1HasData && task2HasData ? "task_2" : "task_1");

  const task1Tasks = task1TaskList.items.map((task) => ({
    ...task,
    resolvedImageUrl: resolveWritingAssetUrl(task.image_url),
  }));
  const task2Tasks = task2TaskList.items.map((task) => ({
    ...task,
    resolvedImageUrl: null,
  }));
  const activeTasks = activeTaskType === "task_1" ? task1TaskList.items : task2TaskList.items;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="space-y-6 pb-10">
        <PageHeader />

        <EssayCheckCard activeTaskType={activeTaskType} tasks={activeTasks} limitStatus={limitStatus} />

        <PerformanceStrip summary={summary} history={history.items} activeTaskType={activeTaskType} limitStatus={limitStatus} />

        <PromptLibraryClient
          task1Tasks={task1Tasks}
          task2Tasks={task2Tasks}
          initialTaskType={activeTaskType}
          limitStatus={limitStatus}
        />
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 md:text-[1.85rem]">Writing Feedback</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 md:text-base">
          Practice IELTS Writing Task 1 and Task 2, then get AI-powered band feedback.
        </p>
      </div>
      <Button asChild variant="outline" className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900">
        <Link href="/writing/history">
          <History className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          View History
        </Link>
      </Button>
    </div>
  );
}

function EssayCheckCard({
  activeTaskType,
  tasks,
  limitStatus,
}: {
  activeTaskType: WritingTaskType;
  tasks: WritingTaskListItem[];
  limitStatus: WritingLimitStatus | null;
}) {
  return (
    <Card className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
      <CardContent className="px-6 pb-3 pt-6 md:px-8 md:pb-4 md:pt-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex gap-4 sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-50 dark:bg-orange-500/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/Poetry-amico.svg"
                alt=""
                aria-hidden="true"
                className="h-20 w-20 object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Check your essay</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Paste your answer, upload visuals, and get band score with detailed feedback.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <CheckEssayButton activeTaskType={activeTaskType} limitStatus={limitStatus} className="w-full sm:w-auto" />
            <ScrollToPromptsButton className="w-full sm:w-auto" />
            <RandomPromptButton tasks={tasks} limitStatus={limitStatus} className="w-full sm:w-auto" />
          </div>
        </div>

        <div className="-mx-6 mt-6 flex flex-col gap-2 border-t border-slate-200 px-6 pt-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between md:-mx-8 md:px-8">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{formatLimitStrip(limitStatus)}</p>
          {limitStatus?.daily_limit === null ? null : (
            <Link href="/subscription" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300">
              Upgrade for unlimited checks
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceStrip({
  summary,
  history,
  activeTaskType,
  limitStatus,
}: {
  summary: WritingDashboardSummary | null;
  history: WritingHistoryItem[];
  activeTaskType: WritingTaskType;
  limitStatus: WritingLimitStatus | null;
}) {
  const taskItems = history.filter((item) => item.task_type === activeTaskType);
  const gradedTaskItems = taskItems.filter((item) => {
    const status = String(item.status).toLowerCase();
    const band = typeof item.overall_band === "number" ? item.overall_band : Number(item.overall_band);
    return status === "completed" && Number.isFinite(band);
  });
  // Prefer the dashboard summary, which is computed across ALL of the user's
  // submissions. The history list is only a paginated slice, so it can miss the
  // real best/last band; use it purely as a fallback when the summary is absent.
  const summaryAverage = activeTaskType === "task_1" ? summary?.task_1_average : summary?.task_2_average;
  const summaryBest = activeTaskType === "task_1" ? summary?.task_1_best : summary?.task_2_best;
  const summaryLast = activeTaskType === "task_1" ? summary?.task_1_last : summary?.task_2_last;
  const historyAverage =
    gradedTaskItems.length > 0
      ? gradedTaskItems.reduce((sum, item) => sum + Number(item.overall_band), 0) / gradedTaskItems.length
      : null;
  const historyBest =
    gradedTaskItems.length > 0
      ? Math.max(...gradedTaskItems.map((item) => Number(item.overall_band)))
      : null;
  const historyLast = taskItems[0]?.overall_band ?? null;
  const averageBand = formatBand(summaryAverage ?? historyAverage);
  const bestBand = formatBand(summaryBest ?? historyBest);
  const lastBand = formatBand(summaryLast ?? historyLast);
  const freeChecks = limitStatus
    ? limitStatus.daily_limit === null
      ? "Unlimited"
      : `${limitStatus.remaining_today ?? 0}/${limitStatus.daily_limit}`
    : "0/5";

  const metrics = [
    { label: "Submissions", value: String(taskItems.length), icon: BarChart3, iconWrap: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300" },
    { label: "Average Band", value: averageBand, icon: Sparkles, iconWrap: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300" },
    { label: "Best Band", value: bestBand, icon: Trophy, iconWrap: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300" },
    { label: "Last Band", value: lastBand, icon: Target, iconWrap: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" },
    { label: "Free checks left", value: freeChecks, icon: Info, iconWrap: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300" },
  ];

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
      <CardContent className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold tracking-tight text-slate-950 dark:text-slate-50">Your Writing Performance</h2>
          <Link href="/analytics/writing" className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-300 dark:hover:text-orange-200">
            View detailed stats
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/70 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-4 dark:lg:bg-transparent",
                  index > 0 && "lg:border-l lg:border-slate-200 dark:lg:border-slate-800",
                )}
              >
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", metric.iconWrap)}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold leading-none tracking-tight text-slate-950 tabular-nums dark:text-slate-50">{metric.value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{metric.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function formatLimitStrip(limitStatus: WritingLimitStatus | null): string {
  if (!limitStatus) {
    return "You have 0 / 5 free checks left today.";
  }
  if (limitStatus.daily_limit === null) {
    return "You have unlimited writing checks today.";
  }
  return `You have ${limitStatus.remaining_today ?? 0} / ${limitStatus.daily_limit} free checks left today.`;
}

function formatBand(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(1) : "—";
}
