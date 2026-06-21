import type {
  AuthRequestCodeBody,
  AuthSessionListResponse,
  DashboardAnalyticsResponse,
  MeProfileRead,
  MeProfileUpdateBody,
  AuthSessionStatusResponse,
  AuthLoginResponse,
  AuthTelegramWebAppBody,
  RedeemResponse,
  GenerateGiftCodeBody,
  GenerateGiftCodeResponse,
  GiftCodeSummaryResponse,
  CreatePaymentBody,
  CreatePaymentResponse,
  CancelPaymentResponse,
  PaymentRecordResponse,
  AuthVerifyCodeBody,
  LeaderboardQuery,
  LeaderboardUserProfileResponse,
  XpSummaryResponse,
  RedeemBody,
  SaveAnswerBody,
  StartAttemptBody,
  SubscribeBody,
  TestListQuery
} from "@/lib/api/types";
import { FRONTEND_API_TIMEOUT_MS, getFrontendClientApiBaseUrl, getFrontendServerApiBaseUrl } from "@/lib/api-base";
import { getTestSourceDetail, getTestSourceLabel } from "@/lib/test-source";
import { useAuthStore } from "@/store/auth-store";
import type { AccessType, AttemptRow, DashboardActivityPoint, LeaderboardEntry, LeaderboardResponseData, SubscriptionPlan, TestCatalogItem, TestType, XpSummary } from "@/lib/types";
import {
  isUserAuthFailureStatus,
  performClientUserAuthedFetch,
  refreshClientUserAccessToken,
} from "@/lib/user-auth-client";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export interface ApiClientConfig {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

type BackendLeaderboardEntry = {
  rank: number;
  user_id: string;
  avatar_url?: string | null;
  display_name: string;
  level: number;
  xp: number;
  current_streak: number;
  badge?: string | null;
  average_score?: number | null;
  full_mock_completions: number;
  achieved_at?: string | null;
  is_current_user?: boolean;
};

type BackendLeaderboardResponse = {
  period: "week" | "month" | "all_time";
  items: BackendLeaderboardEntry[];
  current_user?: BackendLeaderboardEntry | null;
};

type BackendMeActivityPoint = {
  activity_date: string;
  attempts_count: number;
  time_spent_sec: number;
  reading_time_sec?: number | null;
  listening_time_sec?: number | null;
  writing_time_sec?: number | null;
};

type BackendTestCatalogItem = {
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

export type SpeakingEntryMode = "full" | "part_1" | "part_2" | "part_3";

export type SpeakingTestListItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  accessType: AccessType;
  modeKind: string;
  source: string | null;
  sourceDetail: string | null;
  description: string | null;
  estimatedMinutes: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type SpeakingSessionCreateResponse = {
  sessionId: string;
  speakingTestId: string;
  entryMode: SpeakingEntryMode;
  status: string;
};

export type SpeakingHistoryItem = {
  sessionId: string;
  speakingTestId: string;
  title: string;
  entryMode: SpeakingEntryMode;
  status: string;
  source: string | null;
  sourceDetail: string | null;
  overallBand: number | null;
  timeSpentSec: number | null;
  startedAt: string | null;
  endedAt: string | null;
  gradedAt: string | null;
};

export type SpeakingEvaluation = {
  overallBand: number | null;
  fluencyBand: number | null;
  lexicalBand: number | null;
  grammarBand: number | null;
  pronunciationBand: number | null;
  summaryFeedback: string;
  strengths: string[];
  criticalIssues: string[];
  pronunciationIssues: string[];
  grammarIssues: string[];
  lexicalIssues: string[];
  improvementActions: string[];
  deepFeedbackMarkdown: string;
  evaluatorModel: string | null;
  rubricVersion: string | null;
};

export type SpeakingAudioAsset = {
  id: string;
  speakerRole: string;
  storagePath: string;
  mimeType: string;
  durationMs: number | null;
  channelKind: string;
  metadata: Record<string, unknown>;
};

export type SpeakingDiarizedTranscriptItem = {
  role: string;
  text: string;
  at: string | null;
  offsetMs: number | null;
};

export type SpeakingStructuredFeedback = {
  criteriaFeedback: Record<string, unknown>;
  errorFeedback: Array<Record<string, unknown>>;
  strengths: string[];
  improvementActions: string[];
};

export type SpeakingSessionResult = {
  sessionId: string;
  speakingTestId: string;
  title: string;
  entryMode: SpeakingEntryMode;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  gradedAt: string | null;
  transcript: string;
  candidateTranscript: string;
  examinerTranscript: string;
  diarizedTranscript: SpeakingDiarizedTranscriptItem[];
  audioAssets: SpeakingAudioAsset[];
  structuredFeedback: SpeakingStructuredFeedback;
  evaluation: SpeakingEvaluation | null;
  turnCount: number | null;
  plannedQuestionCount: number | null;
  questionsAnswered: number | null;
};

export type SpeakingTopicItem = {
  id: string;
  partNumber: number;
  topicTitle: string;
  promptText: string;
  bulletPoints: string[];
  sampleQuestions: string[];
  difficultyLabel: string | null;
  categoryTags: string[];
  icon: string | null;
  iconTone: string | null;
  isNewTopic: boolean;
  followupGroupKey: string | null;
};

type BackendSpeakingTestListItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  access_type: AccessType;
  mode_kind: string;
  source?: string | null;
  source_detail?: string | null;
  description?: string | null;
  estimated_minutes: number;
  version: number;
  created_at: string;
  updated_at: string;
};

type BackendSpeakingSessionCreateResponse = {
  session_id: string;
  speaking_test_id: string;
  entry_mode: SpeakingEntryMode;
  status: string;
};

type BackendSpeakingHistoryItem = {
  session_id: string;
  speaking_test_id: string;
  title: string;
  entry_mode: SpeakingEntryMode;
  status: string;
  source?: string | null;
  source_detail?: string | null;
  overall_band?: number | null;
  time_spent_sec?: number | null;
  started_at?: string | null;
  ended_at?: string | null;
  graded_at?: string | null;
};

type BackendSpeakingEvaluation = {
  overall_band?: number | null;
  fluency_band?: number | null;
  lexical_band?: number | null;
  grammar_band?: number | null;
  pronunciation_band?: number | null;
  summary_feedback?: string;
  strengths?: string[];
  critical_issues?: string[];
  pronunciation_issues?: string[];
  grammar_issues?: string[];
  lexical_issues?: string[];
  improvement_actions?: string[];
  deep_feedback_markdown?: string;
  evaluator_model?: string | null;
  rubric_version?: string | null;
};

type BackendSpeakingSessionResult = {
  session_id: string;
  speaking_test_id: string;
  title: string;
  entry_mode: SpeakingEntryMode;
  status: string;
  started_at?: string | null;
  ended_at?: string | null;
  graded_at?: string | null;
  transcript?: string;
  candidate_transcript?: string;
  examiner_transcript?: string;
  diarized_transcript?: Array<{
    role?: string;
    text?: string;
    at?: string | null;
    offset_ms?: number | null;
  }>;
  audio_assets?: Array<{
    id: string;
    speaker_role: string;
    storage_path: string;
    mime_type: string;
    duration_ms?: number | null;
    channel_kind: string;
    metadata?: Record<string, unknown>;
  }>;
  structured_feedback?: {
    criteria_feedback?: Record<string, unknown>;
    error_feedback?: Array<Record<string, unknown>>;
    strengths?: string[];
    improvement_actions?: string[];
  };
  evaluation?: BackendSpeakingEvaluation | null;
  turn_count?: number | null;
  planned_question_count?: number | null;
  questions_answered?: number | null;
};

type BackendSpeakingTopicItem = {
  id: string;
  part_number: number;
  topic_title: string;
  prompt_text: string;
  bullet_points?: string[];
  sample_questions?: string[];
  difficulty_label?: string | null;
  category_tags?: string[];
  icon?: string | null;
  icon_tone?: string | null;
  is_new_topic?: boolean;
  followup_group_key?: string | null;
};

function mapBackendLeaderboardEntry(entry: BackendLeaderboardEntry): LeaderboardEntry {
  return {
    rank: entry.rank,
    userId: entry.user_id,
    avatarUrl: entry.avatar_url ?? null,
    name: entry.display_name,
    level: entry.level,
    xp: entry.xp,
    currentStreak: entry.current_streak,
    badge: entry.badge ?? null,
    averageScore: entry.average_score ?? null,
    fullMockCompletions: entry.full_mock_completions,
    achievedAt: entry.achieved_at ?? null,
    qualified: true,
    isCurrentUser: entry.is_current_user ?? false,
  };
}

function mapCurrentUserLeaderboardEntry(
  entry: BackendLeaderboardEntry,
  visibleCount: number,
): LeaderboardEntry {
  return mapBackendLeaderboardEntry({
    ...entry,
    rank: entry.rank > 0 ? entry.rank : visibleCount + 1,
  });
}

function mapXpSummary(payload: XpSummaryResponse): XpSummary {
  return {
    totalXp: payload.total_xp,
    level: payload.level,
    currentStreak: payload.current_streak,
    bestStreak: payload.best_streak,
    weeklyXp: payload.weekly_xp,
    monthlyXp: payload.monthly_xp,
    latestXpGain: payload.latest_xp_gain ?? null,
    progress: {
      level: payload.progress.level,
      levelFloorXp: payload.progress.level_floor_xp,
      nextLevelXp: payload.progress.next_level_xp,
      xpIntoLevel: payload.progress.xp_into_level,
      xpNeededForNextLevel: payload.progress.xp_needed_for_next_level,
      progressPercent: payload.progress.progress_percent,
    },
  };
}

function buildPlaceholderSections(count: number): TestCatalogItem["sections"] {
  return Array.from({ length: count }, (_, index) => ({
    id: `section-${index + 1}`,
    number: index + 1,
    title: `Section ${index + 1}`,
    questionCount: Math.floor(40 / Math.max(1, count)),
    teaser: "Section detail is loaded from the test endpoint.",
  }));
}

function mapBackendTestCatalogItem(item: BackendTestCatalogItem): TestCatalogItem {
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
    tags: [item.test_type, item.access_type, getTestSourceLabel(item.source)],
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

function mapSpeakingTest(item: BackendSpeakingTestListItem): SpeakingTestListItem {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    status: item.status,
    accessType: item.access_type,
    modeKind: item.mode_kind,
    source: item.source ?? null,
    sourceDetail: item.source_detail ?? null,
    description: item.description ?? null,
    estimatedMinutes: item.estimated_minutes,
    version: item.version,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function mapSpeakingSession(item: BackendSpeakingSessionCreateResponse): SpeakingSessionCreateResponse {
  return {
    sessionId: item.session_id,
    speakingTestId: item.speaking_test_id,
    entryMode: item.entry_mode,
    status: item.status,
  };
}

function mapSpeakingHistoryItem(item: BackendSpeakingHistoryItem): SpeakingHistoryItem {
  return {
    sessionId: item.session_id,
    speakingTestId: item.speaking_test_id,
    title: item.title,
    entryMode: item.entry_mode,
    status: item.status,
    source: item.source ?? null,
    sourceDetail: item.source_detail ?? null,
    overallBand: item.overall_band ?? null,
    timeSpentSec: item.time_spent_sec ?? null,
    startedAt: item.started_at ?? null,
    endedAt: item.ended_at ?? null,
    gradedAt: item.graded_at ?? null,
  };
}

function mapSpeakingEvaluation(item: BackendSpeakingEvaluation | null | undefined): SpeakingEvaluation | null {
  if (!item) {
    return null;
  }
  return {
    overallBand: item.overall_band ?? null,
    fluencyBand: item.fluency_band ?? null,
    lexicalBand: item.lexical_band ?? null,
    grammarBand: item.grammar_band ?? null,
    pronunciationBand: item.pronunciation_band ?? null,
    summaryFeedback: item.summary_feedback ?? "",
    strengths: item.strengths ?? [],
    criticalIssues: item.critical_issues ?? [],
    pronunciationIssues: item.pronunciation_issues ?? [],
    grammarIssues: item.grammar_issues ?? [],
    lexicalIssues: item.lexical_issues ?? [],
    improvementActions: item.improvement_actions ?? [],
    deepFeedbackMarkdown: item.deep_feedback_markdown ?? "",
    evaluatorModel: item.evaluator_model ?? null,
    rubricVersion: item.rubric_version ?? null,
  };
}

function mapSpeakingSessionResult(item: BackendSpeakingSessionResult): SpeakingSessionResult {
  const structuredFeedback = item.structured_feedback ?? {};
  return {
    sessionId: item.session_id,
    speakingTestId: item.speaking_test_id,
    title: item.title,
    entryMode: item.entry_mode,
    status: item.status,
    startedAt: item.started_at ?? null,
    endedAt: item.ended_at ?? null,
    gradedAt: item.graded_at ?? null,
    transcript: item.transcript ?? "",
    candidateTranscript: item.candidate_transcript ?? "",
    examinerTranscript: item.examiner_transcript ?? "",
    diarizedTranscript: (item.diarized_transcript ?? [])
      .filter((entry) => entry.role && entry.text)
      .map((entry) => ({
        role: entry.role ?? "",
        text: entry.text ?? "",
        at: entry.at ?? null,
        offsetMs: entry.offset_ms ?? null,
      })),
    audioAssets: (item.audio_assets ?? []).map((asset) => ({
      id: asset.id,
      speakerRole: asset.speaker_role,
      storagePath: asset.storage_path,
      mimeType: asset.mime_type,
      durationMs: asset.duration_ms ?? null,
      channelKind: asset.channel_kind,
      metadata: asset.metadata ?? {},
    })),
    structuredFeedback: {
      criteriaFeedback: structuredFeedback.criteria_feedback ?? {},
      errorFeedback: structuredFeedback.error_feedback ?? [],
      strengths: structuredFeedback.strengths ?? [],
      improvementActions: structuredFeedback.improvement_actions ?? [],
    },
    evaluation: mapSpeakingEvaluation(item.evaluation),
    turnCount: typeof item.turn_count === "number" ? item.turn_count : null,
    plannedQuestionCount: typeof item.planned_question_count === "number" ? item.planned_question_count : null,
    questionsAnswered: typeof item.questions_answered === "number" ? item.questions_answered : null,
  };
}

function mapSpeakingTopic(item: BackendSpeakingTopicItem): SpeakingTopicItem {
  return {
    id: item.id,
    partNumber: item.part_number,
    topicTitle: item.topic_title,
    promptText: item.prompt_text,
    bulletPoints: item.bullet_points ?? [],
    sampleQuestions: item.sample_questions ?? [],
    difficultyLabel: item.difficulty_label ?? null,
    categoryTags: item.category_tags ?? [],
    icon: item.icon ?? null,
    iconTone: item.icon_tone ?? null,
    isNewTopic: item.is_new_topic === true,
    followupGroupKey: item.followup_group_key ?? null,
  };
}

export function createApiClient(config: ApiClientConfig = {}) {
  let baseUrl = config.baseUrl ?? getFrontendClientApiBaseUrl();
  if (baseUrl.startsWith("/") && typeof window === "undefined") {
    baseUrl = getFrontendServerApiBaseUrl();
  }
  const fetchImpl = config.fetchImpl ?? fetch;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = init?.signal ? null : new AbortController();
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), FRONTEND_API_TIMEOUT_MS)
      : null;

    let response: Response;
    try {
      response = await performClientUserAuthedFetch(path, {
        ...init,
        signal: init?.signal ?? controller?.signal,
      }, {
        baseUrl,
        fetchImpl,
        includeJsonContentType: true,
      });
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError("PrimeScore server is not responding.", 504);
      }
      throw error;
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let message = `Request failed for ${path}`;

      try {
        const payload = (await response.json()) as { detail?: string; message?: string };
        message = payload.detail ?? payload.message ?? message;
      } catch {
        try {
          const text = await response.text();
          if (text.trim()) {
            message = text.trim();
          }
        } catch {}
      }

      throw new ApiError(message, response.status);
    }

    return (await response.json()) as T;
  }

  async function requestForm<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = init?.signal ? null : new AbortController();
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), FRONTEND_API_TIMEOUT_MS)
      : null;

    let response: Response;
    try {
      response = await performClientUserAuthedFetch(path, {
        ...init,
        signal: init?.signal ?? controller?.signal,
      }, {
        baseUrl,
        fetchImpl,
        includeJsonContentType: false,
      });
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError("PrimeScore server is not responding.", 504);
      }
      throw error;
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let message = `Request failed for ${path}`;
      try {
        const payload = (await response.json()) as { detail?: string; message?: string };
        message = payload.detail ?? payload.message ?? message;
      } catch {
        try {
          const text = await response.text();
          if (text.trim()) {
            message = text.trim();
          }
        } catch {}
      }

      throw new ApiError(message, response.status);
    }

    return (await response.json()) as T;
  }

  return {
    requestCode: (body: AuthRequestCodeBody) => request<{ ok: true }>("/auth/request-code", {
      method: "POST",
      body: JSON.stringify({ telegram_id: body.telegramId })
    }),
    verifyCode: (body: AuthVerifyCodeBody) => request<AuthLoginResponse>("/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({
        telegram_id: body.telegramId,
        code: body.code,
      })
    }),
    telegramWebAppLogin: (body: AuthTelegramWebAppBody) => request<AuthLoginResponse>("/auth/telegram-webapp", {
      method: "POST",
      body: JSON.stringify({
        init_data: body.initData,
        request_contact: Boolean(body.requestContact),
      })
    }),
    refresh: async (refreshToken: string) => {
      const accessToken = await refreshClientUserAccessToken(baseUrl, fetchImpl, { clearOnFailure: true });
      if (!accessToken) {
        throw new ApiError("Authentication is required.", 401);
      }
      return {
        access_token: accessToken,
        refresh_token: useAuthStore.getState().refreshToken ?? refreshToken,
      };
    },
    logout: (payload?: { sessionId?: string | null; refreshToken?: string | null }) =>
      request<{ message: string }>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({
          session_id: payload?.sessionId ?? null,
          refresh_token: payload?.refreshToken ?? null,
        })
      }),
    listSessions: () => request<AuthSessionListResponse>("/auth/sessions", { method: "GET" }),
    getSessionStatus: (sessionId: string) => request<AuthSessionStatusResponse>(`/auth/sessions/${sessionId}/status`, { method: "GET" }),
    revokeSession: (sessionId: string) => request<{ message: string }>(`/auth/sessions/${sessionId}`, { method: "DELETE" }),
    getMe: () => request<MeProfileRead>("/me", { method: "GET" }),
    updateMe: (body: MeProfileUpdateBody) => request<MeProfileRead>("/me", {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
    uploadMyAvatar: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return requestForm<MeProfileRead>("/me/avatar", {
        method: "POST",
        body: formData
      });
    },
    deleteMyAvatar: () => request<MeProfileRead>("/me/avatar", { method: "DELETE" }),
    getXpSummary: () => request<XpSummaryResponse>("/me/xp-summary", { method: "GET" }).then(mapXpSummary),
    listNotifications: () => request<NotificationItem[]>("/me/notifications", { method: "GET" }),
    markAllNotificationsRead: () => request<{ message: string }>("/me/notifications/read-all", { method: "PATCH" }),
    listTests: (query: TestListQuery = {}) => {
      const search = new URLSearchParams();
      if (query.type) {
        search.set("type", query.type);
      }
      if (query.access) {
        search.set("access_type", query.access);
      }
      search.set("status", "published");
      return request<BackendTestCatalogItem[]>(`/tests?${search.toString()}`, { method: "GET" })
        .then((data) => ({ data: data.map(mapBackendTestCatalogItem) }));
    },
    getTest: (testId: string) => request<BackendTestCatalogItem>(`/tests/${testId}`).then(mapBackendTestCatalogItem),
    startAttempt: (testId: string, body: StartAttemptBody) => request<{ attemptId: string; testSnapshot: unknown }>(`/tests/${testId}/start`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
    saveAnswer: (attemptId: string, body: SaveAnswerBody) => request<{ ok: true }>(`/attempts/${attemptId}/answer`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
    submitAttempt: (attemptId: string) => request<{ ok: true }>(`/attempts/${attemptId}/submit`, { method: "POST", body: JSON.stringify({ confirm: true, reason: "user_confirmed" }) }),
    getAttemptResult: (attemptId: string) => request<unknown>(`/attempts/${attemptId}/result`),
    getAttemptReview: (attemptId: string) => request<unknown>(`/attempts/${attemptId}/review`),
    listSpeakingTests: () =>
      request<{ items: BackendSpeakingTestListItem[]; total: number }>("/speaking/tests", { method: "GET" })
        .then((payload) => ({ items: payload.items.map(mapSpeakingTest), total: payload.total })),
    createSpeakingSession: (speakingTestId: string, entryMode: SpeakingEntryMode) =>
      request<BackendSpeakingSessionCreateResponse>("/speaking/sessions", {
        method: "POST",
        body: JSON.stringify({ speaking_test_id: speakingTestId, entry_mode: entryMode }),
      }).then(mapSpeakingSession),
    listSpeakingHistory: () =>
      request<{ items: BackendSpeakingHistoryItem[] }>("/speaking/sessions/history", { method: "GET" })
        .then((payload) => ({ items: payload.items.map(mapSpeakingHistoryItem) })),
    getSpeakingSessionResult: (sessionId: string) =>
      request<BackendSpeakingSessionResult>(`/speaking/sessions/${sessionId}/result`, { method: "GET" })
        .then(mapSpeakingSessionResult),
    deleteSpeakingSession: (sessionId: string) =>
      request<{ ok: true }>(`/speaking/sessions/${sessionId}`, { method: "DELETE" }),
    listSpeakingTopics: (partNumber?: number) => {
      const search = new URLSearchParams();
      if (partNumber) {
        search.set("part_number", String(partNumber));
      }
      const suffix = search.toString() ? `?${search.toString()}` : "";
      return request<{ items: BackendSpeakingTopicItem[]; total: number }>(`/speaking/topics${suffix}`, { method: "GET" })
        .then((payload) => ({ items: payload.items.map(mapSpeakingTopic), total: payload.total }));
    },
    getDashboardStats: () => request<unknown>("/me/stats"),
    getDashboardAnalytics: (headers?: HeadersInit, testType?: TestType) => {
      const search = new URLSearchParams();
      if (testType) {
        search.set("test_type", testType);
      }
      const suffix = search.toString() ? `?${search.toString()}` : "";
      return request<DashboardAnalyticsResponse>(`/me/analytics${suffix}`, { method: "GET", headers });
    },
    getActivity: () =>
      request<BackendMeActivityPoint[]>("/me/activity").then<DashboardActivityPoint[]>((items) =>
        items.map((item) => ({
          activityDate: item.activity_date,
          attemptsCount: item.attempts_count,
          timeSpentSec: item.time_spent_sec,
          readingTimeSec: item.reading_time_sec ?? 0,
          listeningTimeSec: item.listening_time_sec ?? 0,
          writingTimeSec: item.writing_time_sec ?? 0,
        }))
      ),
    getAttempts: () => request<AttemptRow[]>("/me/attempts").then((data) => ({ data })),
    getFavorites: () => request<TestCatalogItem[]>("/me/favorites").then((data) => ({ data })),
    getPlans: () => request<SubscriptionPlan[]>("/plans").then((data) => ({ data })),
    subscribe: (body: SubscribeBody) => request<{ paymentUrl?: string }>("/subscribe", { method: "POST", body: JSON.stringify(body) }),
    redeem: (body: RedeemBody, headers?: HeadersInit) => request<RedeemResponse>("/me/redeem-code", {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    }),
    listGiftCodes: () => request<GiftCodeSummaryResponse>("/me/gift-codes", { method: "GET" }),
    generateGiftCode: (body: GenerateGiftCodeBody) => request<GenerateGiftCodeResponse>("/me/gift-codes/generate", {
      method: "POST",
      body: JSON.stringify(body)
    }),
    listPayments: () => request<PaymentRecordResponse[]>("/me/payments", { method: "GET" }),
    createPayment: (body: CreatePaymentBody) => request<CreatePaymentResponse>("/me/payments", {
      method: "POST",
      body: JSON.stringify(body)
    }),
    cancelPayment: (paymentId: string) => request<CancelPaymentResponse>(`/me/payments/${paymentId}/cancel`, {
      method: "POST",
      body: JSON.stringify({})
    }),
    getLeaderboard: (query: LeaderboardQuery = {}) =>
      request<BackendLeaderboardResponse>(
        `/leaderboard?period=${encodeURIComponent(query.period ?? "all_time")}`
      )
        .then<LeaderboardResponseData>((payload) => ({
          period: payload.period,
          items: payload.items.map(mapBackendLeaderboardEntry),
          currentUser: payload.current_user
            ? mapCurrentUserLeaderboardEntry(payload.current_user, payload.items.length)
            : null,
        })),
    getLeaderboardUserProfile: (userId: string) =>
      request<LeaderboardUserProfileResponse>(`/leaderboard/users/${encodeURIComponent(userId)}`, { method: "GET" }),
    getTestCatalog: (type?: string, access?: AccessType) => {
      const search = new URLSearchParams();
      if (type === "reading" || type === "listening" || type === "writing") {
        search.set("type", type);
      }
      if (access) {
        search.set("access_type", access);
      }
      search.set("status", "published");
      return request<BackendTestCatalogItem[]>(`/tests?${search.toString()}`, { method: "GET" })
        .then((items) => items.map(mapBackendTestCatalogItem));
    }
  };
}
