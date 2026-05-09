import Link from "next/link";
import { ArrowRight, Clock3, FileText, Loader2, PenSquare, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getWritingDrafts,
  getWritingHistory,
  type WritingDraftListItem,
  type WritingHistoryItem,
} from "@/lib/server-writing";
import { DraftRow } from "./draft-row";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { task_type?: string };
}

function exactDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(seconds: number | null | undefined): string {
  const safe = Math.max(0, Math.floor(Number(seconds ?? 0)));
  const minutes = Math.floor(safe / 60);
  const remainingSeconds = safe % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

function bandTone(band: number) {
  if (band >= 8) return "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30";
  if (band >= 7) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (band >= 6) return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30";
  if (band >= 5) return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
  return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30";
}

function HistoryRow({ item }: { item: WritingHistoryItem }) {
  const status = String(item.status ?? "").toLowerCase();
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const isPending = !isCompleted && !isFailed;
  const band =
    item.overall_band !== null && item.overall_band !== undefined
      ? typeof item.overall_band === "string"
        ? parseFloat(item.overall_band)
        : item.overall_band
      : null;

  return (
    <Link
      href={`/writing/submissions/${item.submission_id}/result`}
      className="block group"
    >
      <Card className="rounded-2xl border-border/60 bg-card/40 hover:border-violet-500/40 hover:bg-card/60 transition-colors">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0",
                "bg-violet-500/10 text-violet-600 dark:text-violet-400",
              )}
            >
              <PenSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold truncate">{item.task_title}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {item.word_count} words
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3 w-3" /> {formatDuration(item.time_spent_seconds)}
                </span>
                <span>·</span>
                <span>{exactDateTime(item.submitted_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {isPending ? (
              <span className="inline-flex whitespace-nowrap items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-700 dark:text-violet-300">
                <Loader2 className="h-3 w-3 animate-spin" />
                Grading…
              </span>
            ) : isFailed ? (
              <span className="whitespace-nowrap rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-600 dark:text-rose-300">
                Failed
              </span>
            ) : band !== null ? (
              <span
                className={cn(
                  "inline-flex whitespace-nowrap items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold tabular-nums",
                  bandTone(band),
                )}
              >
                Band {band.toFixed(1)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No score</span>
            )}
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-foreground transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function draftWordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

export default async function WritingHistoryPage({ searchParams }: PageProps) {
  const filter = searchParams?.task_type === "task_1" || searchParams?.task_type === "task_2"
    ? searchParams.task_type
    : null;

  const [history, draftList] = await Promise.all([
    getWritingHistory().catch(() => ({ items: [], total: 0 })),
    getWritingDrafts().catch(() => ({ items: [] as WritingDraftListItem[] })),
  ]);
  const items = filter ? history.items.filter((i) => i.task_type === filter) : history.items;
  const visibleDrafts = draftList.items.filter((draft) => draftWordCount(draft.essay_text) >= 20);
  const drafts = filter ? visibleDrafts.filter((i) => i.task_type === filter) : visibleDrafts;
  const totalItems = items.length + drafts.length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your essays</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every essay you've submitted with its AI band score and feedback.
          </p>
        </div>
        <Button asChild className="h-11 rounded-2xl px-5 font-semibold shadow-sm shadow-primary/20">
          <Link href="/writing">
            <PenSquare className="h-4 w-4" />
            New essay
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/writing/history"
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            !filter
              ? "border-foreground/40 bg-foreground text-background"
              : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground",
          )}
        >
          All ({history.items.length + visibleDrafts.length})
        </Link>
        <Link
          href="/writing/history?task_type=task_1"
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            filter === "task_1"
              ? "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300"
              : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground",
          )}
        >
          Task 1
        </Link>
        <Link
          href="/writing/history?task_type=task_2"
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            filter === "task_2"
              ? "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300"
              : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground",
          )}
        >
          Task 2
        </Link>
      </div>

      {totalItems === 0 ? (
        <Card className="rounded-3xl border-dashed border-border/60 bg-card/30">
          <CardContent className="p-12 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-violet-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">No essays yet</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Submit your first IELTS Writing essay to get instant AI feedback.
              </p>
            </div>
            <Button asChild>
              <Link href="/writing">Start writing</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <DraftRow key={draft.draft_key} draft={draft} />
          ))}
          {items.map((item) => (
            <HistoryRow key={item.submission_id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
