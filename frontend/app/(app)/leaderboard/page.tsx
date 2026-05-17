"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, Loader2, Medal, Sparkles, Trophy } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { createApiClient } from "@/lib/api/client";
import type { LeaderboardEntry, LeaderboardResponseData, LeaderboardPeriod } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function entryInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";
}

function topRankIcon(rank: number) {
  if (rank === 1) {
    return <Trophy className="h-5 w-5 text-amber-500" />;
  }
  if (rank === 2) {
    return <Medal className="h-5 w-5 text-slate-400" />;
  }
  if (rank === 3) {
    return <Medal className="h-5 w-5 text-orange-600/80" />;
  }
  return null;
}

function EntryRow({ entry, isCurrentUser = false }: { entry: LeaderboardEntry; isCurrentUser?: boolean }) {
  const icon = topRankIcon(entry.rank);
  return (
    <div
      className={cn(
        "grid grid-cols-[48px_minmax(0,1.4fr)_88px_78px] gap-3 px-4 py-4 md:grid-cols-[56px_minmax(0,1.6fr)_110px_88px_110px_138px] md:px-6",
        isCurrentUser ? "bg-primary/[0.05]" : "hover:bg-muted/25",
      )}
    >
      <div className="flex items-center justify-center">
        {entry.rank === 0 ? (
          <span className="text-xs font-semibold text-muted-foreground">—</span>
        ) : icon ? (
          icon
        ) : (
          <span className={cn("text-sm font-bold", isCurrentUser ? "text-primary" : "text-muted-foreground")}>
            {entry.rank}
          </span>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}>
          {entry.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.avatarUrl} alt={entry.name} className="h-full w-full rounded-full object-cover" />
          ) : (
            entryInitials(isCurrentUser ? "You" : entry.name)
          )}
        </div>
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-bold md:text-base", isCurrentUser ? "text-primary" : "text-foreground")}>
            {isCurrentUser ? "Your Ranking" : entry.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted-foreground">
            <span>Level {entry.level}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span>{entry.currentStreak} day streak</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end md:justify-center">
        <span className="text-lg font-black tracking-tight text-foreground">{formatNumber(entry.xp)}</span>
      </div>

      <div className="flex items-center justify-end md:justify-center">
        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-xs font-bold text-foreground">
          <Flame className="h-3.5 w-3.5 text-orange-500" />
          {entry.currentStreak}
        </span>
      </div>

      <div className="hidden items-center justify-center md:flex">
        <span className="font-semibold text-foreground">{entry.averageScore?.toFixed(1) ?? "—"}</span>
      </div>

      <div className="hidden items-center justify-end md:flex">
        <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-xs font-bold text-muted-foreground">
          {entry.badge ?? "No badge"}
        </span>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const api = useMemo(() => createApiClient(), []);
  const { userId, accessToken } = useAuthStore();

  const query = useQuery<LeaderboardResponseData>({
    queryKey: ["leaderboard", userId, period],
    queryFn: () => api.getLeaderboard({ period }),
    staleTime: 60_000,
    enabled: Boolean(accessToken || userId),
  });

  const topRows = query.data?.items.slice(0, 25) ?? [];
  const currentUser = query.data?.currentUser ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/80 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-amber-400" />
        <div className="relative z-10 space-y-4 p-5 lg:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                PrimeScore XP
              </div>
              <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">Leaderboard</h1>
              <p className="max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
                XP rewards quality, improvement, streaks, and real IELTS practice. Spam, repeated farming, and flagged activity do not help you climb.
              </p>
            </div>
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground md:flex">
              <Trophy className="h-5 w-5" />
            </div>
          </div>

          <div className="flex w-full items-center overflow-x-auto rounded-[1.25rem] border border-border/50 bg-muted/40 p-1.5 shadow-inner no-scrollbar md:w-max">
            {[
              { id: "week", label: "Weekly" },
              { id: "month", label: "Monthly" },
              { id: "all_time", label: "All-time" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id as LeaderboardPeriod)}
                className={cn(
                  "flex-1 whitespace-nowrap rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-all sm:flex-none",
                  period === tab.id
                    ? "scale-[1.02] bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:bg-background hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-lg shadow-black/5 backdrop-blur-xl">
        <div className="grid grid-cols-[48px_minmax(0,1.4fr)_88px_78px] gap-3 border-b border-border/50 bg-muted/20 px-4 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:grid-cols-[56px_minmax(0,1.6fr)_110px_88px_110px_138px] md:px-6">
          <div className="text-center">Rank</div>
          <div>User</div>
          <div className="text-right md:text-center">XP</div>
          <div className="text-right md:text-center">Streak</div>
          <div className="hidden text-center md:block">Avg Score</div>
          <div className="hidden text-right md:block">Badge</div>
        </div>

        <div className="divide-y divide-border/40">
          {query.isLoading ? (
            <div className="flex justify-center p-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : query.isError ? (
            <div className="p-4">
              <EmptyState
                icon="medal"
                title="Leaderboard is unavailable"
                description="We could not load live XP rankings right now. Try refreshing in a moment."
                compact
                className="border-0 bg-transparent shadow-none"
              />
            </div>
          ) : topRows.length > 0 ? (
            topRows.map((entry) => <EntryRow key={`${entry.rank}-${entry.userId}`} entry={entry} />)
          ) : (
            <div className="p-4">
              <EmptyState
                icon="trophy"
                title="No XP rankings yet"
                description="Complete meaningful practice to appear on the PrimeScore XP leaderboard."
                action={{ href: "/tests", label: "Start practice" }}
                compact
                className="border-0 bg-transparent shadow-none"
              />
            </div>
          )}
        </div>

        {currentUser ? (
          <div className="border-t-2 border-primary/20 bg-primary/[0.03]">
            <EntryRow entry={currentUser} isCurrentUser />
          </div>
        ) : null}
      </div>
    </div>
  );
}
