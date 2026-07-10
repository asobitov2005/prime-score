import { ADMIN_PUBLIC_API_BASE_URL } from "./speaking-api-dependencies";

export const baseUrl = ADMIN_PUBLIC_API_BASE_URL;

export type SpeakingPartNumber = 1 | 2 | 3;

export type SpeakingDifficulty = "easy" | "medium" | "hard";

export type SpeakingSourceKind = "custom" | "editorial" | "real_reported" | "seed";

export interface SpeakingTopic {
  id: string;
  part_number: SpeakingPartNumber;
  topic_title: string;
  prompt_text: string;
  bullet_points: string[];
  followup_group_key: string | null;
  difficulty_label: SpeakingDifficulty | string | null;
  category_tags: string[];
  source_kind: SpeakingSourceKind | string;
  source_note: string | null;
  active: boolean;
  seed_rank: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SpeakingTopicListResponse {
  items: SpeakingTopic[];
  total: number;
}

export interface SpeakingTopicCreateInput {
  part_number: SpeakingPartNumber;
  topic_title: string;
  prompt_text?: string;
  bullet_points?: string[];
  linked_part2_topic_id?: string | null;
  active?: boolean;
  icon?: string | null;
  icon_tone?: string | null;
  is_new_topic?: boolean;
}

export interface SpeakingTopicUpdateInput {
  topic_title: string;
  prompt_text?: string;
  bullet_points?: string[];
  linked_part2_topic_id?: string | null;
  active?: boolean;
  icon?: string | null;
  icon_tone?: string | null;
  is_new_topic?: boolean;
}

export interface ListSpeakingTopicParams {
  part_number?: SpeakingPartNumber;
  category?: string;
}

export type SpeakingCategoryScope = "part1" | "cross_part" | "custom";

export interface SpeakingCategory {
  slug: string;
  label: string | null;
  scope: SpeakingCategoryScope;
  active: boolean;
  topic_count: number;
  created_at: string;
  updated_at: string;
}

export interface SpeakingCategoryListResponse {
  items: SpeakingCategory[];
  total: number;
}

export interface SpeakingCategoryCreateInput {
  name: string;
  scope?: SpeakingCategoryScope;
  label?: string | null;
}

export const PART1_CATEGORIES = [
  "accommodation",
  "hometown",
  "work_study",
  "daily_routine",
  "hobbies_leisure",
  "food_cooking",
  "friends_social_life",
  "travel_holidays",
  "weather_seasons",
  "sport_fitness",
  "shopping",
  "music",
  "reading_news",
  "mobile_phones_apps",
  "clothes_fashion",
] as const;

export const CROSS_PART_CATEGORIES = [
  "education",
  "technology",
  "health",
  "environment",
  "work_careers",
  "society_community",
  "travel_tourism",
  "culture_traditions",
  "media_communication",
  "economy_public_policy",
] as const;

export const ALL_SPEAKING_CATEGORIES = [...PART1_CATEGORIES, ...CROSS_PART_CATEGORIES] as const;

export const PART_META: Record<
  SpeakingPartNumber,
  {
    label: string;
    description: string;
    bulletHint: string;
    promptHint: string;
    titleLabel?: string;
    titleHint?: string;
    defaultIcon?: string;
  }
> = {
  1: {
    label: "Part 1",
    description: "Short personal questions grouped by everyday themes.",
    bulletHint: "One question per line (typically 3–4 questions).",
    promptHint: "Short topic label shown to the examiner, e.g. “Home and living space”.",
    titleLabel: "Topic title",
    titleHint: "The topic name shown to users, e.g. “Home and living space”.",
    defaultIcon: "home",
  },
  2: {
    label: "Part 2",
    description: "Long-turn cue cards with 1-minute preparation.",
    bulletHint: "Cue-card bullet points, one per line (what / when / why / how).",
    promptHint: "Main cue-card instruction, e.g. “Describe a useful skill you learned.”",
  },
  3: {
    label: "Part 3",
    description: "Abstract discussion questions linked to Part 2 themes.",
    bulletHint: "Discussion questions, one per line.",
    promptHint: "Discussion theme, e.g. “Discuss how education should prepare people for modern life.”",
    titleLabel: "Discussion theme",
    titleHint: "The discussion topic title, e.g. “Education and modern skills”.",
  },
};

export function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}
