"use client";
import { useAiSettingsDashboardController } from "./controller";
import { AiSettingsDashboardView } from "./view";

export function AiSettingsDashboard() {
  const scope = useAiSettingsDashboardController();
  return <AiSettingsDashboardView scope={scope} />;
}
