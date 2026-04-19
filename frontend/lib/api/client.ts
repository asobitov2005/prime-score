import type {
  AuthRequestCodeBody,
  AuthVerifyCodeBody,
  LeaderboardQuery,
  RedeemBody,
  SaveAnswerBody,
  StartAttemptBody,
  SubscribeBody,
  TestListQuery
} from "@/lib/api/types";
import { getAttemptsByType, getLeaderboardByType, getPlans, getTestById, getTestsByAccess, getTestsByType } from "@/lib/mock-data";
import type { AccessType, AttemptRow, LeaderboardEntry, SubscriptionPlan, TestCatalogItem } from "@/lib/types";

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

export function createApiClient(config: ApiClientConfig = {}) {
  let baseUrl = config.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api";
  if (baseUrl.startsWith("/")) {
     baseUrl = `http://127.0.0.1:8000${baseUrl}`;
  }
  const fetchImpl = config.fetchImpl ?? fetch;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      }
    });

    if (!response.ok) {
      throw new ApiError(`Request failed for ${path}`, response.status);
    }

    return (await response.json()) as T;
  }

  return {
    requestCode: (body: AuthRequestCodeBody) => request<{ ok: true }>("/auth/request-code", { method: "POST", body: JSON.stringify(body) }),
    verifyCode: (body: AuthVerifyCodeBody) => request<{ accessToken: string; refreshToken: string }>("/auth/verify-code", { method: "POST", body: JSON.stringify(body) }),
    refresh: (refreshToken: string) => request<{ accessToken: string }>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }),
    logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
    listSessions: () => request<{ items: any[] }>("/auth/sessions", { method: "GET" }).catch(() => ({
      items: [
        { id: "1", device_info: { type: "Desktop", browser: "Chrome" }, ip_address: "127.0.0.1", last_used_at: new Date().toISOString(), is_active: true },
        { id: "2", device_info: { type: "Mobile", browser: "Safari" }, ip_address: "192.168.1.1", last_used_at: new Date(Date.now() - 86400000).toISOString(), is_active: true }
      ]
    })),
    revokeSession: (sessionId: string) => request<{ ok: true }>(`/auth/sessions/${sessionId}`, { method: "DELETE" }),
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
    submitAttempt: (attemptId: string) => request<{ ok: true }>(`/attempts/${attemptId}/submit`, { method: "POST" }),
    getAttemptResult: (attemptId: string) => request<unknown>(`/attempts/${attemptId}/result`),
    getAttemptReview: (attemptId: string) => request<unknown>(`/attempts/${attemptId}/review`),
    getDashboardStats: () => request<unknown>("/me/stats"),
    getActivity: () => request<unknown>("/me/activity"),
    getAttempts: () => request<{ data: AttemptRow[] }>("/me/attempts").catch(() => ({ data: getAttemptsByType() })),
    getFavorites: () => request<{ data: TestCatalogItem[] }>("/me/favorites").catch(() => ({ data: getTestsByType() })),
    getPlans: () => request<{ data: SubscriptionPlan[] }>("/plans").catch(() => ({ data: getPlans() })),
    subscribe: (body: SubscribeBody) => request<{ paymentUrl?: string }>("/subscribe", { method: "POST", body: JSON.stringify(body) }),
    redeem: (body: RedeemBody) => request<{ ok: true }>("/redeem", { method: "POST", body: JSON.stringify(body) }),
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
