import { SPEAKING_ICON_TONES, type SpeakingIconOption, type SpeakingIconTone } from "./speaking-icons-types";
import { SPEAKING_TOPIC_ICONS_PART_01 } from "./speaking-icons-part-01";
import { SPEAKING_TOPIC_ICONS_PART_02 } from "./speaking-icons-part-02";
import { SPEAKING_TOPIC_ICONS_PART_03 } from "./speaking-icons-part-03";
import { SPEAKING_TOPIC_ICONS_PART_04 } from "./speaking-icons-part-04";

export { SPEAKING_ICON_TONES };
export type { SpeakingIconOption, SpeakingIconTone };

export const SPEAKING_TOPIC_ICONS: SpeakingIconOption[] = [
  ...SPEAKING_TOPIC_ICONS_PART_01,
  ...SPEAKING_TOPIC_ICONS_PART_02,
  ...SPEAKING_TOPIC_ICONS_PART_03,
  ...SPEAKING_TOPIC_ICONS_PART_04,
];

const iconMap = new Map(SPEAKING_TOPIC_ICONS.map((item) => [item.id, item]));

export function resolveSpeakingIcon(iconId: string | null | undefined): SpeakingIconOption | null {
  if (!iconId) return null;
  return iconMap.get(iconId) ?? null;
}

export function isSpeakingIconTone(value: string | null | undefined): value is SpeakingIconTone {
  return Boolean(value && SPEAKING_ICON_TONES.includes(value as SpeakingIconTone));
}

export function iconsForPart(_part: 1 | 2 | 3): SpeakingIconOption[] {
  return SPEAKING_TOPIC_ICONS;
}

export function filterSpeakingIcons(icons: SpeakingIconOption[], query: string): SpeakingIconOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return icons;
  return icons.filter((item) => {
    const haystack = `${item.label} ${item.id.replace(/-/g, " ")}`.toLowerCase();
    return haystack.includes(normalized);
  });
}

export const SPEAKING_ICON_TONE_STYLES: Record<SpeakingIconTone, string> = {
  purple: "bg-violet-100 text-violet-700 border-violet-200",
  blue: "bg-sky-100 text-sky-700 border-sky-200",
  green: "bg-emerald-100 text-emerald-700 border-emerald-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  pink: "bg-pink-100 text-pink-700 border-pink-200",
};
