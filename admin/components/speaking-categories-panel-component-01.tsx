"use client";

import { SpeakingCategoryScope } from "./speaking-categories-panel-dependencies";

export const SCOPE_META: Record<
  SpeakingCategoryScope,
  { label: string; description: string; tone: "neutral" | "success" | "warning" }
> = {
  part1: {
    label: "Part 1",
    description: "Everyday personal themes for short questions.",
    tone: "success",
  },
  cross_part: {
    label: "Part 2 & 3",
    description: "Shared themes for cue cards and discussions.",
    tone: "warning",
  },
  custom: {
    label: "Custom",
    description: "Your own category labels.",
    tone: "neutral",
  },
};
