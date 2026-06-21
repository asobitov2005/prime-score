"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Circle,
  Clock3,
  FileText,
  Globe2,
  HelpCircle,
  ImageIcon,
  LineChart,
  MessageSquare,
  PieChart,
  Scale,
  Sparkles,
  Table2,
  Target,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { WritingLimitStatus, WritingQuestionSubtype, WritingTaskListItem, WritingTaskType } from "@/lib/server-writing";
import { cn } from "@/lib/utils";
import { WritingLimitLink } from "./writing-limit-gate";

type PromptTask = WritingTaskListItem & {
  resolvedImageUrl?: string | null;
};

interface FilterItem {
  value: WritingQuestionSubtype;
  label: string;
  icon: React.ElementType;
  iconClassName: string;
}

const TASK_1_FILTERS: FilterItem[] = [
  { value: "bar_chart", label: "Bar Chart", icon: BarChart3, iconClassName: "text-sky-500" },
  { value: "line_graph", label: "Line Graph", icon: LineChart, iconClassName: "text-violet-500" },
  { value: "pie_chart", label: "Pie Chart", icon: PieChart, iconClassName: "text-amber-500" },
  { value: "table", label: "Table", icon: Table2, iconClassName: "text-emerald-500" },
  { value: "process", label: "Process", icon: FileText, iconClassName: "text-rose-500" },
  { value: "map", label: "Map", icon: Globe2, iconClassName: "text-blue-500" },
  { value: "two_charts", label: "Two Charts", icon: TrendingUp, iconClassName: "text-teal-500" },
];

const TASK_2_FILTERS: FilterItem[] = [
  { value: "opinion", label: "Opinion Essay", icon: MessageSquare, iconClassName: "text-violet-500" },
  { value: "advantages_disadvantages", label: "Advantages & Disadvantages", icon: Scale, iconClassName: "text-sky-500" },
  { value: "discussion", label: "Discussion Essay", icon: BookOpen, iconClassName: "text-emerald-500" },
  { value: "problem_solution", label: "Problem & Solution", icon: HelpCircle, iconClassName: "text-amber-500" },
  { value: "two_part", label: "Two-Part Question", icon: Sparkles, iconClassName: "text-rose-500" },
  { value: "causes_effects", label: "Causes & Effects", icon: TrendingUp, iconClassName: "text-orange-500" },
  { value: "direct_question", label: "Direct Question", icon: Circle, iconClassName: "text-blue-500" },
];

export function PromptLibraryClient({
  task1Tasks,
  task2Tasks,
  initialTaskType,
  limitStatus,
}: {
  task1Tasks: PromptTask[];
  task2Tasks: PromptTask[];
  initialTaskType: WritingTaskType;
  limitStatus: WritingLimitStatus | null;
}) {
  const [activeTaskType, setActiveTaskType] = useState<WritingTaskType>(initialTaskType);
  const [activeSubtype, setActiveSubtype] = useState<WritingQuestionSubtype | null>(null);
  const tasksForType = activeTaskType === "task_1" ? task1Tasks : task2Tasks;
  const filters = activeTaskType === "task_1" ? TASK_1_FILTERS : TASK_2_FILTERS;
  const allLabel = activeTaskType === "task_1" ? "All Types" : "All Topics";
  const counts = useMemo(() => buildSubtypeCounts(tasksForType), [tasksForType]);
  const visibleTasks = activeSubtype ? tasksForType.filter((task) => task.question_subtype === activeSubtype) : tasksForType;

  return (
    <section id="prompt-library" className="space-y-4 scroll-mt-24">
      <div className="grid border-b border-slate-200 dark:border-slate-800 sm:grid-cols-2">
        {([
          ["task_1", "Academic Task 1"],
          ["task_2", "Academic Task 2"],
        ] as const).map(([taskType, label]) => {
          const isActive = activeTaskType === taskType;
          return (
            <button
              key={taskType}
              type="button"
              onClick={() => {
                setActiveTaskType(taskType);
                setActiveSubtype(null);
              }}
              className={cn(
                "relative flex h-12 items-center justify-center text-sm font-semibold transition-colors",
                isActive ? "text-orange-600 dark:text-orange-300" : "text-slate-700 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100",
              )}
            >
              {label}
              {isActive ? <span className="absolute inset-x-8 bottom-[-1px] h-0.5 rounded-full bg-orange-500" /> : null}
            </button>
          );
        })}
      </div>

      <Card className="rounded-3xl border-border/60 bg-card/70 shadow-sm">
        <CardContent className="space-y-3 p-4">
          <div className="space-y-2 pt-1">
            <p className="px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Question type</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              <button
                type="button"
                onClick={() => setActiveSubtype(null)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200",
                  !activeSubtype
                    ? "border-orange-500 bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                    : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-orange-200 hover:bg-orange-50 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:shadow-none dark:hover:border-orange-500/35 dark:hover:bg-orange-500/10 dark:hover:text-orange-200",
                )}
              >
                <Circle className="h-3 w-3" />
                {allLabel} ({tasksForType.length})
              </button>

              {filters.map((filter) => {
                const isActive = activeSubtype === filter.value;
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveSubtype(isActive ? null : filter.value)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200",
                      isActive
                        ? "border-orange-500 bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                        : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-orange-200 hover:bg-orange-50 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:shadow-none dark:hover:border-orange-500/35 dark:hover:bg-orange-500/10 dark:hover:text-orange-200",
                    )}
                  >
                    <Icon className={cn("h-3 w-3", isActive ? "text-white" : filter.iconClassName)} />
                    {filter.label} ({counts[filter.value] ?? 0})
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {visibleTasks.length === 0 ? (
        <EmptyState
          icon="pen"
          title="No prompts found"
          description="Try changing the task type or filters."
          compact
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleTasks.map((task) => (
            <PromptCard key={task.id} task={task} limitStatus={limitStatus} />
          ))}
        </div>
      )}
    </section>
  );
}

function buildSubtypeCounts(tasks: PromptTask[]): Partial<Record<WritingQuestionSubtype, number>> {
  return tasks.reduce<Partial<Record<WritingQuestionSubtype, number>>>((counts, task) => {
    if (task.question_subtype) {
      counts[task.question_subtype] = (counts[task.question_subtype] ?? 0) + 1;
    }
    return counts;
  }, {});
}

function PromptCard({ task, limitStatus }: { task: PromptTask; limitStatus: WritingLimitStatus | null }) {
  const imgSrc = task.task_type === "task_1" ? task.resolvedImageUrl ?? null : null;
  const minutes = Math.round((task.time_limit_seconds ?? 0) / 60);
  const subtypeLabel = subtypeDisplayLabel(task.question_subtype, task.task_type);

  return (
    <Card className={cn(
      "flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-orange-200 hover:shadow-[0_18px_48px_-32px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none dark:hover:border-orange-500/40",
      task.task_type === "task_1" ? "min-h-[25rem]" : "min-h-[15rem]",
    )}>
      {task.task_type === "task_1" ? (
        <div className="relative h-40 overflow-hidden border-b border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          {imgSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc} alt={task.title} className="h-full w-full rounded-xl bg-white object-contain dark:bg-slate-950" />
          ) : (
            <ChartPlaceholder subtype={task.question_subtype} />
          )}
        </div>
      ) : null}
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="outline" className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {task.task_type === "task_1" ? "TASK 1" : "TASK 2"}
          </Badge>
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
            {subtypeLabel.toUpperCase()}
          </span>
        </div>

        <h3 className="mt-4 line-clamp-2 text-base font-bold leading-6 tracking-tight text-slate-950 dark:text-slate-50">{task.title}</h3>

        <div className="mt-4 flex items-center gap-4 text-sm font-medium text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Target className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            {task.word_minimum}+ words
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            {minutes} min
          </span>
        </div>

        <WritingLimitLink
          limitStatus={limitStatus}
          href={`/exam-preview/writing?taskId=${task.id}`}
          className="mt-auto inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-orange-100 bg-orange-50 text-sm font-medium text-orange-700 transition-colors hover:border-orange-200 hover:bg-orange-100 hover:text-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:border-orange-500/35 dark:hover:bg-orange-500/15 dark:hover:text-orange-200 dark:focus-visible:ring-offset-slate-950"
        >
          Start Writing
          <ArrowRight className="h-4 w-4" />
        </WritingLimitLink>
      </CardContent>
    </Card>
  );
}

function ChartPlaceholder({ subtype }: { subtype: WritingQuestionSubtype | null | undefined }) {
  if (subtype === "table") {
    return (
      <div className="grid h-full grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className={cn("rounded-md bg-slate-100 dark:bg-slate-800", index < 3 && "bg-orange-100 dark:bg-orange-500/20")} />
        ))}
      </div>
    );
  }

  if (subtype === "line_graph") {
    return (
      <div className="relative h-full rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
        <LineChart className="absolute right-4 top-4 h-5 w-5 text-violet-400" />
        <div className="absolute inset-x-5 bottom-8 h-px bg-slate-200 dark:bg-slate-800" />
        <div className="absolute left-5 top-5 h-[70%] w-px bg-slate-200 dark:bg-slate-800" />
        <svg viewBox="0 0 260 120" className="h-full w-full pt-4">
          <path d="M12 92 C48 74 70 26 105 43 C142 61 158 93 198 58 C224 36 238 42 250 30" fill="none" stroke="#F97316" strokeWidth="5" strokeLinecap="round" />
          <path d="M12 105 C52 94 80 84 116 86 C154 88 184 60 250 70" fill="none" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex h-full items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
      {[58, 92, 72, 110, 84].map((height, index) => (
        <div key={index} className="flex flex-1 items-end rounded-t-lg bg-orange-50 dark:bg-orange-500/10">
          <div
            className={cn("w-full rounded-t-lg", index % 2 === 0 ? "bg-orange-400" : "bg-sky-400")}
            style={{ height }}
          />
        </div>
      ))}
    </div>
  );
}

function subtypeDisplayLabel(subtype: WritingQuestionSubtype | null | undefined, taskType: WritingTaskType): string {
  const label = [...TASK_1_FILTERS, ...TASK_2_FILTERS].find((item) => item.value === subtype)?.label
    ?? (subtype ? subtype.replace(/_/g, " ") : taskType === "task_1" ? "Prompt" : "Topic");
  return label;
}
