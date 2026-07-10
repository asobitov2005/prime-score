"use client";
import type { StreakHeatmapScope } from "./controller";
import { StreakHeatmapView1 } from "./view-section-07";

export function StreakHeatmapView({ scope }: { scope: StreakHeatmapScope }) {
  return <StreakHeatmapView1 scope={scope} />;
}
