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
  gradient: string;
  border: string;
}

const TASK_1_FILTERS: FilterItem[] = [
  { value: "bar_chart", label: "Bar Chart", icon: BarChart3, gradient: "from-sky-500 to-sky-600", border: "border-sky-500/40" },
  { value: "line_graph", label: "Line Graph", icon: LineChart, gradient: "from-violet-500 to-violet-600", border: "border-violet-500/40" },
  { value: "pie_chart", label: "Pie Chart", icon: PieChart, gradient: "from-amber-500 to-amber-600", border: "border-amber-500/40" },
  { value: "table", label: "Table", icon: Table2, gradient: "from-emerald-500 to-emerald-600", border: "border-emerald-500/40" },
  { value: "process", label: "Process", icon: FileText, gradient: "from-rose-500 to-rose-600", border: "border-rose-500/40" },
  { value: "map", label: "Map", icon: Globe2, gradient: "from-blue-500 to-blue-600", border: "border-blue-500/40" },
  { value: "two_charts", label: "Two Charts", icon: TrendingUp, gradient: "from-teal-500 to-teal-600", border: "border-teal-500/40" },
];

const TASK_2_FILTERS: FilterItem[] = [
  { value: "opinion", label: "Opinion Essay", icon: MessageSquare, gradient: "from-violet-500 to-violet-600", border: "border-violet-500/40" },
  { value: "advantages_disadvantages", label: "Advantages & Disadvantages", icon: Scale, gradient: "from-sky-500 to-sky-600", border: "border-sky-500/40" },
  { value: "discussion", label: "Discussion Essay", icon: BookOpen, gradient: "from-emerald-500 to-emerald-600", border: "border-emerald-500/40" },
  { value: "problem_solution", label: "Problem & Solution", icon: HelpCircle, gradient: "from-amber-500 to-amber-600", border: "border-amber-500/40" },
  { value: "two_part", label: "Two-Part Question", icon: Sparkles, gradient: "from-rose-500 to-rose-600", border: "border-rose-500/40" },
  { value: "causes_effects", label: "Causes & Effects", icon: TrendingUp, gradient: "from-pink-500 to-pink-600", border: "border-pink-500/40" },
];

export function WritingQuestionFilters({ activeTaskType }: { activeTaskType: WritingTaskType }) {
  const searchParams = useSearchParams();
  const activeSubtype = searchParams.get("question_subtype") || null;
  const filters = activeTaskType === "task_1" ? TASK_1_FILTERS : TASK_2_FILTERS;

  function buildHref(subtype: string | null): string {
    const params = new URLSearchParams();
    params.set("task_type", activeTaskType);
    if (subtype) params.set("question_subtype", subtype);
    return `/writing?${params.toString()}`;
  }

  return (
    <div className="space-y-2 pt-1">
      <p className="px-1 text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">
        Question type
      </p>
      <div className="flex flex-wrap gap-2">
        {/* All types chip */}
        <Link
          href={buildHref(null)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200",
            !activeSubtype
              ? "border-primary/50 bg-gradient-to-r from-primary to-primary/80 text-white shadow-sm shadow-primary/20"
              : "border-border/60 bg-background/70 text-muted-foreground hover:border-border hover:text-foreground dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
          )}
        >
          <Circle className="h-3 w-3" />
          All types
        </Link>

        {filters.map((filter) => {
          const isActive = activeSubtype === filter.value;
          const Icon = filter.icon;
          return (
            <Link
              key={filter.value}
              href={buildHref(isActive ? null : filter.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                isActive
                  ? `${filter.border} bg-gradient-to-r ${filter.gradient} text-white shadow-sm`
                  : "border-border/60 bg-background/70 text-muted-foreground hover:border-border hover:text-foreground dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
              )}
            >
              <Icon className="h-3 w-3" />
              {filter.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
