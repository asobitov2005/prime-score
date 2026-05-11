import type { AdminIdentity } from "@/lib/types";

export const ADMIN_ACCESS_COOKIE = "primescore_admin_access_token";
export const ADMIN_REFRESH_COOKIE = "primescore_admin_refresh_token";
const ADMIN_REFRESH_PENDING_TOKEN = "__admin_refresh_pending__";
const DEFAULT_ADMIN_FETCH: typeof fetch = globalThis.fetch.bind(globalThis);
const ADMIN_REFRESH_ENDPOINT = "/api/admin/auth/refresh";

export type AdminAuthResponse = {
  admin: {
    id: string;
    username: string;
    email: string;
    phone_number?: string | null;
    telegram_id?: number | null;
    role: "super_admin" | "admin";
    is_active: boolean;
  };
  access_token: string;
  refresh_token: string;
  access_expires_in_seconds: number;
  refresh_expires_in_seconds: number;
};

export type AdminAuthChallengeResponse = {
  challenge_id: string;
  expires_in_seconds: number;
  delivery: "telegram" | string;
};

type AdminJwtPayload = {
  sub?: string;
  scope?: string;
  exp?: number;
};

function parseCookieValue(source: string, key: string): string | null {
  const match = source.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  if (typeof atob === "function") {
    return atob(padded);
  }
  return Buffer.from(padded, "base64").toString("utf8");
}

export function decodeAdminAccessTokenPayload(token: string | null | undefined): AdminJwtPayload | null {
  if (!token) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(parts[1])) as AdminJwtPayload;
  } catch {
    return null;
  }
}

export function getAdminAccessTokenExpiresAt(token: string | null | undefined): number | null {
  const payload = decodeAdminAccessTokenPayload(token);
  if (!payload || payload.scope !== "admin" || !payload.sub || typeof payload.exp !== "number") {
    return null;
  }
  return payload.exp * 1000;
}

export function isAdminAccessTokenExpired(token: string | null | undefined, nowMs = Date.now()): boolean {
  const expiresAt = getAdminAccessTokenExpiresAt(token);
  return expiresAt === null || expiresAt <= nowMs;
}

export function isAdminAuthFailureStatus(status: number): boolean {
  return status === 401 || status === 403;
}

export function getClientAdminAccessToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const accessToken = parseCookieValue(document.cookie, ADMIN_ACCESS_COOKIE);
  if (accessToken) {
    return accessToken;
  }
  return parseCookieValue(document.cookie, ADMIN_REFRESH_COOKIE) ? ADMIN_REFRESH_PENDING_TOKEN : null;
}

export function getClientAdminRefreshToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  return parseCookieValue(document.cookie, ADMIN_REFRESH_COOKIE);
}

export function setAdminSessionCookies(payload: AdminAuthResponse): void {
  document.cookie = `${ADMIN_ACCESS_COOKIE}=${encodeURIComponent(payload.access_token)}; Max-Age=${payload.access_expires_in_seconds}; Path=/; SameSite=Lax`;
  document.cookie = `${ADMIN_REFRESH_COOKIE}=${encodeURIComponent(payload.refresh_token)}; Max-Age=${payload.refresh_expires_in_seconds}; Path=/; SameSite=Lax`;
}

export function clearAdminSessionCookies(): void {
  document.cookie = `${ADMIN_ACCESS_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  document.cookie = `${ADMIN_REFRESH_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function endAdminSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  clearAdminSessionCookies();
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

function buildRequestHeaders(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  accessToken: string | null,
): Headers {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  } else {
    headers.delete("Authorization");
  }

  return headers;
}

function isRefreshRequest(input: RequestInfo | URL): boolean {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  return raw.includes("/auth/refresh");
}

export async function refreshClientAdminSession(fetchImpl: typeof fetch = DEFAULT_ADMIN_FETCH): Promise<boolean> {
  const refreshToken = getClientAdminRefreshToken();
  if (!refreshToken) {
    clearAdminSessionCookies();
    return false;
  }

  try {
    const response = await fetchImpl(ADMIN_REFRESH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      clearAdminSessionCookies();
      return false;
    }

    const payload = (await response.json()) as AdminAuthResponse;
    setAdminSessionCookies(payload);
    return true;
  } catch {
    return false;
  }
}

export async function fetchAdminApi(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: {
    fetchImpl?: typeof fetch;
    requiresAuth?: boolean;
  },
): Promise<Response> {
  const fetchImpl = options?.fetchImpl ?? DEFAULT_ADMIN_FETCH;
  const requiresAuth = options?.requiresAuth ?? true;
  const performRequest = (accessToken: string | null) => fetchImpl(input, {
    ...init,
    headers: buildRequestHeaders(input, init, accessToken),
  });

  let accessToken = requiresAuth ? getClientAdminAccessToken() : null;
  if (accessToken === ADMIN_REFRESH_PENDING_TOKEN) {
    accessToken = null;
  }
  if (requiresAuth && !accessToken) {
    const refreshed = await refreshClientAdminSession(fetchImpl);
    accessToken = refreshed ? getClientAdminAccessToken() : null;
  }

  let response = await performRequest(accessToken);
  if (
    requiresAuth
    && isAdminAuthFailureStatus(response.status)
    && !isRefreshRequest(input)
  ) {
    const refreshed = await refreshClientAdminSession(fetchImpl);
    if (!refreshed) {
      endAdminSession();
      return response;
    }

    accessToken = getClientAdminAccessToken();
    response = await performRequest(accessToken);
    if (isAdminAuthFailureStatus(response.status)) {
      endAdminSession();
    }
  }

  return response;
}

export function mapAdminIdentity(payload: AdminAuthResponse["admin"]): AdminIdentity {
  return {
    id: payload.id,
    username: payload.username,
    email: payload.email,
    role: payload.role,
    isActive: payload.is_active,
  };
}
