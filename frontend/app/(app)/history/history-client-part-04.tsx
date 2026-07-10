"use client";

import { Badge, Button, ChevronDown, HistoryRetakeButton, Link, cn } from "./history-client-dependencies";
import { HistoryGroup, formatBadgeClass, formatBand, formatDisplay, formatMode, formatScore, formatType, historyTypeAccentClass, historyTypeCardClass, modeBadgeClass, sourceBadgeClass, typeBadgeClass } from "./history-client-part-01";

export function AttemptHistoryGroup({ group }: { group: HistoryGroup }) {
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
            <HistoryRetakeButton
              testId={latestAttempt.testId}
              testType={latestAttempt.type}
              mode={latestAttempt.mode}
              testFormat={latestAttempt.testFormat}
            />
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
