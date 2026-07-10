import type { AchievementCategory } from "@/src/types/achievement";

export const badgePath = {
  level: "/badges/level/",
  streak: "/badges/streak/",
  skill: "/badges/skill/",
  performance: "/badges/performance/",
  special: "/badges/special/",
} satisfies Record<AchievementCategory, string> satisfies Record<AchievementCategory, string>;
