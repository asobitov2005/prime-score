"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, Loader2, Medal, Trophy } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { createApiClient } from "@/lib/api/client";
import type { LeaderboardEntry, LeaderboardResponseData, LeaderboardPeriod } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { achievements } from "@/src/data/achievements";
import { EQUIPPED_ACHIEVEMENT_STORAGE_KEY } from "@/src/components/achievements/AchievementsClient";
import { LeaderboardUserProfileModal, type UserProfileModalData, type Rarity } from "@/components/leaderboard/user-profile-modal";
import type { LeaderboardUserProfileResponse } from "@/lib/api/types";

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

  const directMatch = achievements.find((achievement) => achievement.title === badge && achievement.category === "level")
    ?? achievements.find((achievement) => achievement.title === badge);

  if (directMatch) {
    return directMatch.image;
  }

  const aliases: Record<string, string> = {
    "30 Day Streak": "/badges/streak/day-30.png",
    "Consistency Builder": "/badges/streak/day-7.png",
    "Mock Master": "/badges/special/special-mock-warrior.png",
  };

  return aliases[badge] ?? null;
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

function mapLeaderboardProfileResponse(profile: LeaderboardUserProfileResponse): UserProfileModalData {
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

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("all_time");
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);
  const [equippedAchievementId, setEquippedAchievementId] = useState<string | null>(null);
  
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

  useEffect(() => {
    setEquippedAchievementId(window.localStorage.getItem(EQUIPPED_ACHIEVEMENT_STORAGE_KEY));
  }, []);

  const equippedAchievement = equippedAchievementId
    ? achievements.find((achievement) => achievement.id === equippedAchievementId && achievement.status === "unlocked")
    : null;

  const withEquippedBadge = (entry: LeaderboardEntry): LeaderboardEntry => {
    if (!entry.isCurrentUser || !equippedAchievement) {
      return entry;
    }

    return { ...entry, badge: equippedAchievement.title };
  };

  const topRows = (query.data?.items.slice(0, 25) ?? []).map(withEquippedBadge);
  const currentUser = query.data?.currentUser ? withEquippedBadge(query.data.currentUser) : null;
  const isCurrentUserInTopRows = currentUser ? topRows.some((entry) => entry.userId === currentUser.userId) : false;

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in duration-500">
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/80 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500" />
          <div className="relative z-10 space-y-4 p-5 lg:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Leaderboard</h1>
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
                    "flex-1 whitespace-nowrap rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-all sm:flex-none",
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

        <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-lg shadow-black/5 backdrop-blur-xl">
          <div className="grid grid-cols-[48px_minmax(0,1.4fr)_88px_78px] gap-3 border-b border-border/50 bg-muted/20 px-4 py-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:grid-cols-[56px_minmax(0,1.6fr)_110px_88px_110px_138px] md:px-6">
            <div className="text-center">Rank</div>
            <div>User</div>
            <div className="text-right md:text-center">XP</div>
            <div className="text-right md:text-center">Streak</div>
            <div className="hidden text-center md:block">Avg Score</div>
            <div className="hidden text-center md:block">Badge</div>
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
              topRows.map((entry) => (
                <EntryRow 
                  key={`${entry.rank}-${entry.userId}`} 
                  entry={entry} 
                  isCurrentUser={entry.isCurrentUser} 
                  onClick={() => setSelectedEntry(entry)}
                />
              ))
            ) : currentUser ? (
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
            )}
          </div>

          {currentUser && !isCurrentUserInTopRows ? (
            <div className="border-t-2 border-primary/20 bg-primary/[0.03]">
              <EntryRow 
                entry={currentUser} 
                isCurrentUser 
                onClick={() => setSelectedEntry(currentUser)}
              />
            </div>
          ) : null}
        </div>
      </div>

      <LeaderboardUserProfileModal
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        user={profileQuery.data ? mapLeaderboardProfileResponse(profileQuery.data) : null}
        isLoading={profileQuery.isLoading}
      />
    </>
  );
}
