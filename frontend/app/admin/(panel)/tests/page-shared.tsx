"use client";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api";

export interface AdminTest {
  id: string;
  title: string;
  test_type: string;
  format: string;
  access_type: string;
  status: string;
  source: string;
  total_questions: number;
  version: number;
}

export type StatusFilter = "all" | "draft" | "published" | "archived";

export type TypeFilter = "all" | "reading" | "listening";

export const statusFilters: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Hammasi" },
  { id: "draft", label: "Draft" },
  { id: "published", label: "Published" },
  { id: "archived", label: "Archived" },
];

export const typeFilters: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "Hammasi" },
  { id: "reading", label: "Reading" },
  { id: "listening", label: "Listening" },
];

export function formatDisplay(f: string) {
  if (!f || f === "full") return "Full Test";
  return f.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
