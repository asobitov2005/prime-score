export function roundToNearestHalf(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.round(numeric * 2) / 2;
}

export function roundIeltsBand(value: number | string | null | undefined): number | null {
  const rounded = roundToNearestHalf(value);
  if (rounded === null) {
    return null;
  }

  return Math.min(9, Math.max(0, rounded));
}

export function formatIeltsBand(value: number | string | null | undefined, fallback = "—"): string {
  const rounded = roundIeltsBand(value);
  return rounded === null ? fallback : rounded.toFixed(1);
}

export function formatIeltsBandDelta(value: number | string | null | undefined, fallback = "No previous data"): string {
  const rounded = roundToNearestHalf(value);
  if (rounded === null) {
    return fallback;
  }

  return `${rounded >= 0 ? "+" : ""}${rounded.toFixed(1)}`;
}
