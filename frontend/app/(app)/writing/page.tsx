import Link from "next/link";
import {
  Plus,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Clock3,
  ImageIcon,
  FileText,
  PenSquare,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getWritingDashboardSummary,
  getWritingDrafts,
  getWritingHistory,
  type WritingDashboardSummary,
  type WritingDraftListItem,
  type WritingHistoryItem,
  type WritingTaskType,
} from "@/lib/server-writing";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface WritingPageProps {
  searchParams?: {
    task_type?: string;
  };
}

export default async function WritingPage({ searchParams }: WritingPageProps) {
  const activeTaskType = searchParams?.task_type === "task_2" ? "task_2" : "task_1";
  const [summary, history, draftList] = await Promise.all([
    getWritingDashboardSummary().catch(() => null as WritingDashboardSummary | null),
    getWritingHistory().catch(() => ({ items: [] as WritingHistoryItem[], total: 0 })),
    getWritingDrafts().catch(() => ({ items: [] as WritingDraftListItem[] })),
  ]);

  const drafts = draftList.items;
  const activeTaskCard = activeTaskType === "task_1"
    ? {
        taskNumber: 1 as const,
        title: "Academic Task 1",
        subtitle: "Describe a chart, graph, or diagram",
        minutes: 20,
        words: 150,
        icon: <ImageIcon className="h-5 w-5" />,
        href: "/exam-preview/writing?task_type=task_1&mode=practice",
      }
    : {
        taskNumber: 2 as const,
        title: "Academic Task 2",
        subtitle: "Write a 250-word academic essay",
        minutes: 40,
        words: 250,
        icon: <PenSquare className="h-5 w-5" />,
        href: "/exam-preview/writing?task_type=task_2&mode=practice",
      };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <Card className="relative overflow-hidden rounded-2xl border border-border/50 bg-background shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <CardHeader className="space-y-1 border-b border-border/40 bg-muted/5 p-5 lg:px-6 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Writing</CardTitle>
              <CardDescription className="max-w-2xl text-sm font-medium text-muted-foreground">
                Practice in an IELTS-style writing workspace, or check an answer you already wrote.
              </CardDescription>
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

        <SummaryCard summary={summary} history={history.items} activeTaskType={activeTaskType} />
      </div>

      <div className="space-y-4">
        <CustomTaskCard activeTaskType={activeTaskType} />
        <TaskQuickStartCard {...activeTaskCard} />
      </div>

      {drafts.length > 0 ? <DraftResumeCard drafts={drafts} /> : null}
    </div>
  );
}

function DraftResumeCard({ drafts }: { drafts: WritingDraftListItem[] }) {
  return (
    <Card className="rounded-3xl border-border/60 bg-card/70 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-lg font-semibold tracking-tight text-foreground">Resume drafts</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Continue a writing task you already started.
          </CardDescription>
        </div>
        <Badge tone="outline" className="border-border/60 bg-background/70 text-[10px] uppercase tracking-[0.18em] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {drafts.length} saved
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {drafts.map((draft) => {
          const href = draft.task_id
            ? `/exam-preview/writing?taskId=${draft.task_id}&mode=practice`
            : `/exam-preview/writing?task_type=${draft.task_type}&mode=practice`;
          const taskLabel = draft.task_type === "task_1" ? "Task 1" : "Task 2";
          const taskTone =
            draft.task_type === "task_1"
              ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400"
              : "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400";
          const preview = draft.topic.trim() || draft.task_title || draft.essay_text.trim().slice(0, 120) || "Untitled draft";
          const words = draft.essay_text.trim() ? draft.essay_text.trim().split(/\s+/).filter(Boolean).length : 0;

          return (
            <div key={draft.draft_key} className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-background/45 p-5 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900/80">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest", taskTone)}>
                    {taskLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    <RotateCcw className="h-3 w-3" />
                    {draft.started ? "In progress" : "Setup saved"}
                  </span>
                </div>
                <p className="truncate text-base font-semibold text-foreground">
                  {draft.task_title ?? preview}
                </p>
                <p className="line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {preview}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {words} words
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatRelative(draft.updated_at)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {draft.time_spent_seconds > 0 ? `${Math.floor(draft.time_spent_seconds / 60)}m ${draft.time_spent_seconds % 60}s` : "not started"}
                  </span>
                </div>
              </div>
              <Button asChild className="rounded-xl px-5">
                <Link href={href}>
                  Resume
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function TaskQuickStartCard({
  taskNumber,
  title,
  subtitle,
  minutes,
  words,
  icon,
  href,
}: {
  taskNumber: 1 | 2;
  title: string;
  subtitle: string;
  minutes: number;
  words: number;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link href={href} className="group block">
      <Card
        className={cn(
          "relative overflow-hidden rounded-2xl border-border/60 bg-card/80 shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700",
        )}
      >
        <CardContent className="relative z-10 flex flex-col gap-5 p-6">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-background/80 text-foreground shadow-sm dark:border-slate-700 dark:bg-slate-900">
              {icon}
            </div>
            <Badge tone="outline" className="border-border/60 bg-background/80 text-[10px] uppercase tracking-[0.18em] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Task {taskNumber}
            </Badge>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
            <p className="text-xl font-semibold tracking-tight text-foreground">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 font-medium text-muted-foreground dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              <ClockDot />
              {minutes} min
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 font-medium text-muted-foreground dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              <Target className="h-3 w-3" />
              {words}+ words
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Start task</span>
            <ArrowUpRight className="h-5 w-5 text-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CustomTaskCard({ activeTaskType }: { activeTaskType: WritingTaskType }) {
  return (
    <Link href={`/writing/tasks?task_type=${activeTaskType}`} className="group block">
      <Card className="relative overflow-hidden rounded-2xl border-border/60 bg-card/80 shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700">
        <CardContent className="relative z-10 flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/80 text-foreground shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <Plus className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Add Custom Task</p>
                <p className="text-sm font-medium tracking-tight text-muted-foreground">Add a question you've found elsewhere</p>
              </div>
            </div>
            <Badge tone="outline" className="border-border/60 bg-background/80 text-[10px] uppercase tracking-[0.18em] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Custom
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ClockDot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />;
}

function SummaryCard({
  summary,
  history,
  activeTaskType,
}: {
  summary: WritingDashboardSummary | null;
  history: WritingHistoryItem[];
  activeTaskType: WritingTaskType;
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
      <CardContent className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 pt-4">
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
      </CardContent>
    </Card>
  );
}

function formatBand(value: number | string | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(1) : fallback;
}

function formatRelative(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const seconds = Math.round(diffMs / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
