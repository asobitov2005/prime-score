import type { LeaderboardUserProfileResponse } from "@/lib/api/types";
import type { Achievement, AchievementRarity, AchievementStatus } from "@/src/types/achievement";

function toRarity(value: string): AchievementRarity {
  switch (value.toLowerCase()) {
    case "rare":
      return "rare";
    case "epic":
      return "epic";
    case "legendary":
      return "legendary";
    case "mythic":
      return "mythic";
    default:
      return "common";
  }
}

function toStatus(value: string): AchievementStatus {
  switch (value) {
    case "unlocked":
    case "in_progress":
    case "locked":
      return value;
    default:
      return "locked";
  }
}

export function mapAchievementCatalogItem(
  achievement: LeaderboardUserProfileResponse["achievement_catalog"][number],
): Achievement {
  return {
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    category: achievement.category,
    skillType: achievement.skill_type ?? undefined,
    rarity: toRarity(achievement.rarity),
    image: achievement.image ?? "",
    status: toStatus(achievement.status),
    requirement: achievement.requirement,
    requiredXp: achievement.required_xp ?? undefined,
    unlockLevel: achievement.unlock_level ?? undefined,
    streakDays: achievement.streak_days ?? undefined,
    xpReward: achievement.xp_reward ?? undefined,
    unlockedAt: achievement.unlocked_at ?? undefined,
    progress: achievement.progress
      ? {
          current: achievement.progress.current,
          target: achievement.progress.target,
          label: achievement.progress.label,
        }
      : undefined,
  };
}
