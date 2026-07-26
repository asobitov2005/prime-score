"use client";

import { useEffect, useMemo, useState } from "react";
import { AchievementGrid } from "@/src/components/achievements/AchievementGrid";
import { LevelProgressSummaryCard, type LevelSummary } from "@/src/components/achievements/LevelProgressSummaryCard";
import { createApiClient } from "@/lib/api/client";
import type { Achievement } from "@/src/types/achievement";

export function AchievementsClient({
  achievements,
  levelSummary,
  equippedAchievementId: serverEquippedAchievementId,
}: {
  achievements: Achievement[];
  levelSummary: LevelSummary;
  equippedAchievementId: string | null;
}) {
  const api = useMemo(() => createApiClient(), []);
  // The equipped badge is owned by the server (auto = most recent unlocked, or
  // the user's manual pick). Seed local state from it for instant UI feedback.
  const [equippedAchievementId, setEquippedAchievementId] = useState<string | null>(serverEquippedAchievementId);

  useEffect(() => {
    setEquippedAchievementId(serverEquippedAchievementId);
  }, [serverEquippedAchievementId]);

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
    const previous = equippedAchievementId;
    setEquippedAchievementId(achievement.id); // optimistic
    void api.setEquippedAchievement(achievement.id).catch(() => {
      setEquippedAchievementId(previous); // revert on failure
    });
  };

  return (
    <div className="achievements-night space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.85rem]">Achievements</h1>
        <p className="max-w-3xl text-sm font-medium leading-6 text-muted-foreground md:text-base">
          Unlock badges as you build consistency, improve your IELTS skills, and climb the leaderboard.
        </p>
      </header>
      <LevelProgressSummaryCard achievements={equippedAchievements} levelSummary={levelSummary} onEquip={handleEquip} />
      <AchievementGrid
        achievements={equippedAchievements}
        equippedAchievementId={equippedAchievementId}
        onEquip={handleEquip}
      />
    </div>
  );
}
