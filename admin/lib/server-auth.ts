import { cookies } from "next/headers";
import type { AdminIdentity } from "@/lib/types";
import { ADMIN_ACCESS_COOKIE } from "@/lib/auth";

type AdminJwtPayload = {
  sub?: string;
  scope?: string;
  role?: "super_admin" | "admin";
  exp?: number;
  username?: string;
  email?: string;
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

export async function getAuthenticatedAdmin(): Promise<AdminIdentity | null> {
  const token = cookies().get(ADMIN_ACCESS_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload || payload.scope !== "admin" || !payload.sub) {
    return null;
  }

  if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
    return null;
  }

  return {
    id: payload.sub,
    username: payload.username ?? "admin",
    email: payload.email ?? "admin@primescore.local",
    role: payload.role === "super_admin" ? "super_admin" : "admin",
    isActive: true,
  };
}
