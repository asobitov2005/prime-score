"use client";

import { useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import type { Achievement, AchievementCategory } from "@/src/types/achievement";
import { AchievementCard } from "@/src/components/achievements/AchievementCard";

const categoryOrder: AchievementCategory[] = ["level", "streak", "skill", "performance", "special"];

const categoryLabels: Record<AchievementCategory, string> = {
  level: "Level Achievements",
  streak: "Streak Achievements",
  skill: "Skill Achievements",
  performance: "Performance Achievements",
  special: "Special Achievements",
};

interface AchievementGridProps {
  achievements: Achievement[];
  equippedAchievementId: string | null;
  onEquip: (achievement: Achievement) => void;
}

export function AchievementGrid({ achievements, equippedAchievementId, onEquip }: AchievementGridProps) {
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const groupedAchievements = useMemo(
    () =>
      categoryOrder
        .map((category) => ({
          category,
          items: achievements.filter((achievement) => achievement.category === category),
        }))
        .filter((group) => group.items.length > 0),
    [achievements],
  );

  const scrollRow = (category: AchievementCategory, direction: "left" | "right") => {
    const row = rowRefs.current[category];
    if (!row) {
      return;
    }

    row.scrollBy({
      left: direction === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };

  return (
    <section className="space-y-7">
      {achievements.length > 0 ? (
        groupedAchievements.map((group) => (
          <div key={group.category} className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">{categoryLabels[group.category]}</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollRow(group.category, "left")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:text-slate-950 hover:shadow-md active:scale-95"
                  aria-label={`Scroll ${categoryLabels[group.category]} left`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRow(group.category, "right")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:text-slate-950 hover:shadow-md active:scale-95"
                  aria-label={`Scroll ${categoryLabels[group.category]} right`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              ref={(node) => {
                rowRefs.current[group.category] = node;
              }}
              className="flex gap-4 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {group.items.map((achievement) => (
                <div key={achievement.id} className={achievement.category === "streak" ? "w-[250px] flex-none sm:w-[270px]" : "w-[200px] flex-none sm:w-[215px]"}>
                  <AchievementCard
                    achievement={achievement}
                    isEquipped={achievement.id === equippedAchievementId}
                    onEquip={onEquip}
                  />
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <SearchX className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-950">No badges yet</h2>
          <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
            Achievements will appear here when badge data is available.
          </p>
        </div>
      )}
    </section>
  );
}
