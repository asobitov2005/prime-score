"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, Medal, Trophy } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { createApiClient } from "@/lib/api/client";
import type { LeaderboardEntry, LeaderboardResponseData, LeaderboardPeriod } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { LeaderboardUserProfileModal, type UserProfileModalData, type Rarity } from "@/components/leaderboard/user-profile-modal";
import type { LeaderboardUserProfileResponse } from "@/lib/api/types";

const BADGE_IMAGE_BY_TITLE: Record<string, string> = {
  "Bronze Learner": "/badges/level/badge-level-bronze-learner.png",
  "Silver Scholar": "/badges/level/badge-level-silver-scholar.png",
  "Gold Achiever": "/badges/level/badge-level-gold-achiever.png",
  "Platinum Master": "/badges/level/badge-level-platinum-master.png",
  "Prime Legend": "/badges/level/badge-level-prime-legend.png",
  "3 Day Streak": "/badges/streak/day-3.png",
  "7 Day Warrior": "/badges/streak/day-7.png",
  "14 Day Consistent Learner": "/badges/streak/day-14.png",
  "30 Day Streak": "/badges/streak/day-30.png",
  "60 Day Discipline Master": "/badges/streak/day-60.png",
  "90 Day Unbreakable": "/badges/streak/day-60.png",
  "180 Day Iron Mind": "/badges/streak/day-180.png",
  "365 Day Prime Legend": "/badges/streak/day-360.png",
  "Reading Beast": "/badges/skill/reading.png",
  "Perfect Listening": "/badges/skill/listening.png",
  "Writing Excellence": "/badges/skill/writing.png",
  "Speaking Elite": "/badges/skill/speaking.png",
  "Accuracy Monster": "/badges/performance/performance-accuracy-monster.png",
  "Mock Warrior": "/badges/special/special-mock-warrior.png",
  "Mock Addict": "/badges/special/special-mock-addict.png",
  "Early Supporter": "/badges/special/special-early-supporter.png",
  "Weekly Top 10": "/badges/special/special-weekly-top-10.png",
  "Rank #1": "/badges/special/special-rank-1.png",
  "Top 1%": "/badges/special/special-top-1.png",
  "XP Hunter": "/badges/special/special-xp-hunter.png",
  "XP Machine": "/badges/special/special-xp-machine.png",
  "Weekend Grinder": "/badges/special/special-weekend-grinder.png",
  "Early Bird": "/badges/special/special-early-bird.png",
  "Night Owl": "/badges/special/special-night-owl.png",
};

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

function leaderboardBadgeImage(badge: string | null): string | null {
  if (!badge) {
    return null;
  }
  const aliases: Record<string, string> = {
    "Consistency Builder": "/badges/streak/day-7.png",
    "Mock Master": "/badges/special/special-mock-warrior.png",
  };
  return BADGE_IMAGE_BY_TITLE[badge] ?? aliases[badge] ?? null;
}

function leaderboardBadgeTextClass(badge: string | null): string {
  switch (badge) {
    case "Bronze Learner":
      return "text-orange-700";
    case "Silver Scholar":
      return "text-slate-500";
    case "Gold Achiever":
      return "text-amber-600";
    case "Platinum Master":
      return "text-cyan-600";
    case "Prime Legend":
      return "text-violet-600";
    case "30 Day Streak":
    case "Consistency Builder":
      return "text-orange-600";
    case "Mock Master":
      return "text-indigo-600";
    default:
      return "text-muted-foreground";
  }
}

function normalizeRarity(value?: string | null): Rarity {
  if (value === "Legendary" || value === "Mythic" || value === "Epic" || value === "Rare" || value === "Common") {
    return value;
  }
  return "Common";
}

function mapLeaderboardProfileCatalog(profile: LeaderboardUserProfileResponse): UserProfileModalData {
  const equippedBadgeTitle = profile.equipped_badge?.title ?? "No badge equipped";

  return {
    avatarUrl: profile.avatar_url ?? undefined,
    username: profile.display_name,
    level: profile.level,
    totalXp: profile.total_xp,
    rank: profile.rank,
    isOnline: profile.is_online,
    isPremium: profile.is_premium,
    equippedBadge: {
      image: profile.equipped_badge?.image ?? leaderboardBadgeImage(profile.equipped_badge?.title ?? null) ?? undefined,
      title: equippedBadgeTitle,
      tagline: profile.equipped_badge?.tagline ?? "Complete more practice to unlock your first badge.",
      rarity: normalizeRarity(profile.equipped_badge?.rarity),
    },
    activeTitles: profile.active_titles.length > 0 ? profile.active_titles : [],
    stats: {
      longestStreak: profile.stats.longest_streak,
      highestBand: profile.stats.highest_band ?? 0,
      totalMockTests: profile.stats.total_mock_tests,
      totalStudyHours: profile.stats.total_study_hours,
      accuracy: profile.stats.accuracy ?? 0,
      achievementsUnlocked: profile.stats.achievements_unlocked,
    },
    achievements: profile.achievements.map((achievement) => ({
      id: achievement.id,
      image: achievement.image ?? leaderboardBadgeImage(achievement.title) ?? undefined,
      title: achievement.title,
      rarity: normalizeRarity(achievement.rarity),
    })),
  };
}

function EntryRow({ entry, isCurrentUser = false, onClick }: { entry: LeaderboardEntry; isCurrentUser?: boolean; onClick?: () => void }) {
  const icon = topRankIcon(entry.rank);
  const badgeImage = entry.badgeImage ?? leaderboardBadgeImage(entry.badge);
  const badgeTextClass = leaderboardBadgeTextClass(entry.badge);
  return (
    <div
      onClick={onClick}
      className={cn(
        "grid grid-cols-[40px_minmax(0,1fr)_auto] gap-3 px-3 py-4 md:grid-cols-[56px_minmax(0,1.6fr)_110px_88px_110px_138px] md:gap-3 md:px-6 cursor-pointer transition-colors",
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

      <div className="flex items-baseline justify-end gap-1 md:justify-center">
        <span className="text-lg font-semibold tracking-tight text-foreground">{formatNumber(entry.xp)}</span>
        <span className="text-[11px] font-bold text-muted-foreground md:hidden">XP</span>
      </div>

      <div className="hidden items-center justify-end md:flex md:justify-center">
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

function MobileRankBadge({ rank }: { rank: number }) {
  if (rank > 3) {
    return <span className="text-[15px] font-bold tabular-nums text-muted-foreground">{rank}</span>;
  }
  const styles: Record<number, string> = {
    1: "bg-gradient-to-br from-amber-300 to-amber-500 shadow-amber-500/40",
    2: "bg-gradient-to-br from-slate-300 to-slate-400 shadow-slate-400/40",
    3: "bg-gradient-to-br from-orange-300 to-orange-500 shadow-orange-500/40",
  };
  return (
    <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-white shadow-md", styles[rank])}>
      {rank}
    </span>
  );
}

function MobileEntryRow({ entry, isCurrentUser = false, onClick }: { entry: LeaderboardEntry; isCurrentUser?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/50",
        isCurrentUser ? "bg-primary/[0.06]" : "hover:bg-muted/30",
      )}
    >
      <div className="flex w-8 shrink-0 items-center justify-center">
        <MobileRankBadge rank={entry.rank} />
      </div>

      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold",
          isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {entry.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.avatarUrl} alt={entry.name} className="h-full w-full rounded-full object-cover" />
        ) : (
          entryInitials(entry.name)
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-sm font-bold text-foreground">{entry.name}</p>
          {isCurrentUser ? (
            <span className="shrink-0 rounded-full bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold text-orange-700 ring-1 ring-orange-200/80 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
              You
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
          <span>Lvl {entry.level}</span>
          <span className="inline-flex items-center gap-1">
            <Flame className="h-3 w-3 text-orange-500" />
            {entry.currentStreak}
          </span>
        </div>
      </div>

      <div className="shrink-0 pl-1 text-right">
        <p className="text-[15px] font-extrabold tracking-tight tabular-nums text-foreground">{formatNumber(entry.xp)}</p>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">XP</p>
      </div>
    </button>
  );
}

function LeaderboardRowsSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[40px_minmax(0,1fr)_auto] gap-3 px-3 py-4 md:grid-cols-[56px_minmax(0,1.6fr)_110px_88px_110px_138px] md:px-6"
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
          <div className="hidden items-center justify-end md:flex md:justify-center">
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

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("all_time");
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);

  const api = useMemo(() => createApiClient(), []);
  const { userId, hasHydrated, isAuthenticated } = useAuthStore();

  const query = useQuery<LeaderboardResponseData>({
    queryKey: ["leaderboard", userId, period],
    queryFn: () => api.getLeaderboard({ period }),
    staleTime: 60_000,
    enabled: hasHydrated && isAuthenticated,
  });

  const profileQuery = useQuery({
    queryKey: ["leaderboard-user-profile", selectedEntry?.userId],
    queryFn: () => api.getLeaderboardUserProfile(selectedEntry!.userId),
    enabled: Boolean(selectedEntry?.userId),
    staleTime: 60_000,
  });
  // The badge shown for each entry (including the manually equipped one) is
  // resolved server-side and arrives on the entry itself.
  const topRows = query.data?.items.slice(0, 25) ?? [];
  const currentUser = query.data?.currentUser ?? null;
  const isCurrentUserInTopRows = currentUser ? topRows.some((entry) => entry.userId === currentUser.userId) : false;

  const errorCard = (
    <div className="p-4">
      <EmptyState
        icon="medal"
        title="Leaderboard is unavailable"
        description="We could not load live XP rankings right now. Try refreshing in a moment."
        compact
        className="border-0 bg-transparent shadow-none"
      />
    </div>
  );
  const emptyCard = currentUser ? (
    <div className="p-4">
      <EmptyState
        icon="trophy"
        title="No other rankings yet"
        description="Your XP is tracked. Other learners will appear here after they earn leaderboard XP."
        compact
        className="border-0 bg-transparent shadow-none"
      />
    </div>
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
  );

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/80 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500" />
          <div className="relative z-10 space-y-4 p-5 lg:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.85rem]">Leaderboard</h1>
              </div>
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground md:flex">
                <Trophy className="h-5 w-5" />
              </div>
            </div>

            <div className="flex w-full items-center overflow-x-auto rounded-[1.25rem] border border-border/50 bg-muted/40 p-1.5 shadow-inner no-scrollbar md:w-max">
              {[
                { id: "all_time", label: "All-time" },
                { id: "week", label: "Weekly" },
                { id: "month", label: "Monthly" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPeriod(tab.id as LeaderboardPeriod)}
                  className={cn(
                    "flex-1 whitespace-nowrap rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-colors sm:flex-none",
                    period === tab.id
                      ? "border border-orange-300/80 bg-background text-foreground shadow-sm shadow-orange-950/5"
                      : "text-muted-foreground hover:bg-background hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop: full ranking table */}
        <div className="hidden overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-lg shadow-black/5 md:block">
          <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] gap-3 border-b border-border/50 bg-muted/20 px-3 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:grid-cols-[56px_minmax(0,1.6fr)_110px_88px_110px_138px] md:px-6">
            <div className="text-center">Rank</div>
            <div>User</div>
            <div className="text-right md:text-center">XP</div>
            <div className="hidden text-center md:block">Streak</div>
            <div className="hidden text-center md:block">Avg Score</div>
            <div className="hidden text-center md:block">Badge</div>
          </div>

          <div className="divide-y divide-border/40">
            {query.isLoading ? (
              <LeaderboardRowsSkeleton />
            ) : query.isError ? (
              errorCard
            ) : topRows.length > 0 ? (
              topRows.map((entry) => (
                <EntryRow
                  key={`${entry.rank}-${entry.userId}`}
                  entry={entry}
                  isCurrentUser={entry.isCurrentUser}
                  onClick={() => setSelectedEntry(entry)}
                />
              ))
            ) : (
              emptyCard
            )}
          </div>

          {currentUser && !isCurrentUserInTopRows ? (
            <div className="border-t-2 border-primary/20 bg-primary/[0.03]">
              <EntryRow entry={currentUser} isCurrentUser onClick={() => setSelectedEntry(currentUser)} />
            </div>
          ) : null}
        </div>

        {/* Mobile: podium for the top 3 + a clean list for the rest */}
        <div className="space-y-4 md:hidden">
          {query.isLoading ? (
            <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-sm">
              <div className="divide-y divide-border/40">
                <LeaderboardRowsSkeleton />
              </div>
            </div>
          ) : query.isError ? (
            <div className="rounded-3xl border border-border/50 bg-card/50 shadow-sm">{errorCard}</div>
          ) : topRows.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/60 shadow-sm">
                <div className="divide-y divide-border/40">
                  {topRows.map((entry) => (
                    <MobileEntryRow
                      key={`${entry.rank}-${entry.userId}`}
                      entry={entry}
                      isCurrentUser={entry.isCurrentUser}
                      onClick={() => setSelectedEntry(entry)}
                    />
                  ))}
                </div>
              </div>

              {currentUser && !isCurrentUserInTopRows ? (
                <div className="overflow-hidden rounded-3xl border-2 border-primary/25 bg-primary/[0.04] shadow-sm">
                  <p className="px-4 pt-3 text-[10px] font-bold uppercase tracking-widest text-primary/70">Your position</p>
                  <MobileEntryRow entry={currentUser} isCurrentUser onClick={() => setSelectedEntry(currentUser)} />
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-3xl border border-border/50 bg-card/50 shadow-sm">{emptyCard}</div>
          )}
        </div>
      </div>

      <LeaderboardUserProfileModal
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        user={profileQuery.data ? mapLeaderboardProfileCatalog(profileQuery.data) : null}
        isLoading={profileQuery.isLoading}
      />
    </>
  );
}
