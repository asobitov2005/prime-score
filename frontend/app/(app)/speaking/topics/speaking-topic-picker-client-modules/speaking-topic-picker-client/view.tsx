"use client";
import type { SpeakingTopicPickerClientScope } from "./controller";
import { SpeakingTopicPickerClientView1 } from "./view-section-01";

export function SpeakingTopicPickerClientView({ scope }: { scope: SpeakingTopicPickerClientScope }) {
  return <SpeakingTopicPickerClientView1 scope={scope} />;
}
