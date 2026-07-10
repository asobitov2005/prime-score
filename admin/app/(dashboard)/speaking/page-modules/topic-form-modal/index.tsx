"use client";
import type { SpeakingPartNumber, SpeakingTopic } from "../dependencies";
import { useTopicFormModalController } from "./controller";
import { TopicFormModalView } from "./view";

export function TopicFormModal(props: {
  mode: "create" | "edit";
  part: SpeakingPartNumber;
  topic?: SpeakingTopic | null;
  part2Topics: SpeakingTopic[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const scope = useTopicFormModalController(props);
  return <TopicFormModalView scope={scope} />;
}
