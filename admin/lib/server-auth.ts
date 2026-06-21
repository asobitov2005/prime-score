import { cookies } from "next/headers";
import type { AdminIdentity } from "@/lib/types";
import { getAdminServerApiBaseUrl } from "@/lib/admin-api-base";
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from "@/lib/auth";

type AdminJwtPayload = {
  sub?: string;
  scope?: string;
  role?: "super_admin" | "admin";
  exp?: number;
  username?: string;
  email?: string;
  phone_number?: string;
  telegram_id?: number;
};

type AdminMeResponse = {
  id: string;
  username: string;
  email: string;
  role: "super_admin" | "admin";
  is_active: boolean;
};

function decodeJwtPayload(token: string): AdminJwtPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload) as AdminJwtPayload;
  } catch {
    return null;
  }
}

export async function refreshServerAdminAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch(`${getAdminServerApiBaseUrl()}/auth/refresh`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { access_token?: string | null };
    return payload.access_token ?? null;
  } catch {
    return null;
  }
}

export async function getServerAdminAccessToken(): Promise<string | null> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value ?? null;
  const payload = accessToken ? decodeJwtPayload(accessToken) : null;
  if (
    accessToken
    && payload
    && payload.scope === "admin"
    && payload.sub
    && (typeof payload.exp !== "number" || payload.exp * 1000 > Date.now())
  ) {
    return accessToken;
  }

  const refreshToken = cookieStore.get(ADMIN_REFRESH_COOKIE)?.value ?? null;
  if (!refreshToken) {
    return null;
  }

  return refreshServerAdminAccessToken(refreshToken);
}

export async function getAuthenticatedAdmin(): Promise<AdminIdentity | null> {
  const token = await getServerAdminAccessToken();
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${getAdminServerApiBaseUrl()}/auth/me`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as AdminMeResponse;
    return {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      role: payload.role === "super_admin" ? "super_admin" : "admin",
      isActive: payload.is_active,
    };
  } catch {
    return null;
  }
}
