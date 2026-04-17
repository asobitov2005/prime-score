import type { AdminTestDraftState, AdminTestSummary } from "@/lib/types";
import { getClientAdminAccessToken } from "@/lib/auth";

const baseUrl = (process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL ?? "http://localhost:8000/api/admin").replace(/\/$/, "");

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
  format: "full" | "part";
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
    format: "full" | "part";
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
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...buildRequestHeaders(),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
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
      let parsedParagraphs = section.paragraphs || [];
      if (parsedParagraphs.length === 0 && section.content) {
        parsedParagraphs = section.content.split(/\n\s*\n/).filter(p => p.trim()).map((text, i) => ({
          id: `para-${i}`,
          label: section.showLabels ? String.fromCharCode(65 + i) : "",
          text: text.trim()
        }));
      }

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
  async publishTest(testId: string): Promise<AdminTestSummary> {
    const response = await requestJson<BackendAdminTest>(`/tests/${testId}/publish`, {
      method: "POST"
    });
    return mapAdminTest(response);
  }
};
