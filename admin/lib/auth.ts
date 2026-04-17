import type { AdminIdentity } from "@/lib/types";

export const ADMIN_ACCESS_COOKIE = "primescore_admin_access_token";
export const ADMIN_REFRESH_COOKIE = "primescore_admin_refresh_token";

export type AdminAuthResponse = {
  admin: {
    id: string;
    username: string;
    email: string;
    role: "super_admin" | "admin";
    is_active: boolean;
  };
  access_token: string;
  refresh_token: string;
  access_expires_in_seconds: number;
  refresh_expires_in_seconds: number;
};

function parseCookieValue(source: string, key: string): string | null {
  const match = source.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getClientAdminAccessToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  return parseCookieValue(document.cookie, ADMIN_ACCESS_COOKIE);
}

export function setAdminSessionCookies(payload: AdminAuthResponse): void {
  document.cookie = `${ADMIN_ACCESS_COOKIE}=${encodeURIComponent(payload.access_token)}; Max-Age=${payload.access_expires_in_seconds}; Path=/; SameSite=Lax`;
  document.cookie = `${ADMIN_REFRESH_COOKIE}=${encodeURIComponent(payload.refresh_token)}; Max-Age=${payload.refresh_expires_in_seconds}; Path=/; SameSite=Lax`;
}

export function clearAdminSessionCookies(): void {
  document.cookie = `${ADMIN_ACCESS_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  document.cookie = `${ADMIN_REFRESH_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
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
