export type AchievementCategory = "level" | "streak" | "skill" | "performance" | "special";

export type AchievementSkillType = "reading" | "listening" | "writing" | "speaking";

export type AchievementRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export type AchievementStatus = "unlocked" | "in_progress" | "locked";

export interface AchievementProgress {
  current: number;
  target: number;
  label: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  skillType?: AchievementSkillType;
  rarity: AchievementRarity;
  image: string;
  status: AchievementStatus;
  requirement: string;
  requiredXp?: number;
  unlockLevel?: number;
  streakDays?: number;
  xpReward?: number;
  unlockedAt?: string;
  progress?: AchievementProgress;
  featured?: boolean;
}
