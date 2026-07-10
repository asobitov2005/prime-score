"use client";
import { useSettingsPageController } from "./controller";
import { SettingsPageView } from "./view";

export function SettingsPage() {
  const scope = useSettingsPageController();
  return <SettingsPageView scope={scope} />;
}
