"use client";
import type { AppShellScope } from "./controller";
import { AppShellView1 } from "./view-section-01";

export function AppShellView({ scope }: { scope: AppShellScope }) {
  return <AppShellView1 scope={scope} />;
}
