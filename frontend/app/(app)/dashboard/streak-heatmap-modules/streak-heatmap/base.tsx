"use client";
import type { StreakHeatmapProps } from "../shared";

export function useBaseScope(props: StreakHeatmapProps) {
  const { activity, currentStreak, longestStreak } = props;
    return { activity, currentStreak, longestStreak };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
