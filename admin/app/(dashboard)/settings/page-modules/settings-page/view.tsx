"use client";
import type { SettingsPageScope } from "./controller";
import { SettingsPageView1 } from "./view-section-02";

export function SettingsPageView({ scope }: { scope: SettingsPageScope }) {
  return <SettingsPageView1 scope={scope} />;
}
