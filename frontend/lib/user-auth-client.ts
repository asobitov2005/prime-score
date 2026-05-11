"use client";

import { getFrontendClientApiBaseUrl } from "@/lib/api-base";
import { useAuthStore } from "@/store/auth-store";

export const USER_SESSION_EXPIRED_MESSAGE = "Your session expired. Please sign in again.";

export function isUserAuthFailureStatus(status: number): boolean {
  return status === 401 || status === 403;
}

export function isUserAuthExcludedPath(path: string): boolean {
  return path.startsWith("/auth/refresh")
    || path.startsWith("/auth/request-code")
    || path.startsWith("/auth/verify-code");
}

export async function refreshClientUserAccessToken(
  baseUrl = getFrontendClientApiBaseUrl(),
  fetchImpl: typeof fetch = fetch,
  options?: { clearOnFailure?: boolean },
): Promise<string | null> {
  const { refreshToken, setTokens, clearSession } = useAuthStore.getState();
  if (!refreshToken) {
    return null;
  }

  const response = await fetchImpl(`${baseUrl}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    if (options?.clearOnFailure ?? true) {
      clearSession();
    }
    return null;
  }

  const payload = (await response.json()) as {
    access_token?: string | null;
    refresh_token?: string | null;
  };
  const accessToken = payload.access_token ?? null;
  if (accessToken) {
    setTokens({
      accessToken,
      refreshToken: payload.refresh_token ?? refreshToken,
    });
  }
  return accessToken;
}

export async function performClientUserAuthedFetch(
  path: string,
  init: RequestInit | undefined,
  options?: {
    baseUrl?: string;
    fetchImpl?: typeof fetch;
    includeJsonContentType?: boolean;
  },
): Promise<Response> {
  const baseUrl = options?.baseUrl ?? getFrontendClientApiBaseUrl();
  const fetchImpl = options?.fetchImpl ?? fetch;
  const includeJsonContentType = options?.includeJsonContentType ?? true;
  const performRequest = async (accessToken: string | null) =>
    fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...(includeJsonContentType ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init?.headers ?? {}),
      },
    });

  let accessToken = useAuthStore.getState().accessToken;
  let response = await performRequest(accessToken);
  if (isUserAuthFailureStatus(response.status) && !isUserAuthExcludedPath(path)) {
    try {
      const refreshedAccessToken = await refreshClientUserAccessToken(baseUrl, fetchImpl);
      if (refreshedAccessToken) {
        accessToken = refreshedAccessToken;
        response = await performRequest(accessToken);
      }
    } catch {}
  }

  if (isUserAuthFailureStatus(response.status) && !isUserAuthExcludedPath(path)) {
    useAuthStore.getState().clearSession();
  }

  return response;
}
