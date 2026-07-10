import { TestFormat, TestType, getAdminServerApiBaseUrl, http, https } from "./server-data-dependencies";

export const baseUrl = getAdminServerApiBaseUrl();

export const ADMIN_REQUEST_TIMEOUT_MS = 60_000;

export const ADMIN_REQUEST_MAX_ATTEMPTS = 3;

export function requestJsonFromAdminApi(url: string, headers: Record<string, string>): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === "https:" ? https : http;
    const request = transport.request(
      parsedUrl,
      {
        method: "GET",
        headers,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 500,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );

    request.setTimeout(ADMIN_REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error(`Admin API request timed out after ${ADMIN_REQUEST_TIMEOUT_MS}ms`));
    });
    request.on("error", reject);
    request.end();
  });
}

export function sanitizeListeningSectionTitle(type: TestType, title: string) {
  const trimmedTitle = title.trim();
  if (type !== "listening") {
    return title;
  }
  if (/^(Reading Passage|Listening Part|Passage|Part)\s+\d+\s*$/i.test(trimmedTitle)) {
    return "";
  }
  if (/^Part\s+\d+\.\s+Questions\s+\d+\s*-\s*\d+\.?$/i.test(trimmedTitle)) {
    return "";
  }
  return title;
}

export function sanitizeListeningSectionContent(type: TestType, content: string) {
  if (type !== "listening") {
    return content;
  }
  return content
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !/^Part\s+\d+\.\s+Questions\s+\d+\s*-\s*\d+\.?$/i.test(trimmed);
    })
    .join("\n")
    .trim();
}

export type BackendAdminTest = {
  id: string;
  title: string;
  test_type: TestType;
  format: TestFormat;
  source: "cambridge" | "real_exam" | "custom";
  source_detail: string;
  access_type: "public" | "premium";
  status: "draft" | "published" | "archived";
  review_status?: "needs_review" | "approved" | "rejected";
  updated_at?: string | null;
  total_questions: number;
  version: number;
};

export type BackendAdminDraft = {
  metadata: {
    title: string;
    type: TestType;
    format: TestFormat;
    source: "cambridge" | "real_exam" | "custom";
    source_detail: string;
    status: "draft" | "published" | "archived";
    access_type: "public" | "premium";
    version: number;
    time_limit_label: string;
  };
  content: {
    sections: Array<{
      id: string;
      label: string;
      title: string;
      subtitle: string;
      content: string;
      paragraphs?: Array<{ id: string; label: string; text: string }>;
      showLabels?: boolean;
      media_kind: "text" | "audio";
      audio_url?: string;
      audio_duration_seconds?: number | null;
      transcript?: string;
      transcript_segments?: Array<{
        id?: string;
        start_sec?: number;
        end_sec?: number;
        text?: string;
        confidence?: number;
        drift_start_sec?: number;
        drift_end_sec?: number;
        needs_review?: boolean;
      }>;
      transcript_question_locations?: Array<{
        question_id?: string | null;
        question_label?: string;
        question_prompt?: string;
        start_sec?: number;
        end_sec?: number;
        answer_text?: string;
        correct_answer?: string;
      }>;
      marker_count: number;
    }>;
  };
  questionGroups: Array<{
    id: string;
    section_id: string;
    title: string;
    instructions: string;
    type_id: string;
    question_start: number;
    question_end: number;
    shared_options: string[];
    question_block?: string;
    answer_block?: string;
    secondary_block?: string;
    raw_content?: string;
    questions: Array<{
      id: string;
      label: string;
      prompt: string;
      accepted_answers: string[];
      explanation: string;
      variants: string[];
    }>;
  }>;
  questions: Array<{
    id: string;
    section_id: string;
    label: string;
    type_id: string;
    prompt: string;
    accepted_answers: string[];
    explanation: string;
    variants: string[];
  }>;
  review: {
    checklist: Array<{
      id: string;
      label: string;
      status: "ready" | "draft" | "blocked";
      detail: string;
    }>;
    notes: string[];
  };
  decisions: {
    question_bank: {
      label: string;
      state: "not_supported";
      detail: string;
    };
    payment: {
      label: string;
      state: "paused";
      detail: string;
    };
    listening_timer: {
      label: string;
      state: "audio_duration_plus_2_minutes";
      detail: string;
    };
  };
};
