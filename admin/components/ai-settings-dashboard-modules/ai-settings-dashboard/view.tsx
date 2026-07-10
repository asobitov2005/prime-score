"use client";
import type { AiSettingsDashboardScope } from "./controller";
import { AiSettingsDashboardView1 } from "./view-section-03";

export function AiSettingsDashboardView({ scope }: { scope: AiSettingsDashboardScope }) {
  return <AiSettingsDashboardView1 scope={scope} />;
}
