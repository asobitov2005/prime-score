import Link from "next/link";
import { ChevronDown, Download, Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSubmittedAttempts } from "@/lib/server-me";
import type { AttemptRow } from "@/lib/types";
import { HistoryRetakeButton } from "./retake-button";
import { cn } from "@/lib/utils";

type HistoryGroup = {
  key: string;
  latestAttempt: AttemptRow;
  bestAttempt: AttemptRow;
  attempts: AttemptRow[];
};

function sourceBadgeClass(source: string): string {
  if (source === "Cambridge Official") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-600";
  }
  if (source === "Real Exam Material") {
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
    attempts: groupAttempts
  }));
}

export default async function HistoryPage() {
  const attempts = await getSubmittedAttempts();
  const historyGroups = groupSubmittedAttempts(attempts);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <Card className="overflow-hidden bg-background border border-border/50 relative rounded-2xl shadow-sm">
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
            <Input placeholder="Search by test title or submitted time..." className="pl-10 h-10 text-sm border-border/60 bg-muted/20 text-foreground rounded-lg transition-all focus:bg-background" />
          </div>

          <Button variant="outline" size="sm" className="h-10 px-4 text-xs font-bold rounded-lg border-border/60 bg-muted/20 hover:bg-muted/40">
            <Filter className="h-3.5 w-3.5 mr-2" />
            Filters
          </Button>

        </CardContent>
      </Card>


      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="divide-y divide-border/60">
          {historyGroups.map((group) => {
            const { latestAttempt, bestAttempt } = group;
            return (
              <details key={group.key} className="group bg-background">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 transition-colors hover:bg-muted/20 [&::-webkit-details-marker]:hidden">
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(0,1.8fr)_auto_auto_auto] md:items-center">
                    <div className="min-w-0 space-y-2">
                      <div className="truncate text-sm font-bold text-foreground">{latestAttempt.testTitle}</div>
                      <div className="flex flex-wrap items-center gap-2">
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
                  </div>
                </summary>

                <div className="border-t border-border/40 bg-muted/10 px-4 py-4">
                  <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                    <HistoryRetakeButton testId={latestAttempt.testId} testType={latestAttempt.type} mode={latestAttempt.mode} />
                    <Button
                      asChild
                      size="sm"
                      className="h-8 rounded-lg bg-primary px-3 text-[11px] font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                      <Link href={`/attempts/${latestAttempt.id}/result`}>Review latest</Link>
                    </Button>
                  </div>

                  <div className="relative space-y-3 pl-5 before:absolute before:bottom-3 before:left-2 before:top-3 before:w-px before:bg-border">
                    {group.attempts.map((attempt, index) => (
                      <div key={attempt.id} className="relative rounded-lg border border-border/60 bg-background px-4 py-3 shadow-sm">
                        <span className="absolute -left-[17px] top-4 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary shadow-sm" />
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
              <div className="text-sm font-bold text-foreground">No submitted attempts yet.</div>
              <div className="mt-1 text-xs text-muted-foreground">Completed Reading and Listening attempts will appear here.</div>
            </div>
          )}
        </div>
        <div className="flex justify-end p-4 border-t border-border/40 bg-muted/5">
          <Button variant="outline" size="sm" className="h-9 text-xs font-bold">
            <Download className="h-3.5 w-3.5 mr-2" />
            Export CSV
          </Button>
        </div>
      </Card>
    </div>
  );
}
