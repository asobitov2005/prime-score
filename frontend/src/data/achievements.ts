import type { Achievement } from "@/src/types/achievement";
import { levelAchievements } from "./achievements-level";
import { streakAchievements } from "./achievements-streak";
import { skillAchievements } from "./achievements-skill";
import { performanceAchievements } from "./achievements-performance";
import { specialAchievements } from "./achievements-special";

export const achievements: Achievement[] = [
  ...levelAchievements,
  ...streakAchievements,
  ...skillAchievements,
  ...performanceAchievements,
  ...specialAchievements,
];
