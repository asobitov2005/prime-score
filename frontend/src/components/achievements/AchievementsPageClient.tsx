"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/ui/empty-state";
import { createApiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import { mapAchievementCatalogItem } from "@/src/lib/achievement-mappers";
import { AchievementsClient } from "@/src/components/achievements/AchievementsClient";

function AchievementsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="h-8 w-44 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-full max-w-2xl rounded-full bg-muted animate-pulse" />
      </header>

      <div className="rounded-[18px] border border-border/60 bg-card/70 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center">
            <div className="h-[76px] w-[70px] shrink-0 rounded-2xl bg-muted animate-pulse" />
            <div className="min-w-0 flex-1">
              <div className="h-3 w-28 rounded-full bg-muted animate-pulse" />
              <div className="mt-2 max-w-[360px]">
                <div className="flex items-end justify-between gap-4">
                  <div className="h-8 w-28 rounded-lg bg-muted animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-5 w-20 rounded-md bg-muted animate-pulse" />
                    <div className="h-3 w-24 rounded-full bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="mt-3 h-3 w-full rounded-full bg-muted animate-pulse" />
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-center xl:gap-8">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-2xl border border-border/45 p-4 xl:border-0 xl:p-0">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 w-24 rounded-md bg-muted animate-pulse" />
                  <div className="h-3 w-28 rounded-full bg-muted animate-pulse" />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-4 rounded-2xl border border-border/45 p-4 sm:col-span-2 xl:border-0 xl:p-0">
              <div className="h-[76px] w-[96px] rounded-2xl bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-28 rounded-full bg-muted animate-pulse" />
                <div className="h-5 w-36 rounded-md bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {Array.from({ length: 3 }).map((_, rowIndex) => (
        <section key={rowIndex} className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="h-6 w-44 rounded-lg bg-muted animate-pulse" />
            <div className="flex gap-2">
              <div className="h-9 w-9 rounded-xl bg-muted animate-pulse" />
              <div className="h-9 w-9 rounded-xl bg-muted animate-pulse" />
            </div>
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="w-[200px] flex-none rounded-2xl border border-border/60 bg-card/70 p-3">
                <div className="mx-auto h-16 w-28 rounded-2xl bg-muted animate-pulse" />
                <div className="mx-auto mt-4 h-4 w-32 rounded-md bg-muted animate-pulse" />
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-full rounded-full bg-muted animate-pulse" />
                  <div className="h-3 w-3/4 rounded-full bg-muted animate-pulse" />
                </div>
                <div className="mt-5 h-8 w-full rounded-md bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function AchievementsPageClient() {
  const api = useMemo(() => createApiClient(), []);
  const { userId, hasHydrated, isAuthenticated } = useAuthStore();

  const profileQuery = useQuery({
    queryKey: ["achievements-profile", userId],
    queryFn: () => api.getLeaderboardUserProfile(userId!),
    enabled: hasHydrated && isAuthenticated && Boolean(userId),
    staleTime: 60_000,
  });

  const xpQuery = useQuery({
    queryKey: ["xp-summary", userId],
    queryFn: () => api.getXpSummary(),
    enabled: hasHydrated && isAuthenticated && Boolean(userId),
    staleTime: 60_000,
  });

  if (!hasHydrated) {
    return <AchievementsLoadingSkeleton />;
  }

  if (!isAuthenticated || !userId) {
    return (
      <EmptyState
        title="Login required"
        description="Sign in to see your real badge progress and unlocked achievements."
        action={{ href: "/login", label: "Go to login" }}
      />
    );
  }

  if (profileQuery.isLoading) {
    return <AchievementsLoadingSkeleton />;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <EmptyState
        title="Achievements unavailable"
        description="PrimeScore could not load your badge progress right now."
        action={{ href: "/dashboard", label: "Back to dashboard" }}
      />
    );
  }

  const achievements = profileQuery.data.achievement_catalog.map(mapAchievementCatalogItem);
  const profile = profileQuery.data;
  const xp = xpQuery.data;

  const level = xp?.level ?? profile.level;
  const totalXp = xp?.totalXp ?? profile.total_xp;
  const nextLevelXp = xp?.progress.nextLevelXp ?? 0;
  const levelSummary = {
    level,
    nextLevel: level + 1,
    totalXp,
    rewardsUnlocked: profile.stats.achievements_unlocked,
    xpToNextLevel: xp?.progress.xpNeededForNextLevel ?? 0,
    progressPercent: xp ? Math.max(0, Math.min(xp.progress.progressPercent, 100)) : 0,
    isMaxLevel: Boolean(xp) && nextLevelXp <= (xp?.progress.levelFloorXp ?? 0),
  };

  return (
    <AchievementsClient
      achievements={achievements}
      levelSummary={levelSummary}
      equippedAchievementId={profile.equipped_achievement_id ?? null}
    />
  );
}
