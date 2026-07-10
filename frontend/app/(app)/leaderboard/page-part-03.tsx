"use client";

import { EQUIPPED_ACHIEVEMENT_STORAGE_KEY, EmptyState, LeaderboardEntry, LeaderboardPeriod, LeaderboardResponseData, LeaderboardUserProfileModal, Trophy, cn, createApiClient, useAuthStore, useEffect, useMemo, useQuery, useState } from "./page-dependencies";
import { mapLeaderboardProfileCatalog } from "./page-part-01";
import { EntryRow, LeaderboardRowsSkeleton } from "./page-part-02";

export function LeaderboardPage() {
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
  const currentProfileQuery = useQuery({
    queryKey: ["leaderboard-user-profile-self", userId],
    queryFn: () => api.getLeaderboardUserProfile(userId!),
    enabled: hasHydrated && isAuthenticated && Boolean(userId),
    staleTime: 60_000,
  });

  useEffect(() => {
    setEquippedAchievementId(window.localStorage.getItem(EQUIPPED_ACHIEVEMENT_STORAGE_KEY));
  }, []);

  const equippedAchievement = equippedAchievementId
    ? currentProfileQuery.data?.achievement_catalog.find(
        (achievement) => achievement.id === equippedAchievementId && achievement.status === "unlocked"
      ) ?? null
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

        <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-lg shadow-black/5">
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
              <LeaderboardRowsSkeleton />
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
        user={profileQuery.data ? mapLeaderboardProfileCatalog(profileQuery.data) : null}
        isLoading={profileQuery.isLoading}
      />
    </>
  );
}
