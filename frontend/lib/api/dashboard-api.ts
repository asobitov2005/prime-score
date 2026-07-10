import type { ApiRequest } from "@/lib/api/core";
import type {
  CancelPaymentResponse,
  CreatePaymentBody,
  CreatePaymentResponse,
  DashboardAnalyticsResponse,
  GenerateGiftCodeBody,
  GenerateGiftCodeResponse,
  GiftCodeSummaryResponse,
  PaymentRecordResponse,
  RedeemBody,
  RedeemResponse,
  SubscribeBody,
} from "@/lib/api/types";
import type {
  AttemptRow,
  DashboardActivityPoint,
  SubscriptionPlan,
  TestCatalogItem,
  TestType,
} from "@/lib/types";

interface BackendMeActivityPoint {
  activity_date: string;
  attempts_count: number;
  time_spent_sec: number;
  reading_time_sec?: number | null;
  listening_time_sec?: number | null;
  writing_time_sec?: number | null;
}

export function createDashboardApi(request: ApiRequest) {
  return {
    getDashboardStats: () => request<unknown>("/me/stats"),
    getDashboardAnalytics: (
      headers?: HeadersInit,
      testType?: TestType,
    ) => {
      const search = new URLSearchParams();
      if (testType) {
        search.set("test_type", testType);
      }
      const suffix = search.toString() ? `?${search.toString()}` : "";
      return request<DashboardAnalyticsResponse>(`/me/analytics${suffix}`, {
        method: "GET",
        headers,
      });
    },
    getActivity: () =>
      request<BackendMeActivityPoint[]>("/me/activity").then<
        DashboardActivityPoint[]
      >((items) =>
        items.map((item) => ({
          activityDate: item.activity_date,
          attemptsCount: item.attempts_count,
          timeSpentSec: item.time_spent_sec,
          readingTimeSec: item.reading_time_sec ?? 0,
          listeningTimeSec: item.listening_time_sec ?? 0,
          writingTimeSec: item.writing_time_sec ?? 0,
        })),
      ),
    getAttempts: () =>
      request<AttemptRow[]>("/me/attempts").then((data) => ({ data })),
    getFavorites: () =>
      request<TestCatalogItem[]>("/me/favorites").then((data) => ({ data })),
    getPlans: () =>
      request<SubscriptionPlan[]>("/plans").then((data) => ({ data })),
    subscribe: (body: SubscribeBody) =>
      request<{ paymentUrl?: string }>("/subscribe", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    redeem: (body: RedeemBody, headers?: HeadersInit) =>
      request<RedeemResponse>("/me/redeem-code", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }),
    listGiftCodes: () =>
      request<GiftCodeSummaryResponse>("/me/gift-codes", { method: "GET" }),
    generateGiftCode: (body: GenerateGiftCodeBody) =>
      request<GenerateGiftCodeResponse>("/me/gift-codes/generate", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    listPayments: () =>
      request<PaymentRecordResponse[]>("/me/payments", { method: "GET" }),
    createPayment: (body: CreatePaymentBody) =>
      request<CreatePaymentResponse>("/me/payments", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    cancelPayment: (paymentId: string) =>
      request<CancelPaymentResponse>(`/me/payments/${paymentId}/cancel`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
  };
}
