"use client";
import { useSpeakingTopicsPageController } from "./controller";
import { SpeakingTopicsPageView } from "./view";

export function SpeakingTopicsPage() {
  const scope = useSpeakingTopicsPageController();
  return <SpeakingTopicsPageView scope={scope} />;
}
