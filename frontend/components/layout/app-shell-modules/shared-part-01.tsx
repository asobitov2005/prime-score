"use client";

import { ReactNode } from "./dependencies";



export interface AppShellProps {
  children: ReactNode;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}
