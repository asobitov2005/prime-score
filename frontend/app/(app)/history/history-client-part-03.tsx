"use client";

import { ArrowRight, Badge, ChevronRight, Link, Loader2, WritingHistoryItem, cn } from "./history-client-dependencies";
import { exactDateTime, formatDurationLabel, writingBandClass } from "./history-client-part-02";

export function WritingHistoryRow({ item }: { item: WritingHistoryItem }) {
  const status = String(item.status ?? "").toLowerCase();
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const band =
    item.overall_band !== null && item.overall_band !== undefined
      ? typeof item.overall_band === "string"
        ? Number.parseFloat(item.overall_band)
        : item.overall_band
      : null;

  return (
    <Link
      href={`/writing/submissions/${item.submission_id}/result`}
      className="group relative block m-2 rounded-xl border border-violet-500/20 bg-[linear-gradient(135deg,rgba(139,92,246,0.09),rgba(139,92,246,0.025)_26%,rgba(255,255,255,0)_42%)] shadow-sm"
    >
      <span className="absolute bottom-4 left-0 top-4 w-1 rounded-full bg-violet-500" />
      <div className="flex items-center gap-3 rounded-xl px-4 py-4 transition-colors hover:bg-muted/20">
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(0,1.7fr)_auto_auto_auto] md:items-center">
          <div className="min-w-0 space-y-2">
            <div className="truncate text-sm font-bold text-foreground">{item.task_title}</div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-md border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-violet-700 shadow-sm dark:text-violet-300">
                Writing
              </Badge>
              <Badge variant="outline" className="rounded-md border-border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest shadow-sm">
                {item.task_type === "task_1" ? "Task 1" : "Task 2"}
              </Badge>
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <div className="font-bold uppercase tracking-widest text-muted-foreground">Submitted</div>
            <div className="font-semibold text-foreground">{exactDateTime(item.submitted_at)}</div>
          </div>

          <div className="space-y-1 text-xs">
            <div className="font-bold uppercase tracking-widest text-muted-foreground">Result</div>
            {!isCompleted ? (
              isFailed ? (
                <Badge className="whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold" tone="danger">
                  Failed
                </Badge>
              ) : (
                <Badge className="whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold" tone="outline">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Grading
                </Badge>
              )
            ) : band !== null && Number.isFinite(band) ? (
              <span
                className={cn(
                  "inline-flex whitespace-nowrap items-center rounded-full border px-3 py-1 text-sm font-semibold tabular-nums",
                  writingBandClass(band),
                )}
              >
                Band {band.toFixed(1)}
              </span>
            ) : (
              <Badge className="whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold" tone="outline">
                No score
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 md:justify-end">
            <div className="space-y-1 text-xs">
              <div className="font-bold uppercase tracking-widest text-muted-foreground">Time</div>
              <div className="font-semibold text-foreground">{formatDurationLabel(item.time_spent_seconds)}</div>
              <div className="text-muted-foreground">{item.word_count} words</div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
          </div>
        </div>
      </div>
    </Link>
  );
}
