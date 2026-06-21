"use client";

import { useEffect, useMemo, useState } from "react";
import { AchievementGrid } from "@/src/components/achievements/AchievementGrid";
import { LevelProgressSummaryCard } from "@/src/components/achievements/LevelProgressSummaryCard";
import type { Achievement } from "@/src/types/achievement";

export const EQUIPPED_ACHIEVEMENT_STORAGE_KEY = "primescore-equipped-achievement-id";
const EQUIPPED_ACHIEVEMENT_MODE_STORAGE_KEY = "primescore-equipped-achievement-mode";

function getLatestUnlockedAchievementId(achievements: Achievement[]): string | null {
  const unlockedAchievements = achievements.filter((achievement) => achievement.status === "unlocked");
  if (unlockedAchievements.length === 0) {
    return null;
  }

  const achievementsWithUnlockDate = unlockedAchievements
    .map((achievement) => ({
      achievement,
      unlockedAtMs: achievement.unlockedAt ? new Date(achievement.unlockedAt).getTime() : Number.NaN,
    }))
    .filter((item) => Number.isFinite(item.unlockedAtMs));

  if (achievementsWithUnlockDate.length > 0) {
    return achievementsWithUnlockDate.sort((left, right) => right.unlockedAtMs - left.unlockedAtMs)[0].achievement.id;
  }

  return unlockedAchievements[unlockedAchievements.length - 1].id;
}

export function AchievementsClient({ achievements }: { achievements: Achievement[] }) {
  const latestUnlockedAchievementId = useMemo(() => getLatestUnlockedAchievementId(achievements), [achievements]);
  const [equippedAchievementId, setEquippedAchievementId] = useState<string | null>(latestUnlockedAchievementId);

  useEffect(() => {
    const storedMode = window.localStorage.getItem(EQUIPPED_ACHIEVEMENT_MODE_STORAGE_KEY);
    const storedId = window.localStorage.getItem(EQUIPPED_ACHIEVEMENT_STORAGE_KEY);
    const storedAchievement = storedId
      ? achievements.find((achievement) => achievement.id === storedId && achievement.status === "unlocked")
      : null;

    if (storedMode === "manual" && storedAchievement) {
      setEquippedAchievementId(storedAchievement.id);
      return;
    }

    if (latestUnlockedAchievementId) {
      window.localStorage.setItem(EQUIPPED_ACHIEVEMENT_STORAGE_KEY, latestUnlockedAchievementId);
      window.localStorage.setItem(EQUIPPED_ACHIEVEMENT_MODE_STORAGE_KEY, "auto");
    }
    setEquippedAchievementId(latestUnlockedAchievementId);
  }, [achievements, latestUnlockedAchievementId]);

  const equippedAchievements = useMemo(
    () =>
      achievements.map((achievement) => ({
        ...achievement,
        featured: achievement.id === equippedAchievementId,
      })),
    [achievements, equippedAchievementId],
  );

  const handleEquip = (achievement: Achievement) => {
    if (achievement.status !== "unlocked") {
      return;
    }

    window.localStorage.setItem(EQUIPPED_ACHIEVEMENT_STORAGE_KEY, achievement.id);
    window.localStorage.setItem(EQUIPPED_ACHIEVEMENT_MODE_STORAGE_KEY, "manual");
    setEquippedAchievementId(achievement.id);
  };

  return (
    <div className="achievements-night space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.85rem]">Achievements</h1>
        <p className="max-w-3xl text-sm font-medium leading-6 text-muted-foreground md:text-base">
          Unlock badges as you build consistency, improve your IELTS skills, and climb the leaderboard.
        </p>
      </header>
      <LevelProgressSummaryCard achievements={equippedAchievements} onEquip={handleEquip} />
      <AchievementGrid
        achievements={equippedAchievements}
        equippedAchievementId={equippedAchievementId}
        onEquip={handleEquip}
      />
    </div>
  );
}
