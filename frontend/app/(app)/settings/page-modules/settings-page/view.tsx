"use client";
import type { SettingsPageScope } from "./controller";
import { SettingsPageView1 } from "./view-section-08";

export function SettingsPageView({ scope }: { scope: SettingsPageScope }) {
  return <SettingsPageView1 scope={scope} />;
}
