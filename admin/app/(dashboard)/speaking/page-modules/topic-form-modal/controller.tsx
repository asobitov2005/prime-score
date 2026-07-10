"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";

export function useTopicFormModalController(props: {
  mode: "create" | "edit";
  part: SpeakingPartNumber;
  topic?: SpeakingTopic | null;
  part2Topics: SpeakingTopic[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  let scope = useBaseScope(props);
  scope = { ...scope, ...useControllerPart1(scope) };
  return scope;
}

export type TopicFormModalScope = ReturnType<typeof useTopicFormModalController>;
