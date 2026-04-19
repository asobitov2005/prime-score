import { cookies } from "next/headers";
import type { AdminIdentity } from "@/lib/types";
import { ADMIN_ACCESS_COOKIE } from "@/lib/auth";

const adminApiBaseUrl = (
  process.env.ADMIN_API_INTERNAL_BASE_URL
  ?? process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL
  ?? "http://127.0.0.1:8000/api/admin"
).replace(/\/$/, "");

type BackendAdminIdentity = {
  id: string;
  username: string;
  email: string;
  role: "super_admin" | "admin";
  is_active: boolean;
};

function mapAdminIdentity(payload: BackendAdminIdentity): AdminIdentity {
  return {
    id: payload.id,
    username: payload.username,
    email: payload.email,
    role: payload.role,
    isActive: payload.is_active,
  };
}

export async function getAuthenticatedAdmin(): Promise<AdminIdentity | null> {
  const token = cookies().get(ADMIN_ACCESS_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const response = await fetch(`${adminApiBaseUrl}/auth/me`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return mapAdminIdentity((await response.json()) as BackendAdminIdentity);
}
