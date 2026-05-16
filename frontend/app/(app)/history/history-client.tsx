"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronRight, Clock3, FileText, Filter, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/date-time";
import type { WritingHistoryItem } from "@/lib/server-writing";
import type { AttemptRow } from "@/lib/types";
import { HistoryRetakeButton } from "./retake-button";
import { cn } from "@/lib/utils";

type HistoryGroup = {
  key: string;
  latestAttempt: AttemptRow;
  bestAttempt: AttemptRow;
  attempts: AttemptRow[];
};

type HistoryEntry =
  | {
      kind: "attempt";
      key: string;
      sortAt: string;
      group: HistoryGroup;
    }
  | {
      kind: "writing";
      key: string;
      sortAt: string;
      item: WritingHistoryItem;
    };

type FilterValue =
  | "all"
  | "reading"
  | "listening"
  | "writing"
  | "practice"
  | "exam"
  | "cambridge"
  | "recent"
  | "practice_tests";

const filterOptions: Array<{ id: FilterValue; label: string }> = [
  { id: "all", label: "All history" },
  { id: "reading", label: "Reading" },
  { id: "listening", label: "Listening" },
  { id: "writing", label: "Writing" },
  { id: "practice", label: "Practice" },
  { id: "exam", label: "Exam" },
  { id: "cambridge", label: "Cambridge Official" },
  { id: "recent", label: "Recent Exam Papers" },
  { id: "practice_tests", label: "Exam Practice Tests" },
];

function sourceBadgeClass(source: string): string {
  if (source === "Cambridge Official") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-600";
  }
  if (source === "Recent Exam Papers") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-600";
  }
  return "border-violet-500/30 bg-violet-500/10 text-violet-600";
}

function formatDisplay(testFormat: string) {
  if (!testFormat || testFormat === "full") {
    return "Full Test";
  }
  return testFormat.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatBadgeClass(testFormat: string): string {
  if (!testFormat || testFormat === "full") {
    return "border-blue-500/30 text-blue-600 bg-blue-500/10";
  }
  return "border-slate-500/30 text-slate-600 bg-slate-500/10";
}

function formatMode(mode: AttemptRow["mode"]): string {
  return mode === "exam" ? "Exam" : "Practice";
}

function modeBadgeClass(mode: AttemptRow["mode"]): string {
  if (mode === "exam") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
  }
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
}

function typeBadgeClass(type: AttemptRow["type"]): string {
  if (type === "reading") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }
  if (type === "listening") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
}

function historyTypeCardClass(type: AttemptRow["type"]): string {
  if (type === "reading") {
    return "border-sky-500/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(14,165,233,0.02)_26%,rgba(255,255,255,0)_42%)]";
  }
  if (type === "listening") {
    return "border-amber-500/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.09),rgba(245,158,11,0.025)_26%,rgba(255,255,255,0)_42%)]";
  }
  return "border-violet-500/20 bg-[linear-gradient(135deg,rgba(139,92,246,0.09),rgba(139,92,246,0.025)_26%,rgba(255,255,255,0)_42%)]";
}

function historyTypeAccentClass(type: AttemptRow["type"]): string {
  if (type === "reading") {
    return "bg-sky-500";
  }
  if (type === "listening") {
    return "bg-amber-500";
  }
  return "bg-violet-500";
}

function formatType(type: AttemptRow["type"]): string {
  if (type === "reading") return "Reading";
  if (type === "listening") return "Listening";
  return "Writing";
}

function formatScore(attempt: AttemptRow): string {
  const score = attempt.score.trim();
  if (score.includes("/") || score === "Pending" || attempt.totalQuestions === null) {
    return score;
  }
  return `${score}/${attempt.totalQuestions}`;
}

function formatBand(attempt: AttemptRow): string {
  return attempt.testFormat === "full" ? attempt.band ?? "-" : "-";
}

function scoreValue(attempt: AttemptRow): number {
  const match = attempt.score.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : -1;
}

function bandValue(attempt: AttemptRow): number | null {
  if (!attempt.band) {
    return null;
  }
  const value = Number(attempt.band);
  return Number.isFinite(value) ? value : null;
}

function historyGroupKey(attempt: AttemptRow): string {
  return `${attempt.testId}:${attempt.type}:${attempt.testFormat}`;
}

function bestAttemptFor(attempts: AttemptRow[]): AttemptRow {
  return attempts.reduce((best, attempt) => {
    const attemptBand = bandValue(attempt);
    const bestBand = bandValue(best);
    if (attemptBand !== null || bestBand !== null) {
      const normalizedAttemptBand = attemptBand ?? -1;
      const normalizedBestBand = bestBand ?? -1;
      if (normalizedAttemptBand > normalizedBestBand) {
        return attempt;
      }
      if (normalizedAttemptBand < normalizedBestBand) {
        return best;
      }
    }
    return scoreValue(attempt) > scoreValue(best) ? attempt : best;
  }, attempts[0]);
}

function groupSubmittedAttempts(attempts: AttemptRow[]): HistoryGroup[] {
  const grouped = new Map<string, AttemptRow[]>();
  for (const attempt of attempts) {
    const key = historyGroupKey(attempt);
    const group = grouped.get(key);
    if (group) {
      group.push(attempt);
    } else {
      grouped.set(key, [attempt]);
    }
  }

  return Array.from(grouped.entries())
    .map(([key, groupAttempts]) => {
      const sortedAttempts = [...groupAttempts].sort((left, right) => attemptSortTimestamp(right) - attemptSortTimestamp(left));
      return {
        key,
        latestAttempt: sortedAttempts[0],
        bestAttempt: bestAttemptFor(sortedAttempts),
        attempts: sortedAttempts,
      };
    })
    .sort((left, right) => attemptSortTimestamp(right.latestAttempt) - attemptSortTimestamp(left.latestAttempt));
}

function matchesFilter(attempt: AttemptRow, filter: FilterValue) {
  switch (filter) {
    case "reading":
    case "listening":
    case "writing":
      return attempt.type === filter;
    case "practice":
    case "exam":
      return attempt.mode === filter;
    case "cambridge":
      return attempt.source === "Cambridge Official";
    case "recent":
      return attempt.source === "Recent Exam Papers";
    case "practice_tests":
      return attempt.source === "Exam Practice Tests";
    default:
      return true;
  }
}

function matchesWritingFilter(filter: FilterValue) {
  switch (filter) {
    case "all":
    case "writing":
      return true;
    default:
      return false;
  }
}

function exactDateTime(value: string | null | undefined): string {
  return formatDateTime(value);
}

function formatDurationLabel(seconds: number | null | undefined): string {
  const safe = Math.max(0, Math.floor(Number(seconds ?? 0)));
  const minutes = Math.floor(safe / 60);
  const remainingSeconds = safe % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

function writingBandClass(band: number) {
  if (band >= 8) return "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300";
  if (band >= 7) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (band >= 6) return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  if (band >= 5) return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
}

const HISTORY_MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function sortTimestamp(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  const match = value.match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4}), (\d{2}):(\d{2})$/);
  if (!match) {
    return 0;
  }

  const [, day, month, year, hour, minute] = match;
  const monthIndex = HISTORY_MONTHS[month];
  if (monthIndex === undefined) {
    return 0;
  }

  return Date.UTC(Number(year), monthIndex, Number(day), Number(hour), Number(minute));
}

function attemptSortTimestamp(attempt: AttemptRow): number {
  return Math.max(sortTimestamp(attempt.lastSavedAt), sortTimestamp(attempt.date));
}

function WritingHistoryRow({ item }: { item: WritingHistoryItem }) {
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

function AttemptHistoryGroup({ group }: { group: HistoryGroup }) {
  const { latestAttempt, bestAttempt } = group;

  return (
    <details
      className={cn(
        "group relative m-2 rounded-xl border bg-background shadow-sm",
        historyTypeCardClass(latestAttempt.type)
      )}
    >
      <span
        className={cn(
          "absolute bottom-4 left-0 top-4 w-1 rounded-full",
          historyTypeAccentClass(latestAttempt.type)
        )}
      />
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-4 transition-colors hover:bg-muted/20 [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(0,1.7fr)_auto_auto_auto_auto] md:items-center">
          <div className="min-w-0 space-y-2">
            <div className="truncate text-sm font-bold flex items-center gap-2">
              <span className={cn(group.attempts.some(a => a.violationCount && a.violationCount > 0) ? "text-red-500" : "text-foreground")}>{latestAttempt.testTitle}</span>
              {group.attempts.some(a => a.violationCount && a.violationCount > 0) && (
                <Badge variant="outline" className="rounded-md border-red-500/40 text-red-500 bg-red-500/10 px-1.5 py-0 text-[9px] uppercase tracking-widest shrink-0">
                  Violated
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest shadow-sm", typeBadgeClass(latestAttempt.type))}>
                {formatType(latestAttempt.type)}
              </Badge>
              <Badge variant="outline" className={cn("rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest shadow-sm", sourceBadgeClass(latestAttempt.source))}>
                {latestAttempt.source}
              </Badge>
              <Badge variant="outline" className={cn("rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest shadow-sm", formatBadgeClass(latestAttempt.testFormat))}>
                {formatDisplay(latestAttempt.testFormat)}
              </Badge>
              <Badge variant="outline" className={cn("rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest shadow-sm", modeBadgeClass(latestAttempt.mode))}>
                {formatMode(latestAttempt.mode)}
              </Badge>
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <div className="font-bold uppercase tracking-widest text-muted-foreground">Latest</div>
            <div className="font-bold text-foreground">{formatScore(latestAttempt)}</div>
            <div className="text-muted-foreground">{latestAttempt.lastSavedAt}</div>
          </div>

          <div className="space-y-1 text-xs">
            <div className="font-bold uppercase tracking-widest text-muted-foreground">Best</div>
            <div className="font-bold text-primary">{formatScore(bestAttempt)}</div>
            <div className="text-muted-foreground">Band {formatBand(bestAttempt)}</div>
          </div>

          <div className="space-y-1 text-xs">
            <div className="font-bold uppercase tracking-widest text-muted-foreground">Attempts</div>
            <div className="font-bold text-foreground">{group.attempts.length}</div>
            <div className="text-muted-foreground">{latestAttempt.timeSpent}</div>
          </div>

          <div className="flex items-center md:justify-end">
            <HistoryRetakeButton testId={latestAttempt.testId} testType={latestAttempt.type} mode={latestAttempt.mode} />
          </div>
        </div>
      </summary>

      <div className="border-t border-border/60 bg-muted/10 px-4 py-4">
        <div className="relative space-y-3 pl-5 before:absolute before:bottom-3 before:left-2 before:top-3 before:w-px before:bg-border">
          {group.attempts.map((attempt, index) => (
            <div
              key={attempt.id}
              className={cn(
                "relative rounded-lg border bg-background px-4 py-3 shadow-sm",
                attempt.violationCount && attempt.violationCount > 0
                  ? "border-red-500/40 bg-red-500/5"
                  : attempt.type === "reading"
                    ? "border-sky-500/20"
                    : attempt.type === "listening"
                    ? "border-amber-500/20"
                    : "border-violet-500/20"
              )}
            >
              <span
                className={cn(
                  "absolute -left-[17px] top-4 h-2.5 w-2.5 rounded-full border-2 border-background shadow-sm",
                  attempt.violationCount && attempt.violationCount > 0
                    ? "bg-red-500"
                    : historyTypeAccentClass(attempt.type)
                )}
              />
              <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_auto_auto_auto] md:items-center">
                <div className="min-w-0 space-y-1">
                  <div className="text-sm font-bold flex items-center gap-2">
                    <span className={cn(attempt.violationCount && attempt.violationCount > 0 ? "text-red-500" : "text-foreground")}>Attempt #{group.attempts.length - index}</span>
                    {attempt.violationCount && attempt.violationCount > 0 ? (
                      <Badge variant="outline" className="rounded-md border-red-500/40 text-red-500 bg-red-500/10 px-1.5 py-0 text-[9px] uppercase tracking-widest">
                        {attempt.violationCount} Violation{attempt.violationCount > 1 ? "s" : ""}
                      </Badge>
                    ) : null}
                  </div>
                  <div className={cn("text-xs", attempt.violationCount && attempt.violationCount > 0 ? "text-red-500/70" : "text-muted-foreground")}>{attempt.lastSavedAt}</div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="font-bold uppercase tracking-widest text-muted-foreground">Mode</div>
                  <div className="font-semibold text-foreground">{formatMode(attempt.mode)}</div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="font-bold uppercase tracking-widest text-muted-foreground">Score</div>
                  <div className="font-bold text-foreground">{formatScore(attempt)}</div>
                </div>
                <div className="flex items-center justify-between gap-3 md:justify-end">
                  <div className="space-y-1 text-xs">
                    <div className="font-bold uppercase tracking-widest text-muted-foreground">Time</div>
                    <div className="font-semibold text-foreground">{attempt.timeSpent}</div>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg border-border/60 bg-background px-3 text-[11px] font-bold"
                  >
                    <Link href={`/attempts/${attempt.id}/result`}>Review</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

export function HistoryClient({
  attempts,
  writingHistory,
}: {
  attempts: AttemptRow[];
  writingHistory: WritingHistoryItem[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const historyEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filteredAttempts = attempts.filter((attempt) => {
      if (!matchesFilter(attempt, filter)) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return [
        attempt.testTitle,
        attempt.lastSavedAt,
        attempt.source,
        attempt.type,
        attempt.mode,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
    const filteredWritingItems = writingHistory.filter((item) => {
      if (!matchesWritingFilter(filter)) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return [
        item.task_title,
        item.task_type,
        String(item.status ?? ""),
        exactDateTime(item.submitted_at),
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });

    const entries: HistoryEntry[] = [
      ...groupSubmittedAttempts(filteredAttempts).map((group) => ({
        kind: "attempt" as const,
        key: group.key,
        sortAt: group.latestAttempt.lastSavedAt || group.latestAttempt.date,
        group,
      })),
      ...filteredWritingItems.map((item) => ({
        kind: "writing" as const,
        key: item.submission_id,
        sortAt: item.submitted_at ?? item.graded_at ?? "",
        item,
      })),
    ];

    return entries.sort((left, right) => sortTimestamp(right.sortAt) - sortTimestamp(left.sortAt));
  }, [attempts, filter, query, writingHistory]);
  const selectedFilter = filterOptions.find((option) => option.id === filter) ?? filterOptions[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="overflow-visible bg-background border border-border/50 relative z-20 rounded-2xl shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

        <CardHeader className="space-y-1 relative z-10 p-5 lg:px-6 border-b border-border/40 bg-muted/5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">History</CardTitle>
              <CardDescription className="text-muted-foreground text-sm font-medium">
                Reading, listening, and writing activity in one list.
              </CardDescription>
            </div>
            <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_auto] p-4 lg:px-6 relative z-10 bg-background/50">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title or submitted time..."
              className="pl-10 h-10 text-sm border-border/60 bg-muted/20 text-foreground rounded-lg transition-all focus:bg-background"
            />
          </div>

          <div className="relative w-full md:w-[240px]" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen((current) => !current)}
              className={cn(
                "flex h-10 w-full items-center gap-3 rounded-xl border px-4 text-left transition-all duration-300 outline-none",
                isFilterOpen
                  ? "bg-background border-slate-400 dark:border-slate-600 ring-4 ring-slate-400/10 dark:ring-slate-600/10 shadow-md"
                  : "bg-card/40 border-border/60 hover:border-slate-400/50 hover:bg-card shadow-sm",
                filter !== "all" && !isFilterOpen && "border-slate-500/30 bg-slate-500/5"
              )}
            >
              <Filter className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                filter !== "all" || isFilterOpen ? "text-slate-700 dark:text-slate-300" : "text-muted-foreground/60"
              )} />
              <span className={cn(
                "flex-1 truncate text-[13px] font-bold",
                filter !== "all" ? "text-foreground" : "text-muted-foreground"
              )}>
                {selectedFilter.label}
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-300",
                isFilterOpen && "rotate-180 text-slate-700 dark:text-slate-300"
              )} />
            </button>

            <div className={cn(
              "absolute right-0 top-[calc(100%+8px)] z-[100] w-full min-w-[260px] origin-top-right rounded-2xl border border-border bg-card p-1.5 shadow-2xl shadow-black/10 transition-all duration-200",
              isFilterOpen
                ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-2 scale-95 opacity-0"
            )}>
              <div className="space-y-0.5">
                {filterOptions.map((option) => {
                  const isSelected = filter === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setFilter(option.id);
                        setIsFilterOpen(false);
                      }}
                      className={cn(
                        "group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all",
                        isSelected
                          ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span>{option.label}</span>
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      ) : (
                        <div className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-20">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="divide-y divide-border/60">
          {historyEntries.map((entry) =>
            entry.kind === "attempt" ? (
              <AttemptHistoryGroup key={entry.key} group={entry.group} />
            ) : (
              <WritingHistoryRow key={entry.key} item={entry.item} />
            )
          )}

          {historyEntries.length === 0 && (
            <div className="p-4">
              <EmptyState
                icon="search"
                title="No matching history found"
                description="Try another keyword, change the filter, or complete a new practice task."
                action={{ href: "/tests", label: "Start a test" }}
                secondaryAction={{ href: "/writing", label: "Practice writing" }}
                compact
                className="border-0 bg-transparent shadow-none"
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
