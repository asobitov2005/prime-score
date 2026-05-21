import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Clock3,
  ImageIcon,
  Infinity,
  PenSquare,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getWritingDashboardSummary,
  getWritingHistory,
  getWritingLimits,
  listWritingTasks,
  resolveWritingAssetUrl,
  QUESTION_SUBTYPES_TASK1,
  QUESTION_SUBTYPES_TASK2,
  type WritingDashboardSummary,
  type WritingHistoryItem,
  type WritingLimitStatus,
  type WritingQuestionSubtype,
  type WritingTaskListItem,
  type WritingTaskType,
} from "@/lib/server-writing";
import { cn } from "@/lib/utils";
import { CustomTaskCard } from "./custom-task-card";
import { WritingQuestionFilters } from "./writing-question-filters";
import { WritingLimitLink } from "./writing-limit-gate";

export const dynamic = "force-dynamic";

interface WritingPageProps {
  searchParams?: {
    task_type?: string;
    question_subtype?: string;
  };
}

export default async function WritingPage({ searchParams }: WritingPageProps) {
  const activeTaskType = searchParams?.task_type === "task_2" ? "task_2" : "task_1";
  const activeSubtype = normalizeSubtype(searchParams?.question_subtype, activeTaskType);
  const [summary, history, taskList, allTaskList, limitStatus] = await Promise.all([
    getWritingDashboardSummary().catch(() => null as WritingDashboardSummary | null),
    getWritingHistory().catch(() => ({ items: [] as WritingHistoryItem[], total: 0 })),
    listWritingTasks({ task_type: activeTaskType, question_subtype: activeSubtype, page_size: 100 }).catch(() => ({ items: [] as WritingTaskListItem[], total: 0 })),
    listWritingTasks({ task_type: activeTaskType, page_size: 100 }).catch(() => ({ items: [] as WritingTaskListItem[], total: 0 })),
    getWritingLimits().catch(() => null as WritingLimitStatus | null),
  ]);

  const publishedTasks = taskList.items;
  const subtypeCounts = buildSubtypeCounts(allTaskList.items);
  const allSubtypeCount = allTaskList.total || allTaskList.items.length;
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <Card className="relative overflow-hidden rounded-2xl border border-border/50 bg-background shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <CardHeader className="space-y-1 border-b border-border/40 bg-muted/5 p-5 lg:px-6 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">IELTS Writing checker</CardTitle>
            </div>
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary md:flex">
              <PenSquare className="h-5 w-5" />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="-mt-3 space-y-3">
        <div className="flex w-full gap-3 rounded-2xl border border-border/50 bg-muted/40 p-1.5 shadow-inner dark:border-slate-800 dark:bg-slate-950/80">
          {[
            { id: "task_1", label: "Academic Task 1" },
            { id: "task_2", label: "Academic Task 2" },
          ].map((task) => {
            const isActive = activeTaskType === task.id;
            return (
              <Button
                key={task.id}
                asChild
                variant="ghost"
                className={cn(
                  "h-10 flex-1 rounded-xl border font-semibold text-sm transition-all duration-300",
                  isActive
                    ? "z-10 scale-[1.01] border-[#cbd6ea] bg-[#edf3ff] text-[#244067] shadow-sm hover:bg-[#edf3ff] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-800"
                    : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-[#d8e0ef] hover:bg-[#f6f8fc] hover:text-[#29456f] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                )}
              >
                <Link href={`/writing?task_type=${task.id}`}>
                  {task.label}
                </Link>
              </Button>
            );
          })}
        </div>

        <WritingQuestionFilters activeTaskType={activeTaskType} counts={subtypeCounts} totalCount={allSubtypeCount} />

        <SummaryCard summary={summary} history={history.items} activeTaskType={activeTaskType} limitStatus={limitStatus} />
      </div>

      <div className="space-y-4">
        <CustomTaskCard activeTaskType={activeTaskType} limitStatus={limitStatus} />
      </div>

      <PublishedTasksSection
        activeTaskType={activeTaskType}
        activeSubtype={activeSubtype}
        tasks={publishedTasks}
        limitStatus={limitStatus}
      />
    </div>
  );
}

function normalizeSubtype(value: string | undefined, taskType: WritingTaskType): WritingQuestionSubtype | undefined {
  const options = taskType === "task_1" ? QUESTION_SUBTYPES_TASK1 : QUESTION_SUBTYPES_TASK2;
  return options.some((item) => item.value === value) ? value as WritingQuestionSubtype : undefined;
}

function buildSubtypeCounts(tasks: WritingTaskListItem[]): Partial<Record<WritingQuestionSubtype, number>> {
  return tasks.reduce<Partial<Record<WritingQuestionSubtype, number>>>((acc, task) => {
    if (task.question_subtype) {
      acc[task.question_subtype] = (acc[task.question_subtype] ?? 0) + 1;
    }
    return acc;
  }, {});
}

function PublishedTasksSection({
  activeTaskType,
  activeSubtype,
  tasks,
  limitStatus,
}: {
  activeTaskType: WritingTaskType;
  activeSubtype?: WritingQuestionSubtype;
  tasks: WritingTaskListItem[];
  limitStatus: WritingLimitStatus | null;
}) {
  const taskLabel = activeTaskType === "task_1" ? "Task 1" : "Task 2";
  const subtypeLabel = [...QUESTION_SUBTYPES_TASK1, ...QUESTION_SUBTYPES_TASK2]
    .find((item) => item.value === activeSubtype)?.label;

  return (
    <section id="published-prompts" className="space-y-3 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Published prompts
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {subtypeLabel ? `${taskLabel} · ${subtypeLabel}` : `${taskLabel} prompts`}
          </h2>
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon="pen"
          title="No published prompts yet"
          description="There are no live writing prompts for this filter. Try another task type or create your own custom writing task."
          action={{ href: "/writing", label: "Open custom writing" }}
          compact
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task) => (
            <PublishedTaskCard key={task.id} task={task} limitStatus={limitStatus} />
          ))}
        </div>
      )}
    </section>
  );
}

function PublishedTaskCard({ task, limitStatus }: { task: WritingTaskListItem; limitStatus: WritingLimitStatus | null }) {
  const stripped = stripHtml(task.description ?? "").slice(0, 120);
  const imgSrc = task.task_type === "task_1" ? resolveWritingAssetUrl(task.image_url) : null;
  const minutes = Math.round((task.time_limit_seconds ?? 0) / 60);
  const subtypeLabel = subtypeDisplayLabel(task.question_subtype);
  const skills = expectedSkills(task.question_subtype, task.task_type);
  const isNew = task.created_at ? (new Date().getTime() - new Date(task.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000 : false;

  return (
    <WritingLimitLink limitStatus={limitStatus} href={`/exam-preview/writing?taskId=${task.id}`} className="group block text-left">
      <Card className="relative flex h-full flex-col overflow-hidden rounded-2xl border-border/60 bg-card/77 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
        {isNew && (
          <div className="absolute left-0 top-0 z-30 h-[80px] w-[80px] overflow-hidden rounded-tl-2xl pointer-events-none select-none">
            <svg width="80" height="80" viewBox="0 0 80 80" className="absolute left-0 top-0">
              <defs>
                <linearGradient id="ribbonGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#9e0c1b" />
                  <stop offset="35%" stopColor="#e62035" />
                  <stop offset="50%" stopColor="#ff4d6d" />
                  <stop offset="65%" stopColor="#e62035" />
                  <stop offset="100%" stopColor="#9e0c1b" />
                </linearGradient>
              </defs>
              <path 
                d="M 0 0 
                   L 0 62 
                   C 0 62, 2 62, 5 58 
                   C 12 48, 48 12, 58 5 
                   C 62 2, 62 0, 62 0 
                   Z" 
                fill="url(#ribbonGrad)" 
              />
              <path d="M 0 62 C 0 62, 3 64, 5 62 L 0 56 Z" fill="#590007" />
              <path d="M 62 0 C 62 0, 64 3, 62 5 L 56 0 Z" fill="#590007" />
              <text 
                x="22" 
                y="29" 
                transform="rotate(-45 22 29)" 
                fill="#ffffff" 
                fontFamily="system-ui, -apple-system, sans-serif" 
                fontWeight="900" 
                fontSize="10.5" 
                letterSpacing="1.5" 
                textAnchor="middle" 
                filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.6))"
              >
                NEW
              </text>
            </svg>
          </div>
        )}
        {imgSrc ? (
          <div className="relative h-40 w-full overflow-hidden bg-white p-2 dark:bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt={task.title}
              className="h-full w-full object-contain"
            />
          </div>
        ) : task.task_type === "task_1" ? (
          <div className="flex h-40 items-center justify-center bg-muted/30 text-muted-foreground">
            <ImageIcon className="h-8 w-8 opacity-50" />
          </div>
        ) : null}

        <CardContent className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="outline" className="border-border/60 bg-background/80 text-[10px] uppercase tracking-[0.18em]">
              {task.task_type === "task_1" ? "Task 1" : "Task 2"}
            </Badge>
            {task.question_subtype ? (
              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sky-700 dark:text-sky-300">
                {subtypeLabel}
              </span>
            ) : null}
          </div>

          <p className="line-clamp-2 text-base font-semibold tracking-tight text-foreground">{task.title}</p>

          {stripped ? (
            <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{stripped}{stripped.length === 120 ? "..." : ""}</p>
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span key={skill} className="rounded-md border border-border/50 bg-muted/30 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                {skill}
              </span>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between pt-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                {task.word_minimum}+ words
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                {minutes} min
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Start <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </CardContent>
      </Card>
    </WritingLimitLink>
  );
}

function subtypeDisplayLabel(subtype: WritingQuestionSubtype | null | undefined): string {
  return [...QUESTION_SUBTYPES_TASK1, ...QUESTION_SUBTYPES_TASK2].find((item) => item.value === subtype)?.label
    ?? (subtype ? subtype.replace(/_/g, " ") : "");
}

function expectedSkills(subtype: WritingQuestionSubtype | null | undefined, taskType: WritingTaskType): string[] {
  if (taskType === "task_1") {
    if (subtype === "process") return ["sequence", "stages", "overview"];
    if (subtype === "map") return ["location", "changes", "overview"];
    if (subtype === "table") return ["key figures", "comparison", "grouping"];
    return ["overview", "comparison", "data support"];
  }
  if (subtype === "discussion") return ["both views", "position", "examples"];
  if (subtype === "problem_solution") return ["causes", "solutions", "support"];
  if (subtype === "advantages_disadvantages") return ["balance", "position", "examples"];
  if (subtype === "two_part") return ["both parts", "paragraph focus", "examples"];
  return ["position", "topic sentence", "support"];
}

function SummaryCard({
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

  const totalSubmissions = taskItems.length;
  const averageBandValue = activeTaskType === "task_1" ? summary?.task_1_average : summary?.task_2_average;
  const averageBand = formatBand(
    averageBandValue ?? (
      gradedTaskItems.length > 0
        ? gradedTaskItems.reduce((sum, item) => sum + Number(item.overall_band), 0) / gradedTaskItems.length
        : null
    ),
    "0"
  );
  const bestBand = formatBand(
    gradedTaskItems.length > 0
      ? Math.max(...gradedTaskItems.map((item) => Number(item.overall_band)))
      : null,
    "0"
  );
  const lastBand = formatBand(
    (() => {
      const latest = taskItems[0];
      return latest?.overall_band ?? null;
    })(),
    "0"
  );
  const badgeLabel = activeTaskType === "task_1" ? "Task 1" : "Task 2";
  const badgeTone = activeTaskType === "task_1"
    ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-200"
    : "border-violet-200 bg-violet-50 text-violet-700 dark:border-slate-700 dark:bg-slate-900 dark:text-violet-200";

  const tiles = [
    {
      label: "Submissions",
      value: String(totalSubmissions),
      icon: BarChart3,
      tone: "text-sky-600 dark:text-sky-200",
      iconWrap: "bg-sky-100/80 ring-sky-200/70 dark:bg-slate-800 dark:ring-slate-700",
      surface: "border-sky-200/70 bg-sky-50/60 dark:border-slate-800 dark:bg-slate-900",
    },
    {
      label: "Average band",
      value: averageBand,
      icon: Sparkles,
      tone: "text-violet-600 dark:text-violet-200",
      iconWrap: "bg-violet-100/80 ring-violet-200/70 dark:bg-slate-800 dark:ring-slate-700",
      surface: "border-violet-200/70 bg-violet-50/60 dark:border-slate-800 dark:bg-slate-900",
    },
    {
      label: "Best band",
      value: bestBand,
      icon: Trophy,
      tone: "text-amber-600 dark:text-amber-200",
      iconWrap: "bg-amber-100/80 ring-amber-200/70 dark:bg-slate-800 dark:ring-slate-700",
      surface: "border-amber-200/70 bg-amber-50/60 dark:border-slate-800 dark:bg-slate-900",
    },
    {
      label: "Last band",
      value: lastBand,
      icon: Target,
      tone: "text-emerald-600 dark:text-emerald-200",
      iconWrap: "bg-emerald-100/80 ring-emerald-200/70 dark:bg-slate-800 dark:ring-slate-700",
      surface: "border-emerald-200/70 bg-emerald-50/60 dark:border-slate-800 dark:bg-slate-900",
    },
  ];

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 bg-card/70 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/40 bg-background/40 pb-2 pt-3 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold tracking-tight text-foreground">Your Writing Performance</CardTitle>
          <Badge tone="outline" className={cn("text-[10px] uppercase tracking-[0.18em]", badgeTone)}>
            {badgeLabel}
          </Badge>
        </div>
        <Button asChild size="sm" variant="outline" className="h-7 rounded-lg border-border/60 bg-background/70 px-3 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
          <Link href={`/writing/history?task_type=${activeTaskType}`}>
            View history
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <WritingLimitStrip limitStatus={limitStatus} />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.label}
                className={cn(
                  "flex min-h-[78px] items-center justify-center rounded-xl border px-3 py-3 shadow-sm shadow-black/5 dark:shadow-none",
                  tile.surface
                )}
              >
                <div className="flex items-center justify-center gap-3">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1", tile.iconWrap)}>
                    <Icon className={cn("h-4.5 w-4.5", tile.tone)} />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xl font-semibold leading-none tracking-tight text-foreground">{tile.value}</p>
                    <p className="text-[10px] font-medium uppercase leading-none tracking-[0.16em] text-muted-foreground">
                      {tile.label}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function WritingLimitStrip({ limitStatus }: { limitStatus: WritingLimitStatus | null }) {
  const resetLabel = limitStatus ? formatResetTime(limitStatus.reset_at) : null;
  const isUnlimited = limitStatus?.daily_limit === null;
  const usagePercent = limitStatus && limitStatus.daily_limit && limitStatus.daily_limit > 0
    ? Math.min(100, Math.round((limitStatus.used_today / limitStatus.daily_limit) * 100))
    : 0;
  const stateLabel = !limitStatus
    ? "Checking limit"
    : !limitStatus.is_premium
      ? "Premium required"
      : isUnlimited
        ? "Unlimited checks"
        : limitStatus.can_submit
          ? `${limitStatus.remaining_today}/${limitStatus.daily_limit} left today`
          : "Daily limit reached";

  return (
    <div className={cn(
      "overflow-hidden rounded-xl border px-4 py-3",
      limitStatus?.can_submit
        ? "border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/10"
        : "border-amber-200/80 bg-amber-50/75 dark:border-amber-500/25 dark:bg-amber-500/10"
    )}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            limitStatus?.can_submit ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
          )}>
            {isUnlimited ? <Infinity className="h-4.5 w-4.5" /> : <PenSquare className="h-4.5 w-4.5" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Writing checks</p>
            <p className="text-xs leading-5 text-muted-foreground">
              {limitStatus?.plan_name ? `${limitStatus.plan_name} - ` : ""}{stateLabel}
              {resetLabel && !isUnlimited ? ` - resets ${resetLabel}` : ""}
            </p>
          </div>
        </div>
        {limitStatus && limitStatus.daily_limit !== null ? (
          <div className="min-w-[130px] text-right">
            <p className="text-sm font-bold tabular-nums text-foreground">{limitStatus.used_today}/{limitStatus.daily_limit}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background/70">
              <div className={cn("h-full rounded-full", limitStatus.can_submit ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${usagePercent}%` }} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatResetTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tashkent",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "tomorrow";
  }
}

function formatBand(value: number | string | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(1) : fallback;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
