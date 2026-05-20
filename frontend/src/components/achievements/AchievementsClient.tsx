"use client";

import { useEffect, useMemo, useState } from "react";
import { AchievementGrid } from "@/src/components/achievements/AchievementGrid";
import { AchievementHero } from "@/src/components/achievements/AchievementHero";
import type { Achievement } from "@/src/types/achievement";

export const EQUIPPED_ACHIEVEMENT_STORAGE_KEY = "primescore-equipped-achievement-id";

function getDefaultEquippedAchievementId(achievements: Achievement[]): string | null {
  return (
    achievements.find((achievement) => achievement.status === "unlocked" && achievement.featured)?.id
    ?? achievements.find((achievement) => achievement.status === "unlocked" && achievement.rarity === "legendary")?.id
    ?? achievements.find((achievement) => achievement.status === "unlocked")?.id
    ?? null
  );
}

export function AchievementsClient({ achievements }: { achievements: Achievement[] }) {
  const defaultEquippedAchievementId = useMemo(() => getDefaultEquippedAchievementId(achievements), [achievements]);
  const [equippedAchievementId, setEquippedAchievementId] = useState<string | null>(defaultEquippedAchievementId);

  useEffect(() => {
    const storedId = window.localStorage.getItem(EQUIPPED_ACHIEVEMENT_STORAGE_KEY);
    const storedAchievement = storedId
      ? achievements.find((achievement) => achievement.id === storedId && achievement.status === "unlocked")
      : null;

    if (storedAchievement) {
      setEquippedAchievementId(storedAchievement.id);
      return;
    }

    if (defaultEquippedAchievementId) {
      window.localStorage.setItem(EQUIPPED_ACHIEVEMENT_STORAGE_KEY, defaultEquippedAchievementId);
      setEquippedAchievementId(defaultEquippedAchievementId);
    }
  }, [achievements, defaultEquippedAchievementId]);

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
    setEquippedAchievementId(achievement.id);
  };

  return (
    <>
      <AchievementHero achievements={equippedAchievements} />
      <AchievementGrid
        achievements={equippedAchievements}
        equippedAchievementId={equippedAchievementId}
        onEquip={handleEquip}
      />
    </>
  );
}
