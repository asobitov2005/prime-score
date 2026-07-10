"use client";
import { useSpeakingTopicPickerClientController } from "./controller";
import { SpeakingTopicPickerClientView } from "./view";

export function SpeakingTopicPickerClient() {
  const scope = useSpeakingTopicPickerClientController();
  return <SpeakingTopicPickerClientView scope={scope} />;
}
