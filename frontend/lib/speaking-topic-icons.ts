import type { LucideIcon } from "lucide-react";
import { ICON_MAP_PART_01 } from "./speaking-topic-icons-part-01";
import { ICON_MAP_PART_02 } from "./speaking-topic-icons-part-02";
import { ICON_MAP_PART_03 } from "./speaking-topic-icons-part-03";
import { ICON_MAP_PART_04 } from "./speaking-topic-icons-part-04";

export type SpeakingTopicIconTone = "purple" | "blue" | "green" | "orange" | "pink";

const ICON_MAP: Record<string, LucideIcon> = {
  ...ICON_MAP_PART_01,
  ...ICON_MAP_PART_02,
  ...ICON_MAP_PART_03,
  ...ICON_MAP_PART_04,
};

export function resolveSpeakingTopicIcon(iconId: string | null | undefined): LucideIcon | null {
  if (!iconId) return null;
  return ICON_MAP[iconId] ?? null;
}

export function isSpeakingTopicIconTone(value: string | null | undefined): value is SpeakingTopicIconTone {
  return value === "purple" || value === "blue" || value === "green" || value === "orange" || value === "pink";
}
