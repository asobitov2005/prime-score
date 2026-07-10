import type { ApiRequestContext } from "@/lib/api/core";
import { ApiError } from "@/lib/api/core";
import type {
  AuthLoginResponse,
  AuthRequestCodeBody,
  AuthSessionListResponse,
  AuthSessionStatusResponse,
  AuthTelegramWebAppBody,
  AuthVerifyCodeBody,
  MeProfileRead,
  MeProfileUpdateBody,
  XpSummaryResponse,
} from "@/lib/api/types";
import type { XpSummary } from "@/lib/types";
import { refreshClientUserAccessToken } from "@/lib/user-auth-client";
import { useAuthStore } from "@/store/auth-store";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
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

export function createAuthApi(context: ApiRequestContext) {
  const { request, requestForm, baseUrl, fetchImpl } = context;
  return {
    requestCode: (body: AuthRequestCodeBody) =>
      request<{ ok: true }>("/auth/request-code", {
        method: "POST",
        body: JSON.stringify({ telegram_id: body.telegramId }),
      }),
    verifyCode: (body: AuthVerifyCodeBody) =>
      request<AuthLoginResponse>("/auth/verify-code", {
        method: "POST",
        body: JSON.stringify({
          telegram_id: body.telegramId,
          code: body.code,
        }),
      }),
    telegramWebAppLogin: (body: AuthTelegramWebAppBody) =>
      request<AuthLoginResponse>("/auth/telegram-webapp", {
        method: "POST",
        body: JSON.stringify({
          init_data: body.initData,
          request_contact: Boolean(body.requestContact),
        }),
      }),
    refresh: async (refreshToken: string) => {
      const accessToken = await refreshClientUserAccessToken(
        baseUrl,
        fetchImpl,
        { clearOnFailure: true },
      );
      if (!accessToken) {
        throw new ApiError("Authentication is required.", 401);
      }
      return {
        access_token: accessToken,
        refresh_token: useAuthStore.getState().refreshToken ?? refreshToken,
      };
    },
    logout: (payload?: {
      sessionId?: string | null;
      refreshToken?: string | null;
    }) =>
      request<{ message: string }>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({
          session_id: payload?.sessionId ?? null,
          refresh_token: payload?.refreshToken ?? null,
        }),
      }),
    listSessions: () =>
      request<AuthSessionListResponse>("/auth/sessions", { method: "GET" }),
    getSessionStatus: (sessionId: string) =>
      request<AuthSessionStatusResponse>(
        `/auth/sessions/${sessionId}/status`,
        { method: "GET" },
      ),
    revokeSession: (sessionId: string) =>
      request<{ message: string }>(`/auth/sessions/${sessionId}`, {
        method: "DELETE",
      }),
    getMe: () => request<MeProfileRead>("/me", { method: "GET" }),
    updateMe: (body: MeProfileUpdateBody) =>
      request<MeProfileRead>("/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    uploadMyAvatar: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return requestForm<MeProfileRead>("/me/avatar", {
        method: "POST",
        body: formData,
      });
    },
    deleteMyAvatar: () =>
      request<MeProfileRead>("/me/avatar", { method: "DELETE" }),
    getXpSummary: () =>
      request<XpSummaryResponse>("/me/xp-summary", {
        method: "GET",
      }).then(mapXpSummary),
    listNotifications: () =>
      request<NotificationItem[]>("/me/notifications", { method: "GET" }),
    markAllNotificationsRead: () =>
      request<{ message: string }>("/me/notifications/read-all", {
        method: "PATCH",
      }),
  };
}
