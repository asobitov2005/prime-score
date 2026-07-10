import type { Achievement } from "@/src/types/achievement";
import { badgePath } from "./achievement-paths";

export const performanceAchievements: Achievement[] = [
  {
    id: "performance-accuracy-monster",
    title: "Accuracy Monster",
    description: "Maintain very high accuracy across recent practice.",
    category: "performance",
    rarity: "legendary",
    image: `${badgePath.performance}performance-accuracy-monster.png`,
    status: "in_progress",
    requirement: "Keep 90%+ accuracy across 5 full mocks.",
    xpReward: 700,
    progress: { current: 3, target: 5, label: "3 of 5 mocks" },
  },
  {
    id: "performance-mock-warrior",
    title: "Mock Warrior",
    description: "A serious mock test finisher with strong consistency.",
    category: "performance",
    rarity: "rare",
    image: `${badgePath.special}special-mock-warrior.png`,
    status: "unlocked",
    requirement: "Complete 10 mock tests.",
    xpReward: 250,
    unlockedAt: "2026-05-12",
  },
  {
    id: "performance-mock-addict",
    title: "Mock Addict",
    description: "You keep returning for more exam simulation.",
    category: "performance",
    rarity: "epic",
    image: `${badgePath.special}special-mock-addict.png`,
    status: "locked",
    requirement: "Complete 50 mock tests.",
    xpReward: 800,
  },
];
