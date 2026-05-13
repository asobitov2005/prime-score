import type {
  AdminAiCreateThreadInput,
  AdminAiJob,
  AdminAiSendMessageInput,
  AdminAiThreadDetail,
  AdminAiThreadSummary,
  AdminAiToolTrace,
  AdminAiUpdateThreadInput,
  AdminPaymentCardSummary,
  AdminPaymentSettingsSummary,
  AdminPaymentSummary,
  AdminTranscriptQuestionLocation,
  AdminTranscriptSegment,
  PaymentMethod,
  PaymentStatus,
  AdminTestDraftState,
  AdminTestSummary,
  TestFormat
} from "@/lib/types";
import { fetchAdminApi } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";
import { normalizeAdminTestSourceDetail } from "@/lib/test-source";

const baseUrl = ADMIN_PUBLIC_API_BASE_URL;

function sanitizeListeningSectionTitle(type: "reading" | "listening", title: string) {
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

function sanitizeListeningSectionContent(type: "reading" | "listening", content: string) {
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

function resolveAdminQuestionType(typeId: string, sharedOptions: string[]) {
  if (typeId === "listening_plan_map_labeling" && sharedOptions.length === 0) {
    return "listening_plan_map_labeling_free_text";
  }
  return typeId;
}

function sanitizeQuestionGroupTitle(title: string) {
  const trimmedTitle = title.trim();
  if (/^Question Group(?:\s+\d+(?:\s*[-,]\s*\d+)*)?$/i.test(trimmedTitle)) {
    return "";
  }
  return trimmedTitle;
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
  review_status?: "needs_review" | "approved" | "rejected";
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
      audio_url: string;
      audio_duration_seconds?: number | null;
      transcript: string;
      transcript_segments?: Array<{
        id?: string;
        start_sec?: number;
        end_sec?: number;
        text?: string;
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
  question_groups: Array<{
    id?: string;
    section_id: string;
    title: string;
    instructions: string;
    options_title?: string;
    type_id: string;
    question_start: number;
    question_end: number;
    shared_options: string[];
    question_block?: string;
    answer_block?: string;
    secondary_block?: string;
    diagram_title?: string;
    diagram_image_url?: string;
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

type BackendAdminDraft = {
  metadata: {
    title: string;
    type: "reading" | "listening";
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
  questionGroups?: Array<{
    id: string;
    section_id: string;
    title: string;
    instructions: string;
    options_title?: string;
    type_id: string;
    question_start: number;
    question_end: number;
    shared_options: string[];
    question_block?: string;
    answer_block?: string;
    secondary_block?: string;
    raw_content?: string;
    diagram_title?: string;
    diagram_image_url?: string;
    questions: Array<{
      id: string;
      label: string;
      prompt: string;
      accepted_answers: string[];
      explanation: string;
      variants: string[];
    }>;
  }>;
  questions?: Array<{
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

type BackendAdminAiScope = {
  type?: "test" | "plan" | "user" | "analytics" | "general";
  id?: string | null;
  label?: string | null;
  description?: string | null;
};

type BackendAdminAiThreadSummary = {
  id: string;
  title: string;
  summary?: string | null;
  status: "idle" | "queued" | "running" | "completed" | "failed" | "archived";
  updated_at?: string | null;
  created_at?: string | null;
  message_count?: number | null;
  last_message_preview?: string | null;
  active_job_id?: string | null;
  scope?: BackendAdminAiScope | null;
};

type BackendAdminAiMessage = {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  created_at?: string | null;
  status?: "pending" | "streaming" | "completed" | "failed" | null;
  author_label?: string | null;
  job_id?: string | null;
  tool_name?: string | null;
  error_message?: string | null;
};

type BackendAdminAiTrace = {
  id: string;
  label?: string | null;
  tool_name: string;
  status?: "pending" | "running" | "completed" | "failed" | "cancelled" | null;
  started_at?: string | null;
  finished_at?: string | null;
  duration_ms?: number | null;
  input_summary?: string | null;
  output_summary?: string | null;
};

type BackendAdminAiJob = {
  id: string;
  title: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  kind?: "chat" | "analysis" | "generation" | "review" | null;
  summary?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  model?: string | null;
  error_message?: string | null;
  progress?: {
    completed_steps?: number | null;
    total_steps?: number | null;
    label?: string | null;
  } | null;
  traces?: BackendAdminAiTrace[] | null;
};

type BackendAdminAiThreadDetail = BackendAdminAiThreadSummary & {
  messages?: BackendAdminAiMessage[] | null;
  jobs?: BackendAdminAiJob[] | null;
};

type BackendPayment = {
  id: string;
  invoice_code: string;
  user_name?: string | null;
  user_username?: string | null;
  plan_name: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number | string;
  card_number?: string | null;
  expires_at?: string | null;
  status_reason?: string | null;
  updated_at?: string | null;
};

type BackendPaymentCard = {
  id: string;
  label: string;
  card_number: string;
  card_type: string;
  holder_name?: string | null;
  is_active: boolean;
  priority: number;
  bot_source: string;
};

type BackendAdminAudioTranscriptResponse = {
  transcript: string;
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
};

type BackendAdminAudioTranscriptJobCreateResponse = {
  job_id: string;
  status: string;
};

type BackendAdminAudioTranscriptJobRead = {
  job_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  result?: BackendAdminAudioTranscriptResponse | null;
  error?: string | null;
};

function mapTranscriptSegments(
  segments: Array<{
    id?: string;
    start_sec?: number;
    end_sec?: number;
    text?: string;
    confidence?: number;
    drift_start_sec?: number;
    drift_end_sec?: number;
    needs_review?: boolean;
  }> | undefined | null
): AdminTranscriptSegment[] {
  return (segments ?? [])
    .filter((segment) => typeof segment?.text === "string" && segment.text.trim().length > 0)
    .map((segment, index) => ({
      id: String(segment.id ?? `segment-${index + 1}`),
      startSec: Math.max(0, Number(segment.start_sec ?? 0)),
      endSec: Math.max(0, Number(segment.end_sec ?? segment.start_sec ?? 0)),
      text: String(segment.text ?? "").trim(),
      confidence: segment.confidence == null ? undefined : Number(segment.confidence),
      driftStartSec: segment.drift_start_sec == null ? undefined : Number(segment.drift_start_sec),
      driftEndSec: segment.drift_end_sec == null ? undefined : Number(segment.drift_end_sec),
      needsReview: segment.needs_review == null ? undefined : Boolean(segment.needs_review),
    }));
}

function mapTranscriptQuestionLocations(
  locations:
    | Array<{
        question_id?: string | null;
        question_label?: string;
        question_prompt?: string;
        start_sec?: number;
        end_sec?: number;
        answer_text?: string;
        correct_answer?: string;
      }>
    | undefined
    | null
): AdminTranscriptQuestionLocation[] {
  return (locations ?? [])
    .filter((location) => typeof location?.question_label === "string" && location.question_label.trim().length > 0)
    .map((location) => ({
      questionId: location.question_id ?? undefined,
      questionLabel: String(location.question_label ?? "").trim(),
      questionPrompt: String(location.question_prompt ?? "").trim(),
      startSec: Math.max(0, Number(location.start_sec ?? 0)),
      endSec: Math.max(0, Number(location.end_sec ?? location.start_sec ?? 0)),
      answerText: String(location.answer_text ?? "").trim(),
      correctAnswer: String(location.correct_answer ?? "").trim(),
    }));
}

type BackendPaymentSettings = {
  id: string;
  telegram_api_id?: string | null;
  telegram_api_hash?: string | null;
  phone_number?: string | null;
  active_bot: string;
  support_contact?: string | null;
  is_enabled: boolean;
  poll_fallback_enabled: boolean;
};

type AdminPaymentCardInput = {
  label: string;
  cardNumber: string;
  cardType: "humo" | "uzcard";
  holderName?: string | null;
  isActive?: boolean;
  priority?: number;
  botSource: "HUMOcardbot" | "CardXabarBot";
};

type AdminPaymentSettingsInput = {
  telegramApiId?: string | null;
  telegramApiHash?: string | null;
  phoneNumber?: string | null;
  activeBot?: "HUMOcardbot" | "CardXabarBot";
  supportContact?: string | null;
  isEnabled?: boolean;
  pollFallbackEnabled?: boolean;
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
    const response = await fetchAdminApi(url, {
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`[Admin API] Error ${response.status}: ${errorText}`);
      let detail = errorText.trim();
      try {
        const parsed = JSON.parse(errorText) as { detail?: string };
        if (parsed?.detail?.trim()) {
          detail = parsed.detail.trim();
        }
      } catch {}
      throw new Error(
        detail
          ? `Admin API request failed: ${response.status} ${response.statusText} - ${detail}`
          : `Admin API request failed: ${response.status} ${response.statusText}`
      );
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

function generateUuid() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }
  return `fallback-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
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

function detectSharedListeningAudio(
  sections: Array<{ audioUrl?: string; audioDurationSeconds?: number | null }>
) {
  if (sections.length === 0) {
    return null;
  }

  const firstUrl = String(sections[0]?.audioUrl ?? "").trim();
  if (!firstUrl) {
    return null;
  }

  if (!sections.every((section) => String(section.audioUrl ?? "").trim() === firstUrl)) {
    return null;
  }

  const durationSeconds = sections.find((section) => (section.audioDurationSeconds ?? 0) > 0)?.audioDurationSeconds ?? null;
  return { audioUrl: firstUrl, audioDurationSeconds: durationSeconds };
}

function toBackendDraftPayload(draft: AdminTestDraftState): BackendAdminDraftPayload {
  const resolvedQuestionType = (typeId: string): string => {
    if (typeId === "listening_plan_map_labeling_free_text") {
      return "listening_plan_map_labeling";
    }
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
    sectionIdMap.set(section.id, isUuidLike(section.id) ? section.id : generateUuid());
  }

  const questionGroups = draft.questionGroups && draft.questionGroups.length > 0 
    ? draft.questionGroups 
    : [];
  const sharedListeningAudio = draft.metadata.type === "listening" && draft.metadata.format === "full"
    ? detectSharedListeningAudio(draft.content.sections)
    : null;

  return {
    metadata: {
      title: draft.metadata.title,
      type: draft.metadata.type,
      format: draft.metadata.format,
      source: draft.metadata.source,
      source_detail: normalizeAdminTestSourceDetail(draft.metadata.source, draft.metadata.sourceDetail),
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
        audio_url: section.audioUrl || "",
        audio_duration_seconds: sharedListeningAudio
          ? (idx === 0 ? (section.audioDurationSeconds ?? sharedListeningAudio.audioDurationSeconds ?? null) : null)
          : (section.audioDurationSeconds ?? null),
        transcript: section.transcript || "",
        transcript_segments: (section.transcriptSegments ?? []).map((segment) => ({
          id: segment.id,
          start_sec: segment.startSec,
          end_sec: segment.endSec,
          text: segment.text,
        })),
        transcript_question_locations: (section.transcriptQuestionLocations ?? []).map((location) => ({
          question_id: location.questionId,
          question_label: location.questionLabel,
          question_prompt: location.questionPrompt,
          start_sec: location.startSec,
          end_sec: location.endSec,
          answer_text: location.answerText,
          correct_answer: location.correctAnswer,
        })),
        marker_count: section.markerCount
      };
    }),
    question_groups: questionGroups.map((group) => ({
      id: isUuidLike(group.id) ? group.id : undefined,
      section_id: sectionIdMap.get(group.sectionId) ?? generateUuid(),
      title: sanitizeQuestionGroupTitle(group.title),
      instructions: group.instructions,
      options_title: group.optionsTitle,
      type_id: resolvedQuestionType(group.typeId),
      question_start: group.questionStart,
      question_end: group.questionEnd,
      shared_options: group.typeId === "listening_plan_map_labeling_free_text" ? [] : group.sharedOptions,
      question_block: group.questionBlock,
      answer_block: group.answerBlock,
      secondary_block: group.secondaryBlock,
      diagram_title: "",
      diagram_image_url: group.diagramImageUrl,
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
    sourceDetail: normalizeAdminTestSourceDetail(test.source, test.source_detail),
    accessType: test.access_type,
    status: test.status,
    reviewStatus: test.review_status ?? "needs_review",
    updatedAt: test.updated_at ?? new Date().toISOString(),
    questions: test.total_questions,
    version: test.version
  };
}

function mapAdminDraft(draft: BackendAdminDraft): AdminTestDraftState {
  return {
    metadata: {
      title: draft.metadata.title,
      type: draft.metadata.type,
      format: draft.metadata.format ?? "full",
      source: draft.metadata.source,
      sourceDetail: normalizeAdminTestSourceDetail(draft.metadata.source, draft.metadata.source_detail),
      accessType: draft.metadata.access_type,
      status: draft.metadata.status,
      version: draft.metadata.version,
      timeLimitLabel: draft.metadata.time_limit_label,
    },
    content: {
      sections: draft.content.sections.map((section) => ({
        id: section.id,
        label: section.label,
        title: sanitizeListeningSectionTitle(draft.metadata.type, section.title),
        subtitle: section.subtitle,
        content: sanitizeListeningSectionContent(draft.metadata.type, section.content),
        paragraphs: section.paragraphs,
        showLabels: section.showLabels,
        mediaKind: section.media_kind,
        audioUrl: section.audio_url ?? "",
        audioDurationSeconds: section.audio_duration_seconds ?? null,
        transcript: section.transcript ?? "",
        transcriptSegments: mapTranscriptSegments(section.transcript_segments),
        transcriptQuestionLocations: mapTranscriptQuestionLocations(section.transcript_question_locations),
        markerCount: section.marker_count,
      })),
    },
    questionGroups: (draft.questionGroups ?? []).map((group) => ({
      id: group.id,
      sectionId: group.section_id,
      title: sanitizeQuestionGroupTitle(String(group.title ?? "")),
      instructions: group.instructions,
      optionsTitle: group.options_title ?? "",
      typeId: resolveAdminQuestionType(group.type_id, group.shared_options),
      questionStart: group.question_start,
      questionEnd: group.question_end,
      sharedOptions: group.shared_options,
      questionBlock: group.question_block,
      answerBlock: group.answer_block,
      secondaryBlock: group.secondary_block,
      rawContent: group.raw_content,
      diagramTitle: group.diagram_title,
      diagramImageUrl: group.diagram_image_url,
      questions: group.questions.map((question) => ({
        id: question.id,
        label: question.label,
        prompt: question.prompt,
        acceptedAnswers: question.accepted_answers,
        explanation: question.explanation,
        variants: question.variants,
      })),
    })),
    questions: (draft.questions ?? []).map((question) => ({
      id: question.id,
      label: question.label,
      prompt: question.prompt,
      acceptedAnswers: question.accepted_answers,
      explanation: question.explanation,
      variants: question.variants,
    })),
    review: {
      checklist: draft.review.checklist,
      notes: draft.review.notes,
    },
    decisions: {
      questionBank: draft.decisions.question_bank,
      payment: draft.decisions.payment,
      listeningTimer: draft.decisions.listening_timer,
    },
  };
}

function fallbackIsoDate(value?: string | null): string {
  return value ?? new Date().toISOString();
}

function mapAdminAiScope(scope?: BackendAdminAiScope | null): AdminAiThreadSummary["scope"] {
  return {
    type: scope?.type ?? "general",
    id: scope?.id ?? undefined,
    label: scope?.label?.trim() || "General workspace",
    description: scope?.description?.trim() || undefined
  };
}

function mapAdminAiTrace(trace: BackendAdminAiTrace): AdminAiToolTrace {
  return {
    id: trace.id,
    label: trace.label?.trim() || trace.tool_name,
    toolName: trace.tool_name,
    status: trace.status ?? "pending",
    startedAt: trace.started_at ?? null,
    finishedAt: trace.finished_at ?? null,
    durationMs: trace.duration_ms ?? null,
    inputSummary: trace.input_summary?.trim() || null,
    outputSummary: trace.output_summary?.trim() || null
  };
}

function mapAdminAiJob(job: BackendAdminAiJob): AdminAiJob {
  return {
    id: job.id,
    title: job.title,
    status: job.status,
    kind: job.kind ?? "chat",
    summary: job.summary?.trim() || "Waiting for model output.",
    createdAt: fallbackIsoDate(job.created_at),
    startedAt: job.started_at ?? null,
    finishedAt: job.finished_at ?? null,
    model: job.model ?? null,
    errorMessage: job.error_message?.trim() || null,
    progress: job.progress
      ? {
          completedSteps: job.progress.completed_steps ?? 0,
          totalSteps: job.progress.total_steps ?? 0,
          label: job.progress.label?.trim() || "Progress"
        }
      : null,
    traces: (job.traces ?? []).map(mapAdminAiTrace)
  };
}

function mapAdminAiThreadSummary(thread: BackendAdminAiThreadSummary): AdminAiThreadSummary {
  return {
    id: thread.id,
    title: thread.title,
    summary: thread.summary?.trim() || "No summary yet.",
    status: thread.status,
    updatedAt: fallbackIsoDate(thread.updated_at),
    createdAt: fallbackIsoDate(thread.created_at),
    messageCount: thread.message_count ?? 0,
    lastMessagePreview: thread.last_message_preview?.trim() || "No messages yet.",
    activeJobId: thread.active_job_id ?? null,
    scope: mapAdminAiScope(thread.scope)
  };
}

function mapAdminAiThreadDetail(thread: BackendAdminAiThreadDetail): AdminAiThreadDetail {
  const summary = mapAdminAiThreadSummary(thread);
  return {
    ...summary,
    messages: (thread.messages ?? []).map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content ?? "",
      createdAt: fallbackIsoDate(message.created_at),
      status: message.status ?? "completed",
      authorLabel: message.author_label?.trim() || (message.role === "user" ? "You" : "PrimeScore AI"),
      jobId: message.job_id ?? null,
      toolName: message.tool_name ?? null,
      errorMessage: message.error_message?.trim() || null
    })),
    jobs: (thread.jobs ?? []).map(mapAdminAiJob)
  };
}

function mapAdminPayment(payment: BackendPayment): AdminPaymentSummary {
  return {
    id: payment.id,
    invoiceCode: payment.invoice_code,
    user: payment.user_name ?? (payment.user_username ? `@${payment.user_username}` : "Unknown user"),
    plan: payment.plan_name,
    method: payment.method,
    status: payment.status,
    amount: typeof payment.amount === "number" ? payment.amount.toLocaleString("en-US") : String(payment.amount),
    card: payment.card_number ?? "-",
    expiresAt: payment.expires_at ?? null,
    statusReason: payment.status_reason ?? null,
    updatedAt: fallbackIsoDate(payment.updated_at),
  };
}

function mapAdminPaymentCard(card: BackendPaymentCard): AdminPaymentCardSummary {
  return {
    id: card.id,
    label: card.label,
    cardNumber: card.card_number,
    cardType: card.card_type,
    holderName: card.holder_name ?? null,
    isActive: card.is_active,
    priority: card.priority,
    botSource: card.bot_source,
  };
}

function mapAdminPaymentSettings(settings: BackendPaymentSettings): AdminPaymentSettingsSummary {
  return {
    id: settings.id,
    telegramApiId: settings.telegram_api_id ?? null,
    telegramApiHash: settings.telegram_api_hash ?? null,
    phoneNumber: settings.phone_number ?? null,
    activeBot: settings.active_bot,
    supportContact: settings.support_contact ?? null,
    isEnabled: settings.is_enabled,
    pollFallbackEnabled: settings.poll_fallback_enabled,
  };
}

export const adminApi = {
  async listTests(): Promise<AdminTestSummary[]> {
    const response = await requestJson<BackendAdminTest[]>("/tests");
    return response.map(mapAdminTest);
  },
  async getDraft(testId: string): Promise<AdminTestDraftState> {
    const response = await requestJson<BackendAdminDraft>(`/tests/${testId}/draft`);
    return mapAdminDraft(response);
  },
  async uploadImage(file: File): Promise<{ publicUrl: string; filename: string; contentType: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetchAdminApi(`${baseUrl}/images/upload`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`Image upload failed: ${response.status} ${response.statusText}`);
    }
    const payload = await response.json() as {
      public_url: string;
      filename: string;
      content_type: string;
    };
    return {
      publicUrl: payload.public_url,
      filename: payload.filename,
      contentType: payload.content_type,
    };
  },
  async uploadAudio(file: File): Promise<{ publicUrl: string; filename: string; contentType: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetchAdminApi(`${baseUrl}/audio/upload`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      let detail = "";
      try {
        const payload = await response.json() as { detail?: string };
        detail = payload.detail ? ` - ${payload.detail}` : "";
      } catch {
        detail = "";
      }
      throw new Error(`Audio upload failed: ${response.status} ${response.statusText}${detail}`);
    }
    const payload = await response.json() as {
      public_url: string;
      filename: string;
      content_type: string;
    };
    return {
      publicUrl: payload.public_url,
      filename: payload.filename,
      contentType: payload.content_type,
    };
  },
  async generateListeningTranscript(input: {
    audioUrl: string;
    audioFilename?: string;
    audioContentType?: string;
    sectionLabel?: string;
    sectionTitle?: string;
    transcript?: string;
    transcriptSegments?: AdminTranscriptSegment[];
    onProgress?: (state: { value: number; label: string }) => void;
    onJobId?: (jobId: string) => void;
    questions: Array<{
      questionId?: string;
      questionLabel: string;
      questionPrompt: string;
      acceptedAnswers: string[];
    }>;
  }): Promise<{
    transcript: string;
    transcriptSegments: AdminTranscriptSegment[];
    transcriptQuestionLocations: AdminTranscriptQuestionLocation[];
  }> {
    const payload = {
      audio_url: input.audioUrl,
      audio_filename: input.audioFilename,
      audio_content_type: input.audioContentType,
      section_label: input.sectionLabel,
      section_title: input.sectionTitle,
      transcript: input.transcript,
      transcript_segments: (input.transcriptSegments ?? []).map((segment) => ({
        id: segment.id,
        start_sec: segment.startSec,
        end_sec: segment.endSec,
        text: segment.text,
      })),
      questions: input.questions.map((question) => ({
        question_id: question.questionId,
        question_label: question.questionLabel,
        question_prompt: question.questionPrompt,
        accepted_answers: question.acceptedAnswers,
      })),
    };

    const started = await requestJson<BackendAdminAudioTranscriptJobCreateResponse>("/audio/transcribe/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    input.onJobId?.(started.job_id);
    input.onProgress?.({ value: 8, label: "Queued for transcription" });

    let response: BackendAdminAudioTranscriptResponse | null = null;
    const maxPolls = 180;
    for (let poll = 0; poll < maxPolls; poll += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const job = await requestJson<BackendAdminAudioTranscriptJobRead>(`/audio/transcribe/jobs/${started.job_id}`);
      const progressValue = Math.min(94, 12 + poll * 2);
      input.onProgress?.({
        value: job.status === "queued" ? 10 : progressValue,
        label:
          job.status === "queued"
            ? "Preparing audio..."
            : job.status === "running"
              ? "Generating transcript and timestamps..."
              : job.status === "completed"
                ? "Finalizing transcript..."
                : "Processing transcript...",
      });
      if (job.status === "completed" && job.result) {
        response = job.result;
        break;
      }
      if (job.status === "failed") {
        throw new Error(job.error?.trim() || "Transcript generation failed.");
      }
      if (job.status === "cancelled") {
        throw new Error(job.error?.trim() || "Transcript generation cancelled.");
      }
    }

    if (!response) {
      const finalJob = await requestJson<BackendAdminAudioTranscriptJobRead>(`/audio/transcribe/jobs/${started.job_id}`);
      if (finalJob.status === "completed" && finalJob.result) {
        response = finalJob.result;
      } else if (finalJob.status === "failed") {
        throw new Error(finalJob.error?.trim() || "Transcript generation failed.");
      } else if (finalJob.status === "cancelled") {
        throw new Error(finalJob.error?.trim() || "Transcript generation cancelled.");
      }
    }

    if (!response) {
      throw new Error("Transcript generation is still running. Try again in a moment.");
    }
    input.onProgress?.({ value: 100, label: "Transcript ready" });

    return {
      transcript: response.transcript ?? "",
      transcriptSegments: mapTranscriptSegments(response.transcript_segments),
      transcriptQuestionLocations: mapTranscriptQuestionLocations(response.transcript_question_locations),
    };
  },
  async cancelListeningTranscriptJob(jobId: string): Promise<void> {
    await requestJson<BackendAdminAudioTranscriptJobRead>(`/audio/transcribe/jobs/${jobId}/cancel`, {
      method: "POST",
    });
  },
  async listAiThreads(): Promise<AdminAiThreadSummary[]> {
    const response = await requestJson<BackendAdminAiThreadSummary[]>("/ai/threads");
    return response.map(mapAdminAiThreadSummary);
  },
  async createAiThread(input: AdminAiCreateThreadInput = {}): Promise<AdminAiThreadDetail> {
    const response = await requestJson<BackendAdminAiThreadDetail>("/ai/threads", {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        scope: input.scope
      })
    });
    return mapAdminAiThreadDetail(response);
  },
  async getAiThread(threadId: string): Promise<AdminAiThreadDetail> {
    const response = await requestJson<BackendAdminAiThreadDetail>(`/ai/threads/${threadId}`);
    return mapAdminAiThreadDetail(response);
  },
  async updateAiThread(threadId: string, input: AdminAiUpdateThreadInput): Promise<AdminAiThreadDetail> {
    const response = await requestJson<BackendAdminAiThreadDetail>(`/ai/threads/${threadId}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: input.title,
        status: input.status
      })
    });
    return mapAdminAiThreadDetail(response);
  },
  async archiveAiThread(threadId: string): Promise<void> {
    const response = await fetchAdminApi(`${baseUrl}/ai/threads/${threadId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Admin API request failed: ${response.status} ${response.statusText}`);
    }
  },
  async sendAiMessage(threadId: string, input: AdminAiSendMessageInput): Promise<AdminAiThreadDetail> {
    const response = await requestJson<BackendAdminAiThreadDetail>(`/ai/threads/${threadId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content: input.content,
        scope: input.scope
      })
    });
    return mapAdminAiThreadDetail(response);
  },
  async retryAiJob(threadId: string, jobId: string): Promise<AdminAiThreadDetail> {
    const response = await requestJson<BackendAdminAiThreadDetail>(`/ai/threads/${threadId}/jobs/${jobId}/retry`, {
      method: "POST"
    });
    return mapAdminAiThreadDetail(response);
  },
  async cancelAiJob(threadId: string, jobId: string): Promise<AdminAiThreadDetail> {
    const response = await requestJson<BackendAdminAiThreadDetail>(`/ai/threads/${threadId}/jobs/${jobId}/cancel`, {
      method: "POST"
    });
    return mapAdminAiThreadDetail(response);
  },
  async createDraft(draft: AdminTestDraftState): Promise<AdminTestSummary> {
    const response = await requestJson<BackendAdminTest>("/tests/draft", {
      method: "POST",
      body: JSON.stringify(toBackendDraftPayload(draft))
    });
    return mapAdminTest(response);
  },
  async updateDraft(
    testId: string,
    draft: AdminTestDraftState,
    options: { allowNewVersion?: boolean } = {}
  ): Promise<AdminTestSummary> {
    const search = new URLSearchParams();
    if (options.allowNewVersion) {
      search.set("allow_new_version", "true");
    }
    const response = await requestJson<BackendAdminTest>(`/tests/${testId}/draft${search.size ? `?${search.toString()}` : ""}`, {
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
  },
  async listPayments(page: number = 1, limit: number = 20): Promise<{ items: AdminPaymentSummary[], total: number, page: number }> {
    const response = await requestJson<{ items: BackendPayment[], total: number, page: number }>(`/payments?page=${page}&limit=${limit}`);
    return {
      items: response.items.map(mapAdminPayment),
      total: response.total,
      page: response.page,
    };
  },
  async updatePaymentStatus(
    paymentId: string,
    input: { status: Exclude<PaymentStatus, "paused" | "refunded">; statusReason?: string | null }
  ): Promise<AdminPaymentSummary> {
    const response = await requestJson<BackendPayment>(`/payments/${paymentId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: input.status,
        status_reason: input.statusReason ?? null,
      })
    });
    return mapAdminPayment(response);
  },
  async listPaymentCards(): Promise<AdminPaymentCardSummary[]> {
    const response = await requestJson<BackendPaymentCard[]>("/payment-cards");
    return response.map(mapAdminPaymentCard);
  },
  async createPaymentCard(input: AdminPaymentCardInput): Promise<AdminPaymentCardSummary> {
    const response = await requestJson<BackendPaymentCard>("/payment-cards", {
      method: "POST",
      body: JSON.stringify({
        label: input.label,
        card_number: input.cardNumber,
        card_type: input.cardType,
        holder_name: input.holderName ?? null,
        is_active: input.isActive ?? false,
        priority: input.priority ?? 0,
        bot_source: input.botSource,
      })
    });
    return mapAdminPaymentCard(response);
  },
  async updatePaymentCard(
    cardId: string,
    input: Partial<AdminPaymentCardInput>
  ): Promise<AdminPaymentCardSummary> {
    const response = await requestJson<BackendPaymentCard>(`/payment-cards/${cardId}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.cardNumber !== undefined ? { card_number: input.cardNumber } : {}),
        ...(input.cardType !== undefined ? { card_type: input.cardType } : {}),
        ...(input.holderName !== undefined ? { holder_name: input.holderName } : {}),
        ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.botSource !== undefined ? { bot_source: input.botSource } : {}),
      })
    });
    return mapAdminPaymentCard(response);
  },
  async getPaymentSettings(): Promise<AdminPaymentSettingsSummary> {
    const response = await requestJson<BackendPaymentSettings>("/payment-settings");
    return mapAdminPaymentSettings(response);
  },
  async updatePaymentSettings(input: AdminPaymentSettingsInput): Promise<AdminPaymentSettingsSummary> {
    const response = await requestJson<BackendPaymentSettings>("/payment-settings", {
      method: "PATCH",
      body: JSON.stringify({
        ...(input.telegramApiId !== undefined ? { telegram_api_id: input.telegramApiId } : {}),
        ...(input.telegramApiHash !== undefined ? { telegram_api_hash: input.telegramApiHash } : {}),
        ...(input.phoneNumber !== undefined ? { phone_number: input.phoneNumber } : {}),
        ...(input.activeBot !== undefined ? { active_bot: input.activeBot } : {}),
        ...(input.supportContact !== undefined ? { support_contact: input.supportContact } : {}),
        ...(input.isEnabled !== undefined ? { is_enabled: input.isEnabled } : {}),
        ...(input.pollFallbackEnabled !== undefined ? { poll_fallback_enabled: input.pollFallbackEnabled } : {}),
      })
    });
    return mapAdminPaymentSettings(response);
  }
};
