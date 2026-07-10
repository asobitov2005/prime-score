"use client";

import { Flame, LeaderboardEntry, cn } from "./page-dependencies";
import { entryInitials, formatNumber, leaderboardBadgeImage, leaderboardBadgeTextClass, topRankIcon } from "./page-part-01";

export function EntryRow({ entry, isCurrentUser = false, onClick }: { entry: LeaderboardEntry; isCurrentUser?: boolean; onClick?: () => void }) {
  const icon = topRankIcon(entry.rank);
  const badgeImage = leaderboardBadgeImage(entry.badge);
  const badgeTextClass = leaderboardBadgeTextClass(entry.badge);
  return (
    <div
      onClick={onClick}
      className={cn(
        "grid grid-cols-[48px_minmax(0,1.4fr)_88px_78px] gap-3 px-4 py-4 md:grid-cols-[56px_minmax(0,1.6fr)_110px_88px_110px_138px] md:px-6 cursor-pointer transition-colors",
        isCurrentUser ? "bg-primary/[0.05]" : "hover:bg-muted/30"
      )}
    >
      <div className="flex items-center justify-center">
        {icon ? (
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
            entryInitials(entry.name)
          )}
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-bold text-foreground md:text-base">
              {entry.name}
            </p>
            {isCurrentUser ? (
              <span className="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 ring-1 ring-orange-200/80">
                You
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted-foreground">
            <span>Level {entry.level}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span>{entry.currentStreak} day streak</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end md:justify-center">
        <span className="text-lg font-semibold tracking-tight text-foreground">{formatNumber(entry.xp)}</span>
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

      <div className="hidden items-center justify-center md:flex">
        {entry.badge ? (
          <span className="inline-flex max-w-[138px] flex-col items-center justify-center gap-1 px-2 py-0.5 text-center">
            {badgeImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={badgeImage} alt={entry.badge} className="h-9 w-9 shrink-0 object-contain" />
            ) : null}
            <span className={cn("max-w-full truncate text-[11px] font-bold leading-none", badgeTextClass)}>
              {entry.badge}
            </span>
          </span>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">No badge</span>
        )}
      </div>
    </div>
  );
}

export function LeaderboardRowsSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[48px_minmax(0,1.4fr)_88px_78px] gap-3 px-4 py-4 md:grid-cols-[56px_minmax(0,1.6fr)_110px_88px_110px_138px] md:px-6"
        >
          <div className="flex items-center justify-center">
            <div className="h-5 w-7 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-muted animate-pulse" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-44 max-w-full rounded-full bg-muted animate-pulse" />
              <div className="h-3 w-32 max-w-full rounded-full bg-muted animate-pulse" />
            </div>
          </div>
          <div className="flex items-center justify-end md:justify-center">
            <div className="h-5 w-16 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="flex items-center justify-end md:justify-center">
            <div className="h-7 w-16 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="hidden items-center justify-center md:flex">
            <div className="h-5 w-12 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="hidden items-center justify-center md:flex">
            <div className="h-10 w-16 rounded-xl bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </>
  );
}
