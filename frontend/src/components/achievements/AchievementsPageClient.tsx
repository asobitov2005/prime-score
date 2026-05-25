"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { createApiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import { mapAchievementCatalogItem } from "@/src/lib/achievement-mappers";
import { AchievementsClient } from "@/src/components/achievements/AchievementsClient";

export function AchievementsPageClient() {
  const api = useMemo(() => createApiClient(), []);
  const { userId, hasHydrated, isAuthenticated } = useAuthStore();

  const profileQuery = useQuery({
    queryKey: ["achievements-profile", userId],
    queryFn: () => api.getLeaderboardUserProfile(userId!),
    enabled: hasHydrated && isAuthenticated && Boolean(userId),
    staleTime: 60_000,
  });

  if (!hasHydrated) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-border/60 bg-card/70">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
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
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-border/60 bg-card/70">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
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
  return <AchievementsClient achievements={achievements} />;
}
