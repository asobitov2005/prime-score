import { cookies } from "next/headers";

import { FRONTEND_API_TIMEOUT_MS, getFrontendServerApiBaseUrl } from "@/lib/api-base";
import {
  USER_ACCESS_TOKEN_COOKIE,
  USER_REFRESH_TOKEN_COOKIE,
} from "@/lib/user-session-cookies";

const baseUrl = getFrontendServerApiBaseUrl();

export class ServerUserApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function createTimeoutSignal() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FRONTEND_API_TIMEOUT_MS);
  return { controller, timeoutId };
}

async function refreshServerAccessToken(refreshToken: string): Promise<string | null> {
  const { controller, timeoutId } = createTimeoutSignal();

  try {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { access_token?: string | null };
    return payload.access_token ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getServerAccessToken(): Promise<string | null> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get(USER_ACCESS_TOKEN_COOKIE)?.value ?? null;
  if (accessToken) {
    return accessToken;
  }

  const refreshToken = cookieStore.get(USER_REFRESH_TOKEN_COOKIE)?.value ?? null;
  if (!refreshToken) {
    return null;
  }

  return refreshServerAccessToken(refreshToken);
}

function isUserAuthFailureStatus(status: number): boolean {
  return status === 401 || status === 403;
}

export async function requestServerUserApi<T>(path: string, init?: RequestInit): Promise<T> {
  const performRequest = async (accessToken: string | null) => {
    const { controller, timeoutId } = createTimeoutSignal();

    try {
      return await fetch(`${baseUrl}${path}`, {
        cache: "no-store",
        ...init,
        signal: init?.signal ?? controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...(init?.headers ?? {}),
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  let accessToken = await getServerAccessToken();
  if (!accessToken) {
    throw new ServerUserApiError("Authentication is required.", 401);
  }

  let response = await performRequest(accessToken);
  if (isUserAuthFailureStatus(response.status)) {
    const refreshToken = cookies().get(USER_REFRESH_TOKEN_COOKIE)?.value ?? null;
    const refreshedAccessToken = refreshToken ? await refreshServerAccessToken(refreshToken) : null;
    if (!refreshedAccessToken) {
      throw new ServerUserApiError("Authentication is required.", 401);
    }

    accessToken = refreshedAccessToken;
    response = await performRequest(accessToken);
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

    throw new ServerUserApiError(message, response.status);
  }

  return (await response.json()) as T;
}
