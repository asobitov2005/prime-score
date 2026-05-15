import type {
  AuthRequestCodeBody,
  AuthSessionListResponse,
  DashboardAnalyticsResponse,
  MeProfileRead,
  MeProfileUpdateBody,
  AuthSessionStatusResponse,
  RedeemResponse,
  CreatePaymentBody,
  CreatePaymentResponse,
  CancelPaymentResponse,
  PaymentRecordResponse,
  AuthVerifyCodeBody,
  LeaderboardQuery,
  RedeemBody,
  SaveAnswerBody,
  StartAttemptBody,
  SubscribeBody,
  TestListQuery
} from "@/lib/api/types";
import { FRONTEND_API_TIMEOUT_MS, getFrontendClientApiBaseUrl, getFrontendServerApiBaseUrl } from "@/lib/api-base";
import { getAttemptsByType, getTestById, getTestsByAccess, getTestsByType } from "@/lib/mock-data";
import { useAuthStore } from "@/store/auth-store";
import type { AccessType, AttemptRow, DashboardActivityPoint, LeaderboardEntry, LeaderboardResponseData, SubscriptionPlan, TestCatalogItem, TestType } from "@/lib/types";
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
  display_name: string;
  test_type: TestType | "combined";
  percentile: number;
  estimated_band_score?: number | null;
  reading_score?: number | null;
  listening_score?: number | null;
  total_tests_attempted: number;
  avg_accuracy?: number | null;
  total_time_sec: number;
  last_active_at?: string | null;
  is_current_user?: boolean;
};

type BackendLeaderboardResponse = {
  test_type: TestType | "combined";
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

function formatLeaderboardDuration(totalSeconds: number | null | undefined): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds ?? 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function mapBackendLeaderboardEntry(entry: BackendLeaderboardEntry): LeaderboardEntry {
  return {
    rank: entry.rank,
    userId: entry.user_id,
    name: entry.display_name,
    type: entry.test_type,
    percentile: entry.percentile,
    estimatedBand: entry.estimated_band_score !== null && entry.estimated_band_score !== undefined
      ? entry.estimated_band_score.toFixed(1)
      : null,
    readingScore: entry.reading_score !== null && entry.reading_score !== undefined ? `${entry.reading_score.toFixed(1)}/40` : null,
    listeningScore: entry.listening_score !== null && entry.listening_score !== undefined ? `${entry.listening_score.toFixed(1)}/40` : null,
    attempts: entry.total_tests_attempted,
    totalTime: formatLeaderboardDuration(entry.total_time_sec),
    avgAccuracy: entry.avg_accuracy ?? null,
    lastActiveAt: entry.last_active_at ?? null,
    qualified: true,
    isCurrentUser: entry.is_current_user ?? false,
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
    verifyCode: (body: AuthVerifyCodeBody) => request<{
      session_id: string;
      access_token: string;
      refresh_token: string;
      access_expires_in_seconds: number;
      refresh_expires_in_seconds: number;
      user: {
        id: string;
        first_name: string;
        last_name?: string | null;
        username?: string | null;
        phone?: string | null;
        avatar_url?: string | null;
        is_premium: boolean;
        premium_until?: string | null;
        telegram_id?: number | null;
        created_at?: string | null;
      };
      is_new_user?: boolean;
      welcome_bonus_days?: number;
    }>("/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({
        telegram_id: body.telegramId,
        code: body.code,
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
    listNotifications: () => request<NotificationItem[]>("/me/notifications", { method: "GET" }),
    markAllNotificationsRead: () => request<{ message: string }>("/me/notifications/read-all", { method: "PATCH" }),
    listTests: (query: TestListQuery = {}) => request<{ data: TestCatalogItem[] }>("/tests", { method: "GET" }).catch(() => ({
      data: filterTests(query)
    })),
    getTest: (testId: string) => request<TestCatalogItem>(`/tests/${testId}`).catch(() => {
      const test = getTestById(testId);

      if (!test) {
        throw new ApiError(`Test not found: ${testId}`, 404);
      }

      return test;
    }),
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
    getAttempts: () => request<{ data: AttemptRow[] }>("/me/attempts").catch(() => ({ data: getAttemptsByType() })),
    getFavorites: () => request<{ data: TestCatalogItem[] }>("/me/favorites").catch(() => ({ data: getTestsByType() })),
    getPlans: () => request<{ data: SubscriptionPlan[] }>("/plans").catch(() => ({ data: [] })),
    subscribe: (body: SubscribeBody) => request<{ paymentUrl?: string }>("/subscribe", { method: "POST", body: JSON.stringify(body) }),
    redeem: (body: RedeemBody, headers?: HeadersInit) => request<RedeemResponse>("/me/redeem-code", {
      method: "POST",
      headers,
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
        `/leaderboard?type=${encodeURIComponent(query.type ?? "combined")}&period=${encodeURIComponent(query.period ?? "all_time")}`
      )
        .then<LeaderboardResponseData>((payload) => ({
          type: payload.test_type,
          period: payload.period,
          items: payload.items.map(mapBackendLeaderboardEntry),
          currentUser: payload.current_user ? mapBackendLeaderboardEntry(payload.current_user) : null,
        })),
    getTestCatalog: (type?: string, access?: AccessType) => {
      const tests = type ? getTestsByType(type) : getTestsByType();
      return access ? tests.filter((test) => test.accessType === access) : tests;
    }
  };
}

function filterTests(query: TestListQuery): TestCatalogItem[] {
  const byType = query.type ? getTestsByType(query.type) : getTestsByType();
  return query.access ? byType.filter((test) => test.accessType === query.access) : byType;
}
