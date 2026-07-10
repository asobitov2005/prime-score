import type { ApiRequest } from "@/lib/api/core";
import type {
  LeaderboardQuery,
  LeaderboardUserProfileResponse,
} from "@/lib/api/types";
import type {
  LeaderboardEntry,
  LeaderboardResponseData,
} from "@/lib/types";

interface BackendLeaderboardEntry {
  rank: number;
  user_id: string;
  avatar_url?: string | null;
  display_name: string;
  level: number;
  xp: number;
  current_streak: number;
  badge?: string | null;
  average_score?: number | null;
  full_mock_completions: number;
  achieved_at?: string | null;
  is_current_user?: boolean;
}

interface BackendLeaderboardResponse {
  period: "week" | "month" | "all_time";
  items: BackendLeaderboardEntry[];
  current_user?: BackendLeaderboardEntry | null;
}

function mapBackendLeaderboardEntry(
  entry: BackendLeaderboardEntry,
): LeaderboardEntry {
  return {
    rank: entry.rank,
    userId: entry.user_id,
    avatarUrl: entry.avatar_url ?? null,
    name: entry.display_name,
    level: entry.level,
    xp: entry.xp,
    currentStreak: entry.current_streak,
    badge: entry.badge ?? null,
    averageScore: entry.average_score ?? null,
    fullMockCompletions: entry.full_mock_completions,
    achievedAt: entry.achieved_at ?? null,
    qualified: true,
    isCurrentUser: entry.is_current_user ?? false,
  };
}

function mapCurrentUserLeaderboardEntry(
  entry: BackendLeaderboardEntry,
  visibleCount: number,
): LeaderboardEntry {
  return mapBackendLeaderboardEntry({
    ...entry,
    rank: entry.rank > 0 ? entry.rank : visibleCount + 1,
  });
}

export function createLeaderboardApi(request: ApiRequest) {
  return {
    getLeaderboard: (query: LeaderboardQuery = {}) =>
      request<BackendLeaderboardResponse>(
        `/leaderboard?period=${encodeURIComponent(
          query.period ?? "all_time",
        )}`,
      ).then<LeaderboardResponseData>((payload) => ({
        period: payload.period,
        items: payload.items.map(mapBackendLeaderboardEntry),
        currentUser: payload.current_user
          ? mapCurrentUserLeaderboardEntry(
              payload.current_user,
              payload.items.length,
            )
          : null,
      })),
    getLeaderboardUserProfile: (userId: string) =>
      request<LeaderboardUserProfileResponse>(
        `/leaderboard/users/${encodeURIComponent(userId)}`,
        { method: "GET" },
      ),
  };
}
