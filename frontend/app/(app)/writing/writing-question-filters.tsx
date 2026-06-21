"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Circle,
  FileText,
  Globe2,
  HelpCircle,
  LineChart,
  MessageSquare,
  PieChart,
  Scale,
  Sparkles,
  Table2,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WritingQuestionSubtype, WritingTaskType } from "@/lib/server-writing";

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
  { value: "opinion", label: "Opinion", icon: MessageSquare, iconClassName: "text-violet-500" },
  { value: "discussion", label: "Discussion", icon: BookOpen, iconClassName: "text-emerald-500" },
  { value: "advantages_disadvantages", label: "Advantage / Disadvantage", icon: Scale, iconClassName: "text-sky-500" },
  { value: "problem_solution", label: "Problem / Solution", icon: HelpCircle, iconClassName: "text-amber-500" },
  { value: "two_part", label: "Two-part Question", icon: Sparkles, iconClassName: "text-rose-500" },
];

export function WritingQuestionFilters({
  activeTaskType,
  counts,
  totalCount = 0,
}: {
  activeTaskType: WritingTaskType;
  counts?: Partial<Record<WritingQuestionSubtype, number>>;
  totalCount?: number;
}) {
  const searchParams = useSearchParams();
  const activeSubtype = searchParams.get("question_subtype") || null;
  const filters = activeTaskType === "task_1" ? TASK_1_FILTERS : TASK_2_FILTERS;
  const allLabel = activeTaskType === "task_1" ? "All Types" : "All Topics";

  function buildHref(subtype: string | null): string {
    const params = new URLSearchParams();
    params.set("task_type", activeTaskType);
    if (subtype) params.set("question_subtype", subtype);
    return `/writing?${params.toString()}`;
  }

  return (
    <div className="space-y-2 pt-1">
      <p className="px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        Question type
      </p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {/* All types chip */}
        <Link
          href={buildHref(null)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200",
            !activeSubtype
              ? "border-orange-500 bg-orange-500 text-white shadow-sm shadow-orange-500/20"
              : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-orange-200 hover:bg-orange-50 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:shadow-none dark:hover:border-orange-500/35 dark:hover:bg-orange-500/10 dark:hover:text-orange-200"
          )}
        >
          <Circle className="h-3 w-3" />
          {allLabel} ({totalCount})
        </Link>

        {filters.map((filter) => {
          const isActive = activeSubtype === filter.value;
          const Icon = filter.icon;
          return (
            <Link
              key={filter.value}
              href={buildHref(isActive ? null : filter.value)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200",
                isActive
                  ? "border-orange-500 bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                  : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-orange-200 hover:bg-orange-50 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:shadow-none dark:hover:border-orange-500/35 dark:hover:bg-orange-500/10 dark:hover:text-orange-200"
              )}
            >
              <Icon className={cn("h-3 w-3", isActive ? "text-white" : filter.iconClassName)} />
              {filter.label} ({counts?.[filter.value] ?? 0})
            </Link>
          );
        })}
      </div>
    </div>
  );
}
