import { getTestById, getTestsByAccess, getTestsByType } from "@/lib/mock-data";
import type { AccessType, TestCatalogItem, TestType } from "@/lib/types";

const baseUrl = (
  process.env.API_INTERNAL_BASE_URL
  ?? process.env.NEXT_PUBLIC_API_BASE_URL
  ?? "http://localhost:8000/api"
).replace(/\/$/, "");

type BackendTestCatalogItem = {
  id: string;
  title: string;
  test_type: TestType;
  format: "full" | "part";
  access_type: AccessType;
  status: "draft" | "published" | "archived";
  source?: string | null;
  source_detail?: string | null;
  description?: string | null;
  exam_time_limit_min: number;
  total_questions: number;
  version: number;
  section_count: number;
};

type BackendTestDetail = BackendTestCatalogItem & {
  payment_paused: boolean;
  question_bank_enabled: boolean;
  sections: Array<{
    section_id: string;
    section_number: number;
    title: string | null;
    intro: string | null;
    question_count: number;
  }>;
};

async function requestApi<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "no body");
    console.error(`Frontend API request failed for ${path} with status ${response.status}: ${text}`);
    throw new Error(`Frontend API request failed for ${path}`);
  }

  return (await response.json()) as T;
}

function buildPlaceholderSections(count: number): TestCatalogItem["sections"] {
  return Array.from({ length: count }, (_, index) => ({
    id: `placeholder-section-${index + 1}`,
    number: index + 1,
    title: `Section ${index + 1}`,
    questionCount: Math.floor(40 / Math.max(1, count)),
    teaser: "Structured section summary will be hydrated from the detail endpoint."
  }));
}

function mapCatalogItem(item: BackendTestCatalogItem): TestCatalogItem {
  return {
    id: item.id,
    slug: item.id,
    title: item.title,
    type: item.test_type,
    format: item.format ?? "full",
    accessType: item.access_type,
    status: item.status,
    source: item.source ?? "custom",
    sourceDetail: item.source_detail ?? "PrimeScore",
    questionCount: item.total_questions,
    estimatedMinutes: item.exam_time_limit_min,
    isPremiumLocked: item.access_type === "premium",
    description: item.description ?? "Structured IELTS test detail.",
    tags: [item.test_type, item.access_type, item.source ?? "custom"],
    sections: buildPlaceholderSections(item.section_count)
  };
}

function mapTestDetail(item: BackendTestDetail): TestCatalogItem {
  return {
    ...mapCatalogItem(item),
    sections: item.sections.map((section) => ({
      id: section.section_id,
      number: section.section_number,
      title: section.title ?? `Section ${section.section_number}`,
      questionCount: section.question_count,
      teaser: section.intro ?? "Structured section intro"
    }))
  };
}

export async function getCatalogTests(query: { type?: string; access?: string; format?: string } = {}): Promise<TestCatalogItem[]> {
  const search = new URLSearchParams();
  if (query.type === "reading" || query.type === "listening") {
    search.set("type", query.type);
  }
  if (query.access === "public" || query.access === "premium") {
    search.set("access_type", query.access);
  }
  if (query.format === "full" || query.format === "part") {
    search.set("format", query.format);
  }

  try {
    const items = await requestApi<BackendTestCatalogItem[]>(`/tests${search.size ? `?${search.toString()}` : ""}`);
    return items.map(mapCatalogItem);
  } catch {
    const byType = query.type ? getTestsByType(query.type) : getTestsByType();
    let results = query.access ? byType.filter((test) => test.accessType === query.access) : byType;
    // Note: mock data doesn't have format, but we'll add it to types
    return results;
  }
}

export async function getCatalogTestDetail(testId: string): Promise<TestCatalogItem | null> {
  try {
    const item = await requestApi<BackendTestDetail>(`/tests/${testId}`);
    return mapTestDetail(item);
  } catch {
    return getTestById(testId) ?? null;
  }
}

export function getFallbackTestsByAccess(access?: AccessType): TestCatalogItem[] {
  return access ? getTestsByAccess(access) : getTestsByType();
}
