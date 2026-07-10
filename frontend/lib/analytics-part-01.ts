"use client";

export type DataLayerPrimitive = string | number | boolean | null;

export type DataLayerValue =
  | DataLayerPrimitive
  | DataLayerValue[]
  | { [key: string]: DataLayerValue | undefined };

export type DataLayerPayload = Record<string, DataLayerValue | undefined>;

export const SESSION_EVENT_KEYS_STORAGE = "prime-gtm-session-events";

export declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function normalizeValue(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeValue(item))
      .filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key, normalizeValue(item)])
        .filter(([, item]) => item !== undefined),
    );
  }

  return String(value);
}

export function normalizePayload(payload: DataLayerPayload): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload)
      .map(([key, value]) => [key, normalizeValue(value)])
      .filter(([, value]) => value !== undefined),
  );
}

export function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function getSessionEventKeys(): string[] {
  if (!canUseBrowserStorage()) {
    return [];
  }

  try {
    const stored = window.sessionStorage.getItem(SESSION_EVENT_KEYS_STORAGE);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function rememberSessionEventKey(key: string) {
  if (!canUseBrowserStorage()) {
    return;
  }

  try {
    const next = [...new Set([...getSessionEventKeys(), key])].slice(-100);
    window.sessionStorage.setItem(SESSION_EVENT_KEYS_STORAGE, JSON.stringify(next));
  } catch {
    // Ignore storage failures.
  }
}

export function hasSeenSessionEvent(key: string) {
  return getSessionEventKeys().includes(key);
}

export function pushDataLayerEvent(event: string, payload: DataLayerPayload = {}) {
  if (typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ...normalizePayload(payload),
  });
}

export function pushDataLayerEventOnce(key: string, event: string, payload: DataLayerPayload = {}) {
  if (hasSeenSessionEvent(key)) {
    return;
  }

  rememberSessionEventKey(key);
  pushDataLayerEvent(event, payload);
}

export function parseAnalyticsAmount(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^0-9.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function trackPageView(payload: {
  pagePath: string;
  pageLocation: string;
  pageTitle: string;
  pageGroup: string;
  queryString?: string;
}) {
  pushDataLayerEvent("page_view", {
    page_path: payload.pagePath,
    page_location: payload.pageLocation,
    page_title: payload.pageTitle,
    page_group: payload.pageGroup,
    query_string: payload.queryString || undefined,
  });
}

export function trackLogin(payload: { method: string; isPremium: boolean }) {
  pushDataLayerEvent("login", {
    method: payload.method,
    user_tier: payload.isPremium ? "premium" : "free",
  });
}

export function trackCtaClick(payload: {
  ctaName: string;
  ctaLabel: string;
  ctaLocation: string;
  destination: string;
  authState?: "guest" | "authenticated";
}) {
  pushDataLayerEvent("cta_click", {
    cta_name: payload.ctaName,
    cta_label: payload.ctaLabel,
    cta_location: payload.ctaLocation,
    destination: payload.destination,
    auth_state: payload.authState,
  });
}
