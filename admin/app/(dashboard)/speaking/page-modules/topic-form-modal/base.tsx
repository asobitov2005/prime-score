"use client";
import type { SpeakingPartNumber, SpeakingTopic } from "../dependencies";

export function useBaseScope(props: {
  mode: "create" | "edit";
  part: SpeakingPartNumber;
  topic?: SpeakingTopic | null;
  part2Topics: SpeakingTopic[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const {
    mode,
    part,
    topic,
    part2Topics,
    open,
    onClose,
    onSaved,
  } = props;
    return { mode, part, topic, part2Topics, open, onClose, onSaved };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
