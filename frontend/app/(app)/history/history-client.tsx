"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AttemptRow } from "@/lib/types";
import { HistoryRetakeButton } from "./retake-button";
import { cn } from "@/lib/utils";

type HistoryGroup = {
  key: string;
  latestAttempt: AttemptRow;
  bestAttempt: AttemptRow;
  attempts: AttemptRow[];
};

type FilterValue =
  | "all"
  | "reading"
  | "listening"
  | "practice"
  | "exam"
  | "cambridge"
  | "recent"
  | "practice_tests";

const filterOptions: Array<{ id: FilterValue; label: string }> = [
  { id: "all", label: "All attempts" },
  { id: "reading", label: "Reading" },
  { id: "listening", label: "Listening" },
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
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function historyTypeCardClass(type: AttemptRow["type"]): string {
  if (type === "reading") {
    return "border-sky-500/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(14,165,233,0.02)_26%,rgba(255,255,255,0)_42%)]";
  }
  return "border-amber-500/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.09),rgba(245,158,11,0.025)_26%,rgba(255,255,255,0)_42%)]";
}

function historyTypeAccentClass(type: AttemptRow["type"]): string {
  if (type === "reading") {
    return "bg-sky-500";
  }
  return "bg-amber-500";
}

function formatType(type: AttemptRow["type"]): string {
  return type === "reading" ? "Reading" : "Listening";
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

  return Array.from(grouped.entries()).map(([key, groupAttempts]) => ({
    key,
    latestAttempt: groupAttempts[0],
    bestAttempt: bestAttemptFor(groupAttempts),
    attempts: groupAttempts,
  }));
}

function matchesFilter(attempt: AttemptRow, filter: FilterValue) {
  switch (filter) {
    case "reading":
    case "listening":
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

export function HistoryClient({ attempts }: { attempts: AttemptRow[] }) {
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

  const historyGroups = useMemo(() => {
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
    return groupSubmittedAttempts(filteredAttempts);
  }, [attempts, filter, query]);
  const selectedFilter = filterOptions.find((option) => option.id === filter) ?? filterOptions[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="overflow-visible bg-background border border-border/50 relative z-20 rounded-2xl shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

        <CardHeader className="space-y-1 relative z-10 p-5 lg:px-6 border-b border-border/40 bg-muted/5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Test History</CardTitle>
              <CardDescription className="text-muted-foreground text-sm font-medium">
                Analyze your past performance, track progress, and revisit mistakes.
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
              placeholder="Search by test title or submitted time..."
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
          {historyGroups.map((group) => {
            const { latestAttempt, bestAttempt } = group;
            return (
              <details
                key={group.key}
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
                      <div className="truncate text-sm font-bold text-foreground">{latestAttempt.testTitle}</div>
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
                          attempt.type === "reading"
                            ? "border-sky-500/20"
                            : "border-amber-500/20"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute -left-[17px] top-4 h-2.5 w-2.5 rounded-full border-2 border-background shadow-sm",
                            historyTypeAccentClass(attempt.type)
                          )}
                        />
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_auto_auto_auto] md:items-center">
                          <div className="min-w-0 space-y-1">
                            <div className="text-sm font-bold text-foreground">Attempt #{group.attempts.length - index}</div>
                            <div className="text-xs text-muted-foreground">{attempt.lastSavedAt}</div>
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
          })}

          {historyGroups.length === 0 && (
            <div className="px-4 py-10 text-center">
              <div className="text-sm font-bold text-foreground">No matching attempts found.</div>
              <div className="mt-1 text-xs text-muted-foreground">Try another keyword or change the filter.</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
