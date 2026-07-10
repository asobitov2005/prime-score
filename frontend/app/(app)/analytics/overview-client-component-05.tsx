"use client";

import { roundIeltsBand } from "./overview-client-dependencies";

export function roundWholeBand(value: number | string | null | undefined) {
  const rounded = roundIeltsBand(value);
  return rounded === null ? null : Math.min(9, Math.max(0, Math.round(rounded)));
}
