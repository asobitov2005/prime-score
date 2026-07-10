import { requestServerUserApi } from "./server-writing-dependencies";
import { WritingQuestionSubtype } from "./server-writing-part-01";
import { WritingDraftListResponse, WritingLimitStatus } from "./server-writing-part-02";

export async function getWritingLimits(): Promise<WritingLimitStatus> {
  return requestServerUserApi<WritingLimitStatus>(`/writing/limits`);
}

export async function getWritingDrafts(): Promise<WritingDraftListResponse> {
  return requestServerUserApi<WritingDraftListResponse>(`/writing/drafts`);
}

export const STORAGE_PREFIX = "/api/storage/";

export function resolveWritingAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = (
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:8000"
  )
    .replace(/\/$/, "")
    .replace(/\/api$/, "");
  if (url.startsWith(STORAGE_PREFIX) || url.startsWith("/api/")) {
    return `${base}${url}`;
  }
  if (url.startsWith("/")) {
    return `${base}${url}`;
  }
  return `${base}/${url}`;
}

export const QUESTION_SUBTYPES_TASK1: { value: WritingQuestionSubtype; label: string }[] = [
  { value: "bar_chart", label: "Bar Chart" },
  { value: "line_graph", label: "Line Graph" },
  { value: "pie_chart", label: "Pie Chart" },
  { value: "table", label: "Table" },
  { value: "process", label: "Process" },
  { value: "map", label: "Map" },
  { value: "two_charts", label: "Two Charts" },
];

export const QUESTION_SUBTYPES_TASK2: { value: WritingQuestionSubtype; label: string }[] = [
  { value: "opinion", label: "Opinion Essay" },
  { value: "advantages_disadvantages", label: "Advantages & Disadvantages" },
  { value: "discussion", label: "Discussion Essay" },
  { value: "problem_solution", label: "Problem & Solution" },
  { value: "two_part", label: "Two-Part Question" },
  { value: "causes_effects", label: "Causes & Effects" },
  { value: "direct_question", label: "Direct Question" },
];
