"use client";

import { Achievement, AchievementRarity } from "./AchievementModal-dependencies";

export const rarityMeta: Record<AchievementRarity, { 
  label: string; 
  ambientGlow: string; 
  badgeBg: string; 
  badgeText: string; 
  badgeBorder: string; 
  imageGlow: string;
  buttonClass: string;
}> = {
  common: {
    label: "Common",
    ambientGlow: "from-slate-200/50 via-slate-100/20 to-transparent dark:from-slate-700/35 dark:via-slate-800/10",
    badgeBg: "bg-slate-100/80 backdrop-blur-sm dark:bg-slate-800/70",
    badgeText: "text-slate-700 dark:text-slate-200",
    badgeBorder: "border-slate-200/60 dark:border-slate-700/70",
    imageGlow: "bg-slate-400/20 dark:bg-slate-400/15",
    buttonClass: "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200",
  },
  rare: {
    label: "Rare",
    ambientGlow: "from-blue-200/50 via-blue-100/20 to-transparent dark:from-blue-500/25 dark:via-blue-900/10",
    badgeBg: "bg-blue-50/80 backdrop-blur-sm dark:bg-blue-500/10",
    badgeText: "text-blue-700 dark:text-blue-300",
    badgeBorder: "border-blue-200/60 dark:border-blue-400/25",
    imageGlow: "bg-blue-400/30 dark:bg-blue-400/20",
    buttonClass: "bg-blue-600 text-white hover:bg-blue-700",
  },
  epic: {
    label: "Epic",
    ambientGlow: "from-purple-200/60 via-purple-100/20 to-transparent dark:from-purple-500/25 dark:via-purple-900/10",
    badgeBg: "bg-purple-50/80 backdrop-blur-sm dark:bg-purple-500/10",
    badgeText: "text-purple-700 dark:text-purple-300",
    badgeBorder: "border-purple-200/60 dark:border-purple-400/25",
    imageGlow: "bg-purple-400/40 dark:bg-purple-400/20",
    buttonClass: "bg-purple-600 text-white hover:bg-purple-700",
  },
  legendary: {
    label: "Legendary",
    ambientGlow: "from-amber-200/60 via-amber-100/20 to-transparent dark:from-amber-500/25 dark:via-amber-900/10",
    badgeBg: "bg-amber-50/80 backdrop-blur-sm dark:bg-amber-500/10",
    badgeText: "text-amber-700 dark:text-amber-300",
    badgeBorder: "border-amber-200/60 dark:border-amber-400/25",
    imageGlow: "bg-amber-400/40 dark:bg-amber-400/20",
    buttonClass: "bg-amber-500 text-white hover:bg-amber-600",
  },
  mythic: {
    label: "Mythic",
    ambientGlow: "from-violet-300/60 via-fuchsia-200/20 to-transparent dark:from-violet-500/30 dark:via-fuchsia-500/10",
    badgeBg: "bg-gradient-to-r from-violet-50/80 to-fuchsia-50/80 backdrop-blur-sm dark:from-violet-500/10 dark:to-fuchsia-500/10",
    badgeText: "text-violet-800 dark:text-violet-200",
    badgeBorder: "border-violet-200/60 dark:border-violet-400/25",
    imageGlow: "bg-violet-400/40 dark:bg-violet-400/20",
    buttonClass: "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700",
  },
};

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function progressPercent(achievement: Achievement): number {
  if (!achievement.progress || achievement.progress.target <= 0) {
    return 0;
  }
  return Math.max(0, Math.min((achievement.progress.current / achievement.progress.target) * 100, 100));
}

export function isBronzeLearnerBadge(achievement: Achievement): boolean {
  return achievement.id === "level-bronze-learner" || achievement.title === "Bronze Learner";
}

export function requirementItems(achievement: Achievement): string[] {
  if (achievement.category === "level") {
    return [
      achievement.unlockLevel ? `Reach Level ${achievement.unlockLevel}` : "Reach the required level",
      achievement.requiredXp ? `Earn ${formatNumber(achievement.requiredXp)} XP` : achievement.requirement,
    ];
  }

  if (achievement.category === "streak" && achievement.streakDays) {
    return [`Maintain a ${achievement.streakDays}-day streak`];
  }

  return [achievement.requirement];
}

export function progressLabel(achievement: Achievement): string | null {
  const progress = achievement.progress;

  if (achievement.status === "unlocked") {
    return null;
  }

  if (progress) {
    const isXpProgress = achievement.category === "level" || achievement.requiredXp || /\bXP\b/i.test(progress.label);
    if (isXpProgress) {
      return `${formatNumber(progress.current)} of ${formatNumber(achievement.requiredXp ?? progress.target)} XP`;
    }

    if (achievement.category === "streak" || achievement.streakDays) {
      return `${formatNumber(progress.current)} of ${formatNumber(achievement.streakDays ?? progress.target)} days`;
    }

    return progress.label;
  }

  if (achievement.category === "level" && achievement.requiredXp) {
    return `0 of ${formatNumber(achievement.requiredXp)} XP`;
  }

  if (achievement.category === "streak" && achievement.streakDays) {
    return `0 of ${formatNumber(achievement.streakDays)} days`;
  }

  return null;
}

export function continueHref(achievement: Achievement): string {
  if (achievement.category === "skill") {
    if (achievement.skillType === "writing") return "/writing";
    if (achievement.skillType === "speaking") return "/speaking";
    return "/tests";
  }
  if (achievement.category === "performance") return "/tests";
  if (achievement.category === "special") return "/leaderboard";
  return "/dashboard";
}

export interface AchievementModalProps {
  achievement: Achievement;
  open: boolean;
  onClose: () => void;
  isEquipped: boolean;
  onEquip: (achievement: Achievement) => void;
}
