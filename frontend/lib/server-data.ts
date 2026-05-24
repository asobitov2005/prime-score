import { FRONTEND_API_TIMEOUT_MS, getFrontendServerApiBaseUrl } from "@/lib/api-base";
import { getTestSourceDetail, getTestSourceLabel } from "@/lib/test-source";
import type { AccessType, TestCatalogItem, TestType } from "@/lib/types";

const baseUrl = getFrontendServerApiBaseUrl();

type BackendTestCatalogItem = {
  id: string;
  slug?: string | null;
  title: string;
  section_title?: string | null;
  test_type: TestType;
  format: string;
  access_type: AccessType;
  status: "draft" | "published" | "archived";
  source?: string | null;
  source_detail?: string | null;
  description?: string | null;
  exam_time_limit_min: number;
  total_questions: number;
  version: number;
  section_count: number;
  created_at: string;
};

type BackendTestDetail = BackendTestCatalogItem & {
  payment_paused: boolean;
  question_bank_enabled: boolean;
  time_limit_seconds: number;
  sections: Array<{
    section_id: string;
    section_number: number;
    title: string | null;
    intro: string | null;
    question_count: number;
    paragraphs?: any[];
    content?: string | null;
    show_labels?: boolean;
    subtitle?: string | null;
    question_groups?: any[];
  }>;
};

class ServerDataRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function requestApi<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FRONTEND_API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "no body");
    console.error(`Frontend API request failed for ${path} with status ${response.status}: ${text}`);
    throw new ServerDataRequestError(`Frontend API request failed for ${path}`, response.status);
  }

  return (await response.json()) as T;
}

async function requestCachedApi<T>(path: string, revalidateSeconds: number, tag: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FRONTEND_API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      next: { revalidate: revalidateSeconds, tags: [tag] },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "no body");
    console.error(`Frontend cached API request failed for ${path} with status ${response.status}: ${text}`);
    throw new Error(`Frontend cached API request failed for ${path}`);
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
    slug: item.slug ?? item.id,
    title: item.title,
    sectionTitle: item.section_title ?? undefined,
    type: item.test_type,
    format: (item.format ?? "full") as TestCatalogItem["format"],
    accessType: item.access_type,
    status: item.status,
    source: item.source ?? "custom",
    sourceDetail: getTestSourceDetail(item.source, item.source_detail),
    questionCount: item.total_questions,
    estimatedMinutes: item.exam_time_limit_min,
    isPremiumLocked: item.access_type === "premium",
    description: item.description ?? "Structured IELTS test detail.",
    tags: [item.test_type, item.access_type, getTestSourceLabel(item.source)],
    createdAt: item.created_at,
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

export async function getCatalogTests(query: { type?: string; access?: string; format?: string; source?: string } = {}): Promise<TestCatalogItem[]> {
  const search = new URLSearchParams();
  if (query.type === "reading" || query.type === "listening") {
    search.set("type", query.type);
  }
  if (query.access === "public" || query.access === "premium") {
    search.set("access_type", query.access);
  }
  if (query.format) {
    search.set("format", query.format);
  }
  if (query.source) {
    search.set("source", query.source);
  }
  search.set("status", "published");

  try {
    const items = await requestApi<BackendTestCatalogItem[]>(`/tests${search.size ? `?${search.toString()}` : ""}`);
    return items.map(mapCatalogItem);
  } catch {
    return [];
  }
}

export async function getLandingFeaturedTests(): Promise<TestCatalogItem[]> {
  const search = new URLSearchParams();
  search.set("status", "published");

  try {
    const items = await requestCachedApi<BackendTestCatalogItem[]>(
      `/tests?${search.toString()}`,
      900,
      "landing-featured-tests",
    );
    return items.map(mapCatalogItem);
  } catch {
    return [];
  }
}

export async function getCatalogTestDetail(testId: string): Promise<TestCatalogItem | null> {
  try {
    const item = await requestApi<BackendTestDetail>(`/tests/${testId}`);
    return mapTestDetail(item);
  } catch (error) {
    if (error instanceof ServerDataRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getGuestTestSnapshot(testId: string): Promise<BackendTestDetail | null> {
  try {
    return await requestApi<BackendTestDetail>(`/tests/${testId}`);
  } catch {
    return null;
  }
}

export function getFallbackTestsByAccess(access?: AccessType): TestCatalogItem[] {
  void access;
  return [];
}
