"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Medal, Minus, Trophy, TrendingUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createApiClient } from "@/lib/api/client";
import type { LeaderboardEntry, LeaderboardResponseData, TestType } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

type TypeFilter = "combined" | TestType;

function ordinalSuffix(value: number): string {
  const remainder100 = value % 100;
  if (remainder100 >= 11 && remainder100 <= 13) {
    return "th";
  }

  const remainder10 = value % 10;
  if (remainder10 === 1) return "st";
  if (remainder10 === 2) return "nd";
  if (remainder10 === 3) return "rd";
  return "th";
}

function formatPercentile(value: number): string {
  const rounded = Math.max(1, Math.min(99, Math.round(value)));
  return `${rounded}${ordinalSuffix(rounded)}`;
}

function formatLastActive(value: string | null): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(parsed);
}

function topRankIcon(rank: number) {
  if (rank === 1) {
    return <Trophy className="h-5 w-5 text-amber-500 drop-shadow-sm" />;
  }
  if (rank === 2) {
    return <Medal className="h-5 w-5 text-slate-400 drop-shadow-sm" />;
  }
  if (rank === 3) {
    return <Medal className="h-5 w-5 text-orange-600/80 drop-shadow-sm" />;
  }
  return null;
}

function entryInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";
}

function EntryRow({
  entry,
  isCurrentUser = false,
}: {
  entry: LeaderboardEntry;
  isCurrentUser?: boolean;
}) {
  const trophyIcon = topRankIcon(entry.rank);
  const percentileTone =
    entry.percentile >= 90
      ? "text-emerald-600 dark:text-emerald-400"
      : entry.percentile >= 70
        ? "text-sky-600 dark:text-sky-400"
        : entry.percentile >= 50
          ? "text-amber-600 dark:text-amber-400"
          : "text-rose-600 dark:text-rose-400";

  return (
    <div
      className={cn(
        "grid grid-cols-[44px_minmax(0,1.2fr)_92px_78px] gap-3 px-4 py-4 transition-colors md:grid-cols-[56px_minmax(0,1.8fr)_112px_96px_108px_108px_72px_92px_86px] md:px-6",
        isCurrentUser ? "bg-primary/[0.04]" : "hover:bg-muted/25",
      )}
    >
      <div className="flex items-center justify-center">
        {trophyIcon ? (
          trophyIcon
        ) : (
          <span className={cn("text-sm font-bold", isCurrentUser ? "text-primary" : "text-muted-foreground")}>
            {entry.rank}
          </span>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            isCurrentUser ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground",
          )}
        >
          {isCurrentUser ? "You" : entryInitials(entry.name)}
        </div>
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-bold md:text-base", isCurrentUser ? "text-primary" : "text-foreground")}>
            {isCurrentUser ? "Your Ranking" : entry.name}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:hidden">
            {entry.attempts} tests
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end justify-center md:items-center">
        <p className={cn("text-lg font-black tracking-tight md:text-xl", percentileTone)}>
          {formatPercentile(entry.percentile)}
        </p>
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">percentile</p>
      </div>

      <div className="flex items-center justify-end md:justify-center">
        <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2.5 py-1 font-mono text-xs font-bold tracking-tight text-foreground">
          {entry.estimatedBand ?? "—"}
        </span>
      </div>

      <div className="hidden items-center justify-center md:flex">
        <span className="font-semibold text-foreground">{entry.readingScore ?? "—"}</span>
      </div>

      <div className="hidden items-center justify-center md:flex">
        <span className="font-semibold text-foreground">{entry.listeningScore ?? "—"}</span>
      </div>

      <div className="hidden items-center justify-center md:flex">
        <span className="font-semibold text-foreground">{entry.attempts}</span>
      </div>

      <div className="hidden items-center justify-center md:flex">
        <span className="font-semibold text-foreground">
          {entry.avgAccuracy !== null && entry.avgAccuracy !== undefined ? `${Math.round(entry.avgAccuracy)}%` : "—"}
        </span>
      </div>

      <div className="hidden items-center justify-end md:flex">
        <span className="text-sm font-semibold text-muted-foreground">{formatLastActive(entry.lastActiveAt)}</span>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("combined");
  const api = useMemo(() => createApiClient(), []);
  const { userId, accessToken } = useAuthStore();

  const query = useQuery<LeaderboardResponseData>({
    queryKey: ["leaderboard", userId, typeFilter],
    queryFn: () => api.getLeaderboard({ type: typeFilter, period: "all_time" }),
    staleTime: 60_000,
    enabled: Boolean(accessToken || userId),
  });

  const top10 = query.data?.items.slice(0, 10) ?? [];
  const currentUser = query.data?.currentUser ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-background shadow-sm">
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-sky-500/40 via-violet-500/70 to-emerald-500/40" />
        <div className="relative z-10 space-y-1 bg-muted/5 p-5 lg:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">Leaderboard</h1>
              <p className="text-sm font-medium text-muted-foreground">
                Ranked by percentile using weighted Listening and Reading Z-scores for fair comparison.
              </p>
            </div>
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary md:flex">
              <Trophy className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-16 z-40 bg-background/95 pb-4 backdrop-blur-md md:top-20">
        <div className="flex w-full items-center overflow-x-auto rounded-[1.25rem] border border-border/50 bg-muted/40 p-1.5 shadow-inner no-scrollbar md:w-max">
          {[
            { id: "combined", label: "Overall" },
            { id: "reading", label: "Reading" },
            { id: "listening", label: "Listening" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id as TypeFilter)}
              className={cn(
                "flex-1 whitespace-nowrap rounded-xl px-5 py-2.5 text-[14px] font-black transition-all sm:flex-none",
                typeFilter === tab.id
                  ? "scale-[1.02] bg-primary text-primary-foreground shadow-[0_4px_14px_-2px_rgba(var(--primary),0.4)]"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-lg shadow-black/5 backdrop-blur-xl">
        <div className="grid grid-cols-[44px_minmax(0,1.2fr)_92px_78px] gap-3 border-b border-border/50 bg-muted/20 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground md:grid-cols-[56px_minmax(0,1.8fr)_112px_96px_108px_108px_72px_92px_86px] md:px-6">
          <div className="text-center">Rank</div>
          <div>Candidate</div>
          <div className="text-right md:text-center">Percentile</div>
          <div className="text-right md:text-center">Band</div>
          <div className="hidden text-center md:block">Reading</div>
          <div className="hidden text-center md:block">Listening</div>
          <div className="hidden text-center md:block">Tests</div>
          <div className="hidden text-center md:block">Avg Acc</div>
          <div className="hidden text-right md:block">Last Active</div>
        </div>

        <div className="p-0">
          <div className="divide-y divide-border/40">
            {query.isLoading ? (
              <div className="flex justify-center p-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : query.isError ? (
              <div className="p-12 text-center text-sm font-bold text-muted-foreground">
                Unable to load live leaderboard right now.
              </div>
            ) : top10.length > 0 ? (
              top10.map((entry) => <EntryRow key={`${entry.rank}-${entry.userId}`} entry={entry} />)
            ) : (
              <div className="p-12 text-center text-sm font-bold text-muted-foreground">
                No ranking data available yet.
              </div>
            )}
          </div>

          {currentUser ? (
            <div className="relative overflow-hidden border-t-2 border-primary/20 bg-primary/[0.03]">
              <div className="absolute bottom-0 left-0 top-0 w-1 bg-primary" />
              {currentUser.rank > 10 ? (
                <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border/50 bg-background px-2 py-0.5 text-muted-foreground shadow-sm">
                  <Minus className="h-4 w-4" />
                </div>
              ) : null}
              <div className="mt-2">
                <EntryRow entry={currentUser} isCurrentUser />
              </div>
              <div className="flex items-center justify-center gap-1.5 pb-3 text-[10px] font-bold uppercase tracking-widest text-primary/70">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                Current
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
