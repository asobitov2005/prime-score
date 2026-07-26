"use client";

import Image from "next/image";
import { BadgeCheck, Lock } from "lucide-react";
import { useState } from "react";
import type { Achievement, AchievementRarity } from "@/src/types/achievement";
import { AchievementModal } from "@/src/components/achievements/AchievementModal";
import { cn } from "@/lib/utils";

const rarityStyles: Record<AchievementRarity, { label: string; glow: string; text: string }> = {
  common: {
    label: "Common",
    glow: "shadow-slate-200/80 dark:shadow-black/30",
    text: "text-amber-700 dark:text-amber-300",
  },
  rare: {
    label: "Rare",
    glow: "shadow-blue-100/80 dark:shadow-blue-950/20",
    text: "text-blue-700 dark:text-blue-300",
  },
  epic: {
    label: "Epic",
    glow: "shadow-purple-100/90 dark:shadow-purple-950/20",
    text: "text-yellow-600 dark:text-yellow-300",
  },
  legendary: {
    label: "Legendary",
    glow: "shadow-amber-100/90 dark:shadow-amber-950/20",
    text: "text-cyan-700 dark:text-cyan-300",
  },
  mythic: {
    label: "Mythic",
    glow: "shadow-violet-100/90 dark:shadow-violet-950/20",
    text: "text-violet-700 dark:text-violet-300",
  },
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function progressPercent(achievement: Achievement): number {
  if (!achievement.progress || achievement.progress.target <= 0) {
    return 0;
  }
  return Math.max(0, Math.min((achievement.progress.current / achievement.progress.target) * 100, 100));
}

function progressMetricLabel(achievement: Achievement): string | null {
  const progress = achievement.progress;
  if (!progress) {
    return null;
  }

  const isXpProgress = achievement.category === "level" || achievement.requiredXp || /\bXP\b/i.test(progress.label);
  if (isXpProgress) {
    return `${formatNumber(progress.current)} of ${formatNumber(achievement.requiredXp ?? progress.target)} XP`;
  }

  if (achievement.category === "streak" || achievement.streakDays) {
    return `${formatNumber(progress.current)} of ${formatNumber(achievement.streakDays ?? progress.target)} days`;
  }

  // Other categories (e.g. performance) carry a raw metric name like "avg accuracy"
  // in progress.label — don't surface it on the card; the percentage is enough.
  return null;
}

function xpToGo(achievement: Achievement): number | null {
  if (!achievement.requiredXp) {
    return null;
  }

  const current = achievement.progress?.current ?? 0;
  return Math.max(0, achievement.requiredXp - current);
}

function streakDaysToGo(achievement: Achievement): number | null {
  if (!achievement.streakDays) {
    return null;
  }

  const current = achievement.progress?.current ?? 0;
  return Math.max(0, achievement.streakDays - current);
}

interface AchievementCardProps {
  achievement: Achievement;
  isEquipped: boolean;
  onEquip: (achievement: Achievement) => void;
}

export function AchievementCard({ achievement, isEquipped, onEquip }: AchievementCardProps) {
  const rarity = rarityStyles[achievement.rarity];
  const isUnlocked = achievement.status === "unlocked";
  const isInProgress = achievement.status === "in_progress";
  const progress = progressPercent(achievement);
  const progressLabel = progressMetricLabel(achievement);
  const remainingXp = xpToGo(achievement);
  const remainingStreakDays = streakDaysToGo(achievement);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsModalOpen(true);
    }
  };

  const topLabel = achievement.category === "level" && achievement.unlockLevel
    ? `Level ${achievement.unlockLevel}`
    : achievement.streakDays
      ? `${achievement.streakDays} Day Streak`
      : rarity.label;
  const description = achievement.description
    || (achievement.streakDays ? `Keep a ${achievement.streakDays}-day streak` : "");
  const remainingLabel = achievement.streakDays
    ? (remainingStreakDays !== null ? `${formatNumber(remainingStreakDays)} days` : null)
    : (remainingXp !== null ? `${formatNumber(remainingXp)} XP` : null);

  // Skill badge art has inconsistent transparent padding per skill, so each renders
  // at a different visual size in the same box — normalize with per-skill scaling.
  const badgeScaleClass = (() => {
    if (achievement.category !== "skill") {
      return "group-hover:scale-105";
    }
    const hay = `${achievement.skillType ?? ""} ${achievement.image ?? ""} ${achievement.title}`.toLowerCase();
    if (hay.includes("reading") || hay.includes("listening")) {
      return "scale-[1.42] group-hover:scale-[1.48]";
    }
    if (hay.includes("writing") || hay.includes("speaking")) {
      return "scale-[1.08] group-hover:scale-[1.14]";
    }
    return "scale-[1.28] group-hover:scale-[1.34]";
  })();

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => setIsModalOpen(true)}
        onKeyDown={handleCardKeyDown}
        className={cn(
          "group relative flex min-h-[168px] cursor-pointer select-none flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-3 shadow-lg outline-none transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary/40 sm:min-h-[188px] dark:bg-slate-950/80",
          rarity.glow,
          isUnlocked && "bg-emerald-50/80 shadow-emerald-100/90 dark:bg-emerald-950/25 dark:shadow-emerald-950/20",
        )}
      >
        {achievement.rarity === "mythic" ? (
          <div className="pointer-events-none absolute inset-x-8 top-5 h-24 rounded-full bg-gradient-to-r from-violet-200/50 to-amber-200/50 blur-2xl dark:from-violet-500/20 dark:to-amber-500/15" />
        ) : null}

        <div className="relative flex flex-1 items-center gap-3">
          <div className="flex h-16 w-14 shrink-0 items-center justify-center sm:h-20 sm:w-16">
            <Image
              src={achievement.image}
              alt={achievement.title}
              width={120}
              height={120}
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
              onContextMenu={(event) => event.preventDefault()}
              className={cn(
                "h-14 w-auto max-w-[3.5rem] select-none object-contain drop-shadow-lg transition duration-300 sm:h-[4.5rem] sm:max-w-[4.75rem]",
                badgeScaleClass,
              )}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-[13px] font-semibold leading-tight tracking-tight", rarity.text)}>{topLabel}</p>
            <h2 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-tight text-foreground">{achievement.title}</h2>
            {description ? (
              <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-auto pt-2">
          <div className="flex min-h-8 items-center">
            {isUnlocked ? (
              <div className="flex w-full items-center justify-center gap-1.5 rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-300">
                <BadgeCheck className="h-3.5 w-3.5" />
                Unlocked
              </div>
            ) : null}

            {isInProgress && achievement.progress ? (
              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
                  <span>{progressLabel}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted shadow-inner">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : null}

            {achievement.status === "locked" ? (
              <div className="flex w-full min-w-0 items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  Locked
                </span>
                {remainingLabel ? (
                  <span className="whitespace-nowrap text-right text-xs font-semibold text-muted-foreground">
                    <span className="text-foreground">{remainingLabel}</span> to go
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </article>
      <AchievementModal
        achievement={achievement}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isEquipped={isEquipped}
        onEquip={onEquip}
      />
    </>
  );
}
