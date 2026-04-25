import type { AdminTestDraftState, AdminTestSummary, TestFormat } from "@/lib/types";
import { getClientAdminAccessToken } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";

const baseUrl = ADMIN_PUBLIC_API_BASE_URL;

function buildRequestHeaders(): Record<string, string> {
  const token = getClientAdminAccessToken();
  if (!token) {
    throw new Error("Admin session is missing.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

type BackendAdminTest = {
  id: string;
  title: string;
  test_type: "reading" | "listening";
  format: TestFormat;
  source: "cambridge" | "real_exam" | "custom";
  source_detail: string;
  access_type: "public" | "premium";
  status: "draft" | "published" | "archived";
  updated_at?: string | null;
  total_questions: number;
  version: number;
};

type BackendAdminDraftPayload = {
  metadata: {
    title: string;
    type: "reading" | "listening";
    format: TestFormat;
    source: "cambridge" | "real_exam" | "custom";
    source_detail: string;
    access_type: "public" | "premium";
    time_limit_label: string;
  };
  content: Array<{
    id?: string;
    label: string;
    title: string;
    subtitle: string;
    content: string;
    paragraphs: Array<{ id: string; label: string; text: string }>;
    showLabels: boolean;
    media_kind: "text" | "audio";
    marker_count: number;
  }>;
  question_groups: Array<{
    id?: string;
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
    questions: Array<{
      id?: string;
      label: string;
      prompt: string;
      accepted_answers: string[];
      explanation: string;
      variants: string[];
    }>;
  }>;
};

const questionTypeAliases: Record<string, string> = {
  "mc-single": "reading_mc_single",
  "mc-multiple": "reading_mc_multiple",
  "tfng": "reading_true_false_not_given",
  "yng": "reading_yes_no_not_given",
  "matching-info": "reading_matching_information",
  "matching-headings": "reading_matching_headings",
  "matching-features": "reading_matching_features",
  "matching-endings": "reading_matching_sentence_endings",
  "sentence-completion": "reading_sentence_completion",
  "summary-word-bank": "reading_summary_completion_wordbank",
  "summary-free": "reading_summary_completion_freetext",
  "note-flow-chart": "reading_note_completion",
  "diagram-map": "reading_diagram_labeling",
  "short-answer": "reading_short_answer",
  "matching": "listening_matching",
  "labeling": "listening_plan_map_labeling",
  "completion": "listening_form_completion",
  "map-free-text": "listening_plan_map_labeling"
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${baseUrl}${path}`;
  console.log(`[Admin API] Requesting: ${url}`, init?.method || "GET");
  
  try {
    const response = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: {
        ...buildRequestHeaders(),
        ...(init?.headers ?? {})
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`[Admin API] Error ${response.status}: ${errorText}`);
      throw new Error(`Admin API request failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`[Admin API] Fetch exception:`, error);
    throw error;
  }
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getIeltsRange(index: number, type: string) {
  if (type === "listening") {
    const start = index * 10 + 1;
    const end = (index + 1) * 10;
    return `${start}-${end}`;
  }
  // Reading standard: 1-13, 14-26, 27-40
  if (index === 0) return "1-13";
  if (index === 1) return "14-26";
  if (index === 2) return "27-40";
  return "X-Y";
}

function parsePassageBlockStyle(rawText: string) {
  const trimmed = rawText.trim();
  const hasOuterBraces = trimmed.startsWith("{") && trimmed.endsWith("}");
  let body = hasOuterBraces ? trimmed.slice(1, -1).trim() : trimmed;
  let italic = false;
  let center = false;

  let matched = true;
  while (matched) {
    matched = false;
    if (body.startsWith("<i>")) {
      italic = true;
      body = body.slice(3).trimStart();
      matched = true;
    }
    if (body.startsWith("<c>")) {
      center = true;
      body = body.slice(3).trimStart();
      matched = true;
    }
  }

  return {
    isStyled: italic || center,
  };
}

function buildParagraphPayloads(content: string, showLabels: boolean): BackendAdminDraftPayload["content"][number]["paragraphs"] {
  let labelIndex = 0;
  return content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const isLabelled = !parsePassageBlockStyle(block).isStyled;
      const label = showLabels && isLabelled ? String.fromCharCode(65 + labelIndex) : "";
      if (isLabelled) {
        labelIndex += 1;
      }

      return {
        id: `para-${index}`,
        label,
        text: block,
      };
    });
}

function toBackendDraftPayload(draft: AdminTestDraftState): BackendAdminDraftPayload {
  const resolvedQuestionType = (typeId: string): string => {
    if (typeId.includes("_")) {
      return typeId;
    }
    if (draft.metadata.type === "listening") {
      const listeningType = {
        "mc-single": "listening_mc_single",
        "mc-multiple": "listening_mc_multiple",
        "sentence-completion": "listening_sentence_completion",
        "short-answer": "listening_short_answer",
        "completion": "listening_form_completion",
        "labeling": "listening_plan_map_labeling",
        "matching": "listening_matching",
        "map-free-text": "listening_plan_map_labeling"
      }[typeId];
      if (listeningType) {
        return listeningType;
      }
    }
    return questionTypeAliases[typeId] ?? typeId;
  };

  const sectionIdMap = new Map<string, string>();
  for (const section of draft.content.sections) {
    sectionIdMap.set(section.id, isUuidLike(section.id) ? section.id : crypto.randomUUID());
  }

  const questionGroups = draft.questionGroups && draft.questionGroups.length > 0 
    ? draft.questionGroups 
    : [];

  return {
    metadata: {
      title: draft.metadata.title,
      type: draft.metadata.type,
      format: draft.metadata.format,
      source: draft.metadata.source,
      source_detail: draft.metadata.sourceDetail,
      access_type: draft.metadata.accessType,
      time_limit_label: draft.metadata.timeLimitLabel
    },
    content: draft.content.sections.map((section, idx) => {
      const parsedParagraphs = section.content.trim()
        ? buildParagraphPayloads(section.content, Boolean(section.showLabels))
        : section.paragraphs || [];

      // Auto-generate standardized IELTS subtitle/intro
      const range = getIeltsRange(idx, draft.metadata.type);
      const autoSubtitle = draft.metadata.type === "listening"
        ? `Part ${idx + 1}. Questions ${range}.`
        : `You should spend about 20 minutes on Questions ${range}, which are based on Reading Passage ${idx + 1} below.`;

      return {
        id: sectionIdMap.get(section.id),
        label: draft.metadata.type === "listening" ? `Part ${idx + 1}` : `Passage ${idx + 1}`,
        title: section.title, // This is the admin-provided name (e.g. "The Life of Penguins")
        subtitle: autoSubtitle,
        content: section.content,
        paragraphs: parsedParagraphs,
        showLabels: Boolean(section.showLabels),
        media_kind: section.mediaKind,
        marker_count: section.markerCount
      };
    }),
    question_groups: questionGroups.map((group) => ({
      id: isUuidLike(group.id) ? group.id : undefined,
      section_id: sectionIdMap.get(group.sectionId) ?? crypto.randomUUID(),
      title: group.title,
      instructions: group.instructions,
      type_id: resolvedQuestionType(group.typeId),
      question_start: group.questionStart,
      question_end: group.questionEnd,
      shared_options: group.sharedOptions,
      question_block: group.questionBlock,
      answer_block: group.answerBlock,
      secondary_block: group.secondaryBlock,
      questions: group.questions.map((question) => ({
        id: isUuidLike(question.id) ? question.id : undefined,
        label: question.label,
        prompt: question.prompt,
        accepted_answers: question.acceptedAnswers,
        explanation: question.explanation,
        variants: question.variants || []
      }))
    }))
  };
}

function mapAdminTest(test: BackendAdminTest): AdminTestSummary {
  return {
    id: test.id,
    title: test.title,
    type: test.test_type,
    format: test.format,
    source: test.source,
    sourceDetail: test.source_detail,
    accessType: test.access_type,
    status: test.status,
    updatedAt: test.updated_at ?? new Date().toISOString(),
    questions: test.total_questions,
    version: test.version
  };
}

export const adminApi = {
  async createDraft(draft: AdminTestDraftState): Promise<AdminTestSummary> {
    const response = await requestJson<BackendAdminTest>("/tests/draft", {
      method: "POST",
      body: JSON.stringify(toBackendDraftPayload(draft))
    });
    return mapAdminTest(response);
  },
  async updateDraft(testId: string, draft: AdminTestDraftState): Promise<AdminTestSummary> {
    const response = await requestJson<BackendAdminTest>(`/tests/${testId}/draft`, {
      method: "PUT",
      body: JSON.stringify(toBackendDraftPayload(draft))
    });
    return mapAdminTest(response);
  },
  async quickFixPublished(testId: string, draft: AdminTestDraftState): Promise<AdminTestSummary> {
    const response = await requestJson<BackendAdminTest>(`/tests/${testId}/quick-fix`, {
      method: "PUT",
      body: JSON.stringify(toBackendDraftPayload(draft))
    });
    return mapAdminTest(response);
  },
  async publishTest(testId: string): Promise<AdminTestSummary> {
    const response = await requestJson<BackendAdminTest>(`/tests/${testId}/publish`, {
      method: "POST"
    });
    return mapAdminTest(response);
  },
  async deleteDraft(testId: string): Promise<{ message: string }> {
    return requestJson(`/tests/${testId}`, {
      method: "DELETE"
    });
  },
  async bulkPublish(ids: string[], status: "published" | "draft" | "archived"): Promise<{ message: string }> {
    return requestJson(`/tests/bulk-publish`, {
      method: "PATCH",
      body: JSON.stringify({ ids, status })
    });
  },
  async bulkAccess(ids: string[], accessType: "public" | "premium"): Promise<{ message: string }> {
    return requestJson(`/tests/bulk-status`, {
      method: "PATCH",
      body: JSON.stringify({ ids, access_type: accessType })
    });
  }
};
