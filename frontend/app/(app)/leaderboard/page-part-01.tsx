"use client";

import { LeaderboardUserProfileResponse, Medal, Rarity, Trophy, UserProfileModalData } from "./page-dependencies";

export const BADGE_IMAGE_BY_TITLE: Record<string, string> = {
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

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function entryInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";
}

export function topRankIcon(rank: number) {
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

export function leaderboardBadgeImage(badge: string | null): string | null {
  if (!badge) {
    return null;
  }
  const aliases: Record<string, string> = {
    "Consistency Builder": "/badges/streak/day-7.png",
    "Mock Master": "/badges/special/special-mock-warrior.png",
  };
  return BADGE_IMAGE_BY_TITLE[badge] ?? aliases[badge] ?? null;
}

export function leaderboardBadgeTextClass(badge: string | null): string {
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

export function normalizeRarity(value?: string | null): Rarity {
  if (value === "Legendary" || value === "Mythic" || value === "Epic" || value === "Rare" || value === "Common") {
    return value;
  }
  return "Common";
}

export function mapLeaderboardProfileCatalog(profile: LeaderboardUserProfileResponse): UserProfileModalData {
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
