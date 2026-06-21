import { fetchAdminApi } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";

const baseUrl = ADMIN_PUBLIC_API_BASE_URL;

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

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

async function handleJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.detail) {
        detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

export interface CategoryTagStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

const CATEGORY_STYLE_MAP: Record<string, CategoryTagStyle> = {
  accommodation: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-500" },
  hometown: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  work_study: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" },
  daily_routine: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500" },
  hobbies_leisure: { bg: "bg-fuchsia-50", text: "text-fuchsia-700", border: "border-fuchsia-200", dot: "bg-fuchsia-500" },
  food_cooking: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
  friends_social_life: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", dot: "bg-pink-500" },
  travel_holidays: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", dot: "bg-cyan-500" },
  weather_seasons: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", dot: "bg-teal-500" },
  sport_fitness: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  shopping: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
  music: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-500" },
  reading_news: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-500" },
  mobile_phones_apps: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500" },
  clothes_fashion: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", dot: "bg-pink-500" },
  education: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" },
  technology: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  health: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  environment: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500" },
  work_careers: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  society_community: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-500" },
  travel_tourism: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", dot: "bg-cyan-500" },
  culture_traditions: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
  media_communication: { bg: "bg-fuchsia-50", text: "text-fuchsia-700", border: "border-fuchsia-200", dot: "bg-fuchsia-500" },
  economy_public_policy: { bg: "bg-stone-50", text: "text-stone-700", border: "border-stone-200", dot: "bg-stone-500" },
};

const FALLBACK_CATEGORY_STYLES: CategoryTagStyle[] = [
  { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" },
  { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-500" },
  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
  { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", dot: "bg-cyan-500" },
];

export function getCategoryStyle(category: string): CategoryTagStyle {
  const normalized = normalizeCategorySlug(category);
  if (CATEGORY_STYLE_MAP[normalized]) {
    return CATEGORY_STYLE_MAP[normalized];
  }

  const hash = normalized.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return FALLBACK_CATEGORY_STYLES[hash % FALLBACK_CATEGORY_STYLES.length] ?? FALLBACK_CATEGORY_STYLES[0];
}

export function normalizeCategorySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function mergeCategoryOptions(...groups: Array<string[] | readonly string[]>): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const group of groups) {
    for (const item of group) {
      const normalized = normalizeCategorySlug(item);
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      merged.push(normalized);
    }
  }

  return merged.sort((left, right) => formatCategoryLabel(left).localeCompare(formatCategoryLabel(right)));
}

export function formatCategoryLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function parseBulletPoints(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export const speakingApi = {
  async listCategories(): Promise<SpeakingCategoryListResponse> {
    const response = await fetchAdminApi(`${baseUrl}/speaking/categories`, {
      cache: "no-store",
    });
    return handleJson<SpeakingCategoryListResponse>(response);
  },

  async createCategory(input: SpeakingCategoryCreateInput): Promise<SpeakingCategory> {
    const response = await fetchAdminApi(`${baseUrl}/speaking/categories`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(input),
    });
    return handleJson<SpeakingCategory>(response);
  },

  async deleteCategory(slug: string): Promise<void> {
    const response = await fetchAdminApi(`${baseUrl}/speaking/categories/${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`;
      try {
        const body = await response.json();
        if (body?.detail) {
          detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
        }
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
  },

  async listTopics(params: ListSpeakingTopicParams = {}): Promise<SpeakingTopicListResponse> {
    const query = new URLSearchParams();
    if (params.part_number) query.set("part_number", String(params.part_number));
    if (params.category) query.set("category", params.category);
    const qs = query.toString();
    const response = await fetchAdminApi(`${baseUrl}/speaking/topics${qs ? `?${qs}` : ""}`, {
      cache: "no-store",
    });
    return handleJson<SpeakingTopicListResponse>(response);
  },

  async createTopic(input: SpeakingTopicCreateInput): Promise<SpeakingTopic> {
    const response = await fetchAdminApi(`${baseUrl}/speaking/topics`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(input),
    });
    return handleJson<SpeakingTopic>(response);
  },

  async updateTopic(id: string, input: SpeakingTopicUpdateInput): Promise<SpeakingTopic> {
    const response = await fetchAdminApi(`${baseUrl}/speaking/topics/${id}`, {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify(input),
    });
    return handleJson<SpeakingTopic>(response);
  },

  async deleteTopic(id: string): Promise<void> {
    const response = await fetchAdminApi(`${baseUrl}/speaking/topics/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`;
      try {
        const body = await response.json();
        if (body?.detail) {
          detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
        }
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
  },
};
