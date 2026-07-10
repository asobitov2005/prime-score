"use client";

import { ADMIN_PUBLIC_API_BASE_URL, AdminPlanSummary, getClientAdminAccessToken } from "./dependencies";



export const API_BASE = ADMIN_PUBLIC_API_BASE_URL;

export type PlanManagerProps = {
  initialPlans: AdminPlanSummary[];
};

export type BackendPlanPayload = {
  id: string;
  name: string;
  duration_days: number;
  price: number | string;
  badge_label?: string | null;
  perks?: string[];
  display_order?: number;
  is_featured?: boolean;
  is_active?: boolean;
};

export type PlanFormState = {
  id: string | null;
  name: string;
  durationDays: string;
  price: string;
  badgeLabel: string;
  perksText: string;
  displayOrder: string;
  isActive: boolean;
  isFeatured: boolean;
};

export function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString("en-US").replace(/,/g, " ")} sum`;
}

export function toNumber(value: number | string): number {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapBackendPlan(payload: BackendPlanPayload): AdminPlanSummary {
  return {
    id: payload.id,
    name: payload.name,
    durationDays: payload.duration_days,
    price: toNumber(payload.price),
    badgeLabel: (payload.badge_label ?? "").trim(),
    perks: Array.isArray(payload.perks) ? payload.perks.map((item) => String(item ?? "").trim()).filter(Boolean) : [],
    displayOrder: payload.display_order ?? 0,
    isActive: payload.is_active !== false,
    isFeatured: payload.is_featured === true,
  };
}

export function sortPlans(items: AdminPlanSummary[]): AdminPlanSummary[] {
  return [...items].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder;
    }
    if (left.durationDays !== right.durationDays) {
      return left.durationDays - right.durationDays;
    }
    return left.price - right.price;
  });
}

export function normalizePerkLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.replace(/^[\s\-•]+/, "").trim())
    .filter(Boolean);
}

export function parsePriceInput(value: string): number {
  const numeric = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function buildDraft(plan: AdminPlanSummary | null, existingPlans: AdminPlanSummary[]): PlanFormState {
  if (plan) {
    return {
      id: plan.id,
      name: plan.name,
      durationDays: String(plan.durationDays),
      price: String(Math.round(plan.price)),
      badgeLabel: plan.badgeLabel,
      perksText: plan.perks.join("\n"),
      displayOrder: String(plan.displayOrder),
      isActive: plan.isActive,
      isFeatured: plan.isFeatured,
    };
  }

  const nextOrder = existingPlans.reduce((highest, item) => Math.max(highest, item.displayOrder), 0) + 10;
  return {
    id: null,
    name: "",
    durationDays: "30",
    price: "",
    badgeLabel: "Premium Plan",
    perksText: "",
    displayOrder: String(nextOrder),
    isActive: true,
    isFeatured: false,
  };
}

export async function requestPlanJson<T>(path: string, init?: RequestInit): Promise<T> {
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
    throw new Error(typeof payload?.detail === "string" ? payload.detail : "Request failed.");
  }

  return (await response.json()) as T;
}
