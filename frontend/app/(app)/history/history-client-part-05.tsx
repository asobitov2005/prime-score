"use client";

import { AttemptRow, Card, CardContent, CardDescription, CardHeader, CardTitle, Check, ChevronDown, EmptyState, Filter, Input, Search, WritingHistoryItem, cn, useEffect, useMemo, useRef, useState } from "./history-client-dependencies";
import { FilterValue, HistoryEntry, filterOptions } from "./history-client-part-01";
import { exactDateTime, groupSubmittedAttempts, matchesFilter, matchesWritingFilter, sortTimestamp } from "./history-client-part-02";
import { WritingHistoryRow } from "./history-client-part-03";
import { AttemptHistoryGroup } from "./history-client-part-04";

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
