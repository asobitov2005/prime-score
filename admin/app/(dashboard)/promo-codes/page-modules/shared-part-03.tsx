"use client";

import { Card, CardContent, cn, getClientAdminAccessToken } from "./dependencies";

import { API_BASE, GiftCodeRow } from "./shared-part-01";



export function statusTone(status: GiftCodeRow["status"]): "success" | "paused" | "info" | "danger" | "warning" {
  if (status === "available") return "success";
  if (status === "paused") return "paused";
  if (status === "redeemed") return "info";
  if (status === "revoked") return "danger";
  return "warning";
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
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? "Admin request failed.");
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
  tone: "success" | "info" | "warning" | "danger";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-black text-foreground">{value}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">{detail}</p>
          </div>
          <div
            className={cn(
              "mt-1 h-2.5 w-2.5 rounded-full",
              tone === "success" && "bg-success",
              tone === "info" && "bg-primary",
              tone === "warning" && "bg-warning",
              tone === "danger" && "bg-danger",
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
