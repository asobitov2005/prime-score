import { fetchAdminApi } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";
import { adminApi } from "@/lib/api";
import { writingApi, type WritingTask } from "@/lib/writing-api";
import type { AdminTestSummary } from "@/lib/types";

export interface OnlineFullMockInput {
  title: string;
  description: string | null;
  reading_test_id: string;
  listening_test_id: string;
  writing_task_1_id: string;
  writing_task_2_id: string;
  is_published: boolean;
  academic_confirmed: boolean;
}

export interface OnlineFullMock extends OnlineFullMockInput {
  id: string;
  module: "academic";
}

export interface OnlineMockCatalog {
  tests: Pick<AdminTestSummary, "id" | "title" | "type" | "format" | "status">[];
  writingTasks: Pick<WritingTask, "id" | "title" | "task_type" | "status">[];
}

export type MockComponentKey = "reading_test_id" | "listening_test_id" | "writing_task_1_id" | "writing_task_2_id";

export const MOCK_COMPONENTS: readonly { key: MockComponentKey; title: string; description: string; href: string }[] = [
  { key: "reading_test_id", title: "Reading", description: "One published, full Reading test", href: "/tests?type=reading" },
  { key: "listening_test_id", title: "Listening", description: "One published, full Listening test", href: "/tests?type=listening" },
  { key: "writing_task_1_id", title: "Writing Task 1", description: "One published Academic Task 1 prompt", href: "/writing?task_type=task_1" },
  { key: "writing_task_2_id", title: "Writing Task 2", description: "One published Task 2 essay prompt", href: "/writing?task_type=task_2" },
];

export function getMockComponentOptions(catalog: OnlineMockCatalog, key: MockComponentKey): { id: string; title: string }[] {
  if (key === "reading_test_id" || key === "listening_test_id") {
    const type = key === "reading_test_id" ? "reading" : "listening";
    return catalog.tests.filter((test) => test.type === type && test.format === "full" && test.status === "published");
  }
  const taskType = key === "writing_task_1_id" ? "task_1" : "task_2";
  return catalog.writingTasks.filter((task) => task.task_type === taskType && task.status === "published");
}

export function validateOnlineMock(input: OnlineFullMockInput, catalog: OnlineMockCatalog): string | null {
  if (!input.title.trim()) return "Give this Full Mock a title.";
  if (input.title.trim().length > 160) return "Keep the Full Mock title within 160 characters.";
  if ((input.description?.length ?? 0) > 10000) return "Keep the description within 10,000 characters.";
  for (const component of MOCK_COMPONENTS) {
    if (!getMockComponentOptions(catalog, component.key).some((item) => item.id === input[component.key])) {
      return `Select an available published ${component.title} item.`;
    }
  }
  if (input.is_published && !input.academic_confirmed) return "Confirm that all selected content is IELTS Academic before publishing.";
  return null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchAdminApi(`${ADMIN_PUBLIC_API_BASE_URL}/mock/online-mocks${path}`, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    let message = `Full Mock request failed (${response.status}).`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail)) message = body.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join("; ") || message;
    } catch { /* Keep the HTTP error when the response is not JSON. */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const onlineMockApi = {
  async list(): Promise<OnlineFullMock[]> {
    const items: OnlineFullMock[] = [];
    let page = 1;
    while (true) {
      const response = await request<{ items: OnlineFullMock[]; total: number }>(`?page=${page}&page_size=100`);
      items.push(...response.items);
      if (items.length >= response.total) return items;
      if (response.items.length === 0) throw new Error("Full Mock catalog changed while loading. Refresh to try again.");
      page += 1;
    }
  },
  create(input: OnlineFullMockInput): Promise<OnlineFullMock> {
    return request("", { method: "POST", body: JSON.stringify(input) });
  },
  update(id: string, input: Partial<OnlineFullMockInput>): Promise<OnlineFullMock> {
    return request(`/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
  },
};

export async function loadOnlineMockCatalog(): Promise<OnlineMockCatalog> {
  const tests = await adminApi.listTests();
  const writingTasks: OnlineMockCatalog["writingTasks"] = [];
  let page = 1;
  while (true) {
    const response = await writingApi.listTasks({ status: "published", page, page_size: 100 });
    writingTasks.push(...response.items.map(({ id, title, task_type, status }) => ({ id, title, task_type, status })));
    if (writingTasks.length >= response.total) break;
    if (response.items.length === 0) throw new Error("Writing task catalog changed while loading. Refresh to try again.");
    page += 1;
  }
  return { tests: tests.map(({ id, title, type, format, status }) => ({ id, title, type, format, status })), writingTasks };
}
