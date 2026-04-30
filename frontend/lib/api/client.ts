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
import { getAttemptsByType, getLeaderboardByType, getTestById, getTestsByAccess, getTestsByType } from "@/lib/mock-data";
import { useAuthStore } from "@/store/auth-store";
import type { AccessType, AttemptRow, LeaderboardEntry, SubscriptionPlan, TestCatalogItem, TestType } from "@/lib/types";

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

export function createApiClient(config: ApiClientConfig = {}) {
  let baseUrl = config.baseUrl ?? getFrontendClientApiBaseUrl();
  if (baseUrl.startsWith("/") && typeof window === "undefined") {
    baseUrl = getFrontendServerApiBaseUrl();
  }
  const fetchImpl = config.fetchImpl ?? fetch;

  async function tryRefreshAccessToken(): Promise<string | null> {
    const { refreshToken, setTokens, clearSession } = useAuthStore.getState();
    if (!refreshToken) {
      return null;
    }

    const response = await fetchImpl(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
      clearSession();
      return null;
    }

    const payload = await response.json() as { access_token: string; refresh_token?: string | null };
    setTokens({
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? refreshToken,
    });
    return payload.access_token;
  }

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const performRequest = async (accessTokenOverride?: string | null) => {
      const authToken = accessTokenOverride ?? useAuthStore.getState().accessToken;
      return fetchImpl(`${baseUrl}${path}`, {
        ...init,
        signal: init?.signal ?? controller?.signal,
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(init?.headers ?? {})
        }
      });
    };

    const controller = init?.signal ? null : new AbortController();
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), FRONTEND_API_TIMEOUT_MS)
      : null;

    let response: Response;
    try {
      response = await performRequest();
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError("PrimeScore server is not responding.", 504);
      }
      throw error;
    }

    if (
      response.status === 401 &&
      !path.startsWith("/auth/refresh") &&
      !path.startsWith("/auth/request-code") &&
      !path.startsWith("/auth/verify-code")
    ) {
      try {
        const nextAccessToken = await tryRefreshAccessToken();
        if (nextAccessToken) {
          response = await performRequest(nextAccessToken);
        }
      } catch {}
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      if (
        response.status === 401 &&
        !path.startsWith("/auth/refresh") &&
        !path.startsWith("/auth/request-code") &&
        !path.startsWith("/auth/verify-code")
      ) {
        useAuthStore.getState().clearSession();
      }

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
        is_premium: boolean;
        premium_until?: string | null;
        telegram_id?: number | null;
      };
    }>("/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({
        telegram_id: body.telegramId,
        code: body.code,
      })
    }),
    refresh: (refreshToken: string) => request<{ access_token: string; refresh_token: string }>("/auth/refresh", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) }),
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
    updateMe: (body: MeProfileUpdateBody) => request<MeProfileRead>("/me", {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
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
    getActivity: () => request<unknown>("/me/activity"),
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
    getLeaderboard: (query: LeaderboardQuery = {}) => request<{ data: LeaderboardEntry[] }>("/leaderboard").catch(() => ({
      data: filterLeaderboard(query)
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

function filterLeaderboard(query: LeaderboardQuery): LeaderboardEntry[] {
  return getLeaderboardByType(query.type ?? "combined");
}
