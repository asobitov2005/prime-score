import type { LucideIcon } from "lucide-react";

export const SPEAKING_ICON_TONES = ["purple", "blue", "green", "orange", "pink"] as const;
export type SpeakingIconTone = (typeof SPEAKING_ICON_TONES)[number];
export type SpeakingIconOption = { id: string; label: string; Icon: LucideIcon };
