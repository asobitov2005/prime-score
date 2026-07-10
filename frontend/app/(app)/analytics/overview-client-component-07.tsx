"use client";

export function formatPercent(value: number | null | undefined, fallback = "—") {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}%` : fallback;
}
