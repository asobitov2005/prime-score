"use client";
import type { StreakHeatmapProps } from "../shared";
import { useStreakHeatmapController } from "./controller";
import { StreakHeatmapView } from "./view";

export function StreakHeatmap(props: StreakHeatmapProps) {
  const scope = useStreakHeatmapController(props);
  return <StreakHeatmapView scope={scope} />;
}
