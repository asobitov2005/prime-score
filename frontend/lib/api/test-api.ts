import type { ApiRequest } from "@/lib/api/core";
import type {
  SaveAnswerBody,
  StartAttemptBody,
  TestListQuery,
} from "@/lib/api/types";
import { getTestSourceDetail, getTestSourceLabel } from "@/lib/test-source";
import type {
  AccessType,
  TestCatalogItem,
  TestType,
} from "@/lib/types";

export type BackendTestCatalogItem = {
  id: string;
  slug?: string | null;
  title: string;
  section_title?: string | null;
  test_type: TestType;
  format: TestCatalogItem["format"];
  access_type: AccessType;
  status: TestCatalogItem["status"];
  source?: string | null;
  source_detail?: string | null;
  description?: string | null;
  exam_time_limit_min: number;
  total_questions: number;
  section_count: number;
  created_at: string;
  sections?: Array<{
    section_id: string;
    section_number: number;
    title?: string | null;
    intro?: string | null;
    question_count: number;
  }>;
};

function buildPlaceholderSections(
  count: number,
): TestCatalogItem["sections"] {
  return Array.from({ length: count }, (_, index) => ({
    id: `section-${index + 1}`,
    number: index + 1,
    title: `Section ${index + 1}`,
    questionCount: Math.floor(40 / Math.max(1, count)),
    teaser: "Section detail is loaded from the test endpoint.",
  }));
}

export function mapBackendTestCatalogItem(
  item: BackendTestCatalogItem,
): TestCatalogItem {
  return {
    id: item.id,
    slug: item.slug ?? item.id,
    title: item.title,
    sectionTitle: item.section_title ?? undefined,
    type: item.test_type,
    format: item.format ?? "full",
    accessType: item.access_type,
    status: item.status,
    source: item.source ?? "custom",
    sourceDetail: getTestSourceDetail(item.source, item.source_detail),
    questionCount: item.total_questions,
    estimatedMinutes: item.exam_time_limit_min,
    isPremiumLocked: item.access_type === "premium",
    description: item.description ?? "Structured IELTS test detail.",
    tags: [
      item.test_type,
      item.access_type,
      getTestSourceLabel(item.source),
    ],
    createdAt: item.created_at,
    sections: item.sections?.length
      ? item.sections.map((section) => ({
          id: section.section_id,
          number: section.section_number,
          title: section.title ?? `Section ${section.section_number}`,
          questionCount: section.question_count,
          teaser: section.intro ?? "Structured section intro",
        }))
      : buildPlaceholderSections(item.section_count),
  };
}

export function createTestApi(request: ApiRequest) {
  return {
    listTests: (query: TestListQuery = {}) => {
      const search = new URLSearchParams();
      if (query.type) {
        search.set("type", query.type);
      }
      if (query.access) {
        search.set("access_type", query.access);
      }
      search.set("status", "published");
      return request<BackendTestCatalogItem[]>(
        `/tests?${search.toString()}`,
        { method: "GET" },
      ).then((data) => ({
        data: data.map(mapBackendTestCatalogItem),
      }));
    },
    getTest: (testId: string) =>
      request<BackendTestCatalogItem>(`/tests/${testId}`).then(
        mapBackendTestCatalogItem,
      ),
    startAttempt: (testId: string, body: StartAttemptBody) =>
      request<{ attemptId: string; testSnapshot: unknown }>(
        `/tests/${testId}/start`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      ),
    saveAnswer: (attemptId: string, body: SaveAnswerBody) =>
      request<{ ok: true }>(`/attempts/${attemptId}/answer`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    submitAttempt: (attemptId: string) =>
      request<{ ok: true }>(`/attempts/${attemptId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          confirm: true,
          reason: "user_confirmed",
        }),
      }),
    getAttemptResult: (attemptId: string) =>
      request<unknown>(`/attempts/${attemptId}/result`),
    getAttemptReview: (attemptId: string) =>
      request<unknown>(`/attempts/${attemptId}/review`),
    getTestCatalog: (type?: string, access?: AccessType) => {
      const search = new URLSearchParams();
      if (type === "reading" || type === "listening" || type === "writing") {
        search.set("type", type);
      }
      if (access) {
        search.set("access_type", access);
      }
      search.set("status", "published");
      return request<BackendTestCatalogItem[]>(
        `/tests?${search.toString()}`,
        { method: "GET" },
      ).then((items) => items.map(mapBackendTestCatalogItem));
    },
  };
}
