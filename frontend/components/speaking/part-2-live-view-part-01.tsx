"use client";

import { Part1LiveSession, Part2CueCard, Part2ViewPhase } from "./part-2-live-view-dependencies";

export const purpleWaveformBars = [
  8, 14, 22, 12, 28, 36, 18, 10, 26, 40, 24, 14, 30, 44, 32, 16, 34, 48, 28, 12,
  24, 38, 30, 18, 36, 22, 10, 20, 32, 18, 8, 16,
] as const;

export const greenWaveformBars = [
  10, 18, 30, 16, 42, 58, 34, 22, 50, 70, 44, 18, 36, 62, 48, 24, 56, 74, 40, 20,
  46, 66, 52, 28, 60, 38, 16, 34, 54, 30, 12, 24,
] as const;

export const radialBarHeights = [
  14, 22, 28, 16, 32, 24, 18, 30, 22, 16, 34, 26, 18, 22, 28, 16,
  24, 32, 18, 22, 28, 20, 14, 26, 18, 24, 30, 16, 22, 20, 18, 26,
  24, 16, 28, 20, 14, 22, 26, 18,
] as const;

export type Part2LiveViewProps = {
  live: Part1LiveSession;
  cueCard: Part2CueCard;
  viewPhase: Part2ViewPhase;
  notes: string;
  topicLabel: string;
  connectionOnline: boolean;
  onNotesChange: (value: string) => void;
  onListenAgain: () => void;
  onEndTest: () => void;
  endDisabled?: boolean;
};
