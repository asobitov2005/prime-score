"use client";
import type { SiteShellScope } from "./controller";
import { SiteShellView1 } from "./view-section-12";

export function SiteShellView({ scope }: { scope: SiteShellScope }) {
  return <SiteShellView1 scope={scope} />;
}
