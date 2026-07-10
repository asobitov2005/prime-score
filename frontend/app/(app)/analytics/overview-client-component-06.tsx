"use client";

import { roundWholeBand } from "./overview-client-component-05";

export function formatBand(value: number | string | null | undefined, fallback = "—") {
  const rounded = roundWholeBand(value);
  return rounded === null ? fallback : String(rounded);
}
