"use client";

import { ADMIN_PUBLIC_API_BASE_URL, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, cn, getClientAdminAccessToken } from "./dependencies";



export type ReviewRow = {
  id: string;
  source: "admin" | "user";
  author_name: string;
  band_label: string;
  text: string;
  is_visible: boolean;
  created_at: string;
  user_id: string | null;
  user_display_name: string | null;
  user_username: string | null;
  created_by_admin_id: string | null;
};

export type UserOption = {
  id: string;
  first_name: string;
  last_name: string | null;
  username: string | null;
};

export const API_BASE = ADMIN_PUBLIC_API_BASE_URL;

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function buildUserLabel(user: UserOption): string {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  if (user.username) {
    return `${fullName || "Unnamed user"} · ${user.username}`;
  }
  return fullName || "Unnamed user";
}

export async function requestAdmin<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getClientAdminAccessToken();
  if (!token) {
    throw new Error("Admin session is missing.");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "Admin request failed.");
  }

  return (await response.json()) as T;
}

export function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "success" | "warning" | "info";
}) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="space-y-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <Badge tone={tone}>{tone === "info" ? "Needs moderation trail" : tone === "success" ? "Public-facing" : "Internal only"}</Badge>
      </CardContent>
    </Card>
  );
}

export function Notice({
  message,
  tone,
}: {
  message: string;
  tone: "success" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm font-medium",
        tone === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600" : "border-red-500/20 bg-red-500/10 text-red-500",
      )}
    >
      {message}
    </div>
  );
}
