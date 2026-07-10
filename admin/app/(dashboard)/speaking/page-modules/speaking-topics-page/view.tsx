"use client";
import type { SpeakingTopicsPageScope } from "./controller";
import { SpeakingTopicsPageView1 } from "./view-section-01";

export function SpeakingTopicsPageView({ scope }: { scope: SpeakingTopicsPageScope }) {
  return <SpeakingTopicsPageView1 scope={scope} />;
}
