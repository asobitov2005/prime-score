import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ClipboardCheck,
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
} from "@/lib/server-writing";
import { cn } from "@/lib/utils";
import { CustomWritingPanel } from "./custom-writing-panel";

export const dynamic = "force-dynamic";

export default async function WritingPage() {
  const [summary, history, draftList] = await Promise.all([
    getWritingDashboardSummary().catch(() => null as WritingDashboardSummary | null),
    getWritingHistory().catch(() => ({ items: [] as WritingHistoryItem[], total: 0 })),
    getWritingDrafts().catch(() => ({ items: [] as WritingDraftListItem[] })),
  ]);

  const recent = history.items.slice(0, 5);
  const drafts = draftList.items;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
          <PenSquare className="h-3.5 w-3.5" />
          Writing Workspace
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Writing</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Practice in an IELTS-style writing workspace, or check an answer you already wrote.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TaskQuickStartCard
          taskNumber={1}
          title="Task 1"
          subtitle="Describe a chart, graph, or diagram"
          minutes={20}
          words={150}
          icon={<ImageIcon className="h-5 w-5" />}
          href="/exam-preview/writing?task_type=task_1&mode=practice"
        />
        <TaskQuickStartCard
          taskNumber={2}
          title="Task 2"
          subtitle="Write a 250-word academic essay"
          minutes={40}
          words={250}
          icon={<PenSquare className="h-5 w-5" />}
          href="/exam-preview/writing?task_type=task_2&mode=practice"
        />
      </div>

      {drafts.length > 0 ? <DraftResumeCard drafts={drafts} /> : null}

      <CustomWritingPanel />

      <SummaryCard summary={summary} />

      <Card className="rounded-3xl border-border/60 bg-card/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight text-foreground">Recent submissions</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Your last writing attempts and their bands.
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="outline" className="rounded-xl">
            <Link href="/writing/history">
              View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {recent.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-10 text-center">
              <ClipboardCheck className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold text-foreground">No submissions yet</p>
              <p className="text-xs text-muted-foreground">Start a prompt or check a finished answer above.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50 rounded-2xl border border-border/50 bg-background/40">
              {recent.map((item) => (
                <RecentRow key={item.submission_id} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DraftResumeCard({ drafts }: { drafts: WritingDraftListItem[] }) {
  return (
    <Card className="rounded-3xl border-border/60 bg-card/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-lg font-semibold tracking-tight text-foreground">Resume drafts</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Continue a writing task you already started.
          </CardDescription>
        </div>
        <Badge tone="outline" className="border-border/60 bg-background/70 text-[10px] uppercase tracking-[0.18em]">
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
            <div key={draft.draft_key} className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-background/45 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest", taskTone)}>
                    {taskLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
          "relative overflow-hidden rounded-2xl border-border/60 bg-card/80 shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md",
        )}
      >
        <CardContent className="relative z-10 flex flex-col gap-5 p-6">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-background/80 text-foreground shadow-sm">
              {icon}
            </div>
            <Badge tone="outline" className="border-border/60 bg-background/80 text-[10px] uppercase tracking-[0.18em]">
              Task {taskNumber}
            </Badge>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
            <p className="text-xl font-semibold tracking-tight text-foreground">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 font-medium text-muted-foreground">
              <ClockDot />
              {minutes} min
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 font-medium text-muted-foreground">
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

function ClockDot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />;
}

function SummaryCard({ summary }: { summary: WritingDashboardSummary | null }) {
  const totalSubmissions = summary?.total_submissions ?? 0;
  const averageBand = formatBand(summary?.average_band);
  const bestBand = formatBand(summary?.best_band);
  const lastBand = formatBand(summary?.last_band);
  const lastSubmittedLabel = summary?.last_submitted_at
    ? formatRelative(summary.last_submitted_at)
    : null;

  const tiles = [
    {
      label: "Submissions",
      value: String(totalSubmissions),
      sub: lastSubmittedLabel ? `Last ${lastSubmittedLabel}` : "Get started today",
      icon: BarChart3,
      tone: "text-sky-500",
      bg: "bg-sky-500/10",
    },
    {
      label: "Average band",
      value: averageBand,
      sub: "Across all tasks",
      icon: Sparkles,
      tone: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      label: "Best band",
      value: bestBand,
      sub: "Personal record",
      icon: Trophy,
      tone: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Last band",
      value: lastBand,
      sub: lastSubmittedLabel ?? "—",
      icon: Target,
      tone: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <Card className="rounded-3xl border-border/60 bg-card/70 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold tracking-tight text-foreground">Your writing snapshot</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          AI-graded performance across Task 1 and Task 2.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div key={tile.label} className="rounded-2xl border border-border/40 bg-background/60 px-4 py-4 shadow-sm">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tile.bg)}>
                <Icon className={cn("h-4.5 w-4.5", tile.tone)} />
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{tile.value}</p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {tile.label}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{tile.sub}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function RecentRow({ item }: { item: WritingHistoryItem }) {
  const isCompleted = String(item.status).toLowerCase() === "completed";
  const isFailed = String(item.status).toLowerCase() === "failed";
  const submittedRelative = formatRelative(item.submitted_at);
  const taskBadge = item.task_type === "task_1" ? "Task 1" : "Task 2";
  const taskBadgeTone =
    item.task_type === "task_1"
      ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400"
      : "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400";

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest", taskBadgeTone)}>
            {taskBadge}
          </span>
          <span className="truncate text-sm font-semibold text-foreground">{item.task_title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span>{item.word_count} words</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          <span>{submittedRelative}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isCompleted ? (
          <div className="text-right">
            <p className="text-lg font-bold tracking-tight text-primary">{formatBand(item.overall_band)}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Band</p>
          </div>
        ) : isFailed ? (
          <Badge tone="danger" className="text-[10px]">Failed</Badge>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-amber-500/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            Grading...
          </span>
        )}
        <Button asChild size="sm" variant="outline" className="rounded-xl">
          <Link href={`/writing/submissions/${item.submission_id}/result`}>View result</Link>
        </Button>
      </div>
    </div>
  );
}

function formatBand(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(1) : "—";
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
