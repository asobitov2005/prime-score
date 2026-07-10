"use client";

import { AdminAiProviderConfig } from "./dependencies";

import { ProviderDraft, cloneSettings, isRecord } from "./shared-part-01";



export function writeNestedString(settings: Record<string, unknown>, path: readonly string[], value: string): Record<string, unknown> {
  const next = cloneSettings(settings);
  let current: Record<string, unknown> = next;
  for (const segment of path.slice(0, -1)) {
    if (!isRecord(current[segment])) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
  return next;
}

export function createProviderDraft(provider: AdminAiProviderConfig): ProviderDraft {
  return {
    label: provider.label,
    apiKey: "",
    baseUrl: provider.baseUrl ?? "",
    isEnabled: provider.isEnabled,
  };
}

export function toneForSync(status: string | null): "neutral" | "success" | "warning" | "danger" {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  if (status === "running") return "warning";
  return "neutral";
}
