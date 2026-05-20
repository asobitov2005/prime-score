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
    glow: "shadow-slate-200/80",
    text: "text-amber-700",
  },
  rare: {
    label: "Rare",
    glow: "shadow-blue-100/80",
    text: "text-slate-500",
  },
  epic: {
    label: "Epic",
    glow: "shadow-purple-100/90",
    text: "text-yellow-600",
  },
  legendary: {
    label: "Legendary",
    glow: "shadow-amber-100/90",
    text: "text-cyan-700",
  },
  mythic: {
    label: "Mythic",
    glow: "shadow-violet-100/90",
    text: "text-violet-700",
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

function xpToGo(achievement: Achievement): number | null {
  if (!achievement.requiredXp) {
    return null;
  }

  const current = achievement.progress?.current ?? 2615;
  return Math.max(0, achievement.requiredXp - current);
}

function streakDaysToGo(achievement: Achievement): number | null {
  if (!achievement.streakDays) {
    return null;
  }

  const current = achievement.progress?.current ?? 11;
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
  const remainingXp = xpToGo(achievement);
  const remainingStreakDays = streakDaysToGo(achievement);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsModalOpen(true);
    }
  };

  if (achievement.category === "streak" && achievement.streakDays) {
    return (
      <>
        <article
          role="button"
          tabIndex={0}
          onClick={() => setIsModalOpen(true)}
          onKeyDown={handleCardKeyDown}
          className={cn(
            "group relative flex min-h-[210px] cursor-pointer flex-col overflow-hidden rounded-2xl bg-white p-3 shadow-lg outline-none transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary/40",
            rarity.glow,
            isUnlocked && "bg-emerald-50/80 shadow-emerald-100/90",
          )}
        >
          <div className="flex flex-1 items-center gap-2.5">
            <div className="flex h-20 w-16 shrink-0 items-center justify-center">
              <Image
                src={achievement.image}
                alt={achievement.title}
                width={120}
                height={120}
                className="h-[4.5rem] w-auto max-w-[4.75rem] object-contain drop-shadow-lg transition duration-300 group-hover:scale-105"
              />
            </div>

            <div className="min-w-[155px] flex-1">
              <p className={cn("whitespace-nowrap text-base font-semibold leading-tight tracking-tight", rarity.text)}>
                {achievement.streakDays} Day Streak
              </p>
              <h2 className="mt-1 whitespace-nowrap text-[15px] font-semibold leading-tight text-slate-950">{achievement.title}</h2>
              <p className="mt-1 whitespace-nowrap text-xs font-medium leading-5 text-slate-500">Keep a {achievement.streakDays}-day streak</p>
            </div>
          </div>

          <div className="mt-auto pt-2">
            <div className="flex min-h-8 items-center">
              {isUnlocked ? (
                <div className="flex w-full items-center justify-center gap-1.5 rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Unlocked
                </div>
              ) : null}

              {isInProgress && achievement.progress ? (
                <div className="w-full space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                    <span>{achievement.progress.label}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 shadow-inner">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : null}

              {achievement.status === "locked" ? (
                <div className="flex w-full min-w-0 items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Lock className="h-3.5 w-3.5" />
                    Locked
                  </span>
                  {remainingStreakDays !== null ? (
                    <span className="text-right text-xs font-semibold text-slate-500">
                      <span className="text-slate-950">{formatNumber(remainingStreakDays)} days</span> to go
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

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => setIsModalOpen(true)}
        onKeyDown={handleCardKeyDown}
        className={cn(
          "group relative flex min-h-[210px] cursor-pointer flex-col overflow-hidden rounded-2xl bg-white p-2.5 shadow-lg outline-none transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary/40",
          rarity.glow,
          isUnlocked && "bg-emerald-50/80 shadow-emerald-100/90",
        )}
      >
        {achievement.category === "level" && achievement.unlockLevel ? (
          <div className="absolute left-3 top-3 z-20">
            <span className={cn("text-xs font-semibold", rarity.text)}>Level {achievement.unlockLevel}</span>
          </div>
        ) : null}

        {achievement.rarity === "mythic" ? (
          <div className="absolute inset-x-8 top-5 h-24 rounded-full bg-gradient-to-r from-violet-200/50 to-amber-200/50 blur-2xl" />
        ) : null}

        <div className="relative flex justify-center pt-1">
          <div className="relative flex h-[4.75rem] w-32 items-center justify-center">
            <Image
              src={achievement.image}
              alt={achievement.title}
              width={192}
              height={120}
              className={cn(
                "relative z-10 h-16 w-auto max-w-[8rem] object-contain drop-shadow-lg transition duration-300 group-hover:scale-105",
              )}
            />
          </div>
        </div>

        <div className="mt-1 flex flex-1 flex-col">
          <div className="space-y-1 text-center">
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-950">{achievement.title}</h2>
            <p className="line-clamp-2 text-xs font-medium leading-5 text-slate-500">{achievement.description}</p>
          </div>

          <div className="mt-auto pt-1">
            <div className="flex min-h-8 items-center">
              {isUnlocked ? (
                <div className="flex w-full items-center justify-center gap-1.5 rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Unlocked
                </div>
              ) : null}

              {isInProgress && achievement.progress ? (
                <div className="w-full space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                    <span>{achievement.progress.label}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 shadow-inner">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : null}

              {achievement.status === "locked" ? (
                <div className="flex w-full min-w-0 items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Lock className="h-3.5 w-3.5" />
                    Locked
                  </span>
                  {remainingXp !== null ? (
                    <span className="text-right text-xs font-semibold text-slate-500">
                      <span className="text-slate-950">{formatNumber(remainingXp)} XP</span> to go
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
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
