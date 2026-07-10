"use client";

export function formatHours(seconds: number) {
  return `${(seconds / 3600).toFixed(1)}h`;
}
