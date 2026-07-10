"use client";

import { AttemptWorkspaceMeta, ListeningPart, ReadingPassage, TestSectionSummary } from "./dependencies";



export interface ReadingAttemptWorkspaceProps {
  attemptId: string;
  testTitle: string;
  mode: "practice" | "exam";
  scope: "full" | "section";
  passage: ReadingPassage;
  sections: TestSectionSummary[];
  meta: AttemptWorkspaceMeta;
  initialAnswers?: Record<string, string>;
}

export interface ListeningAttemptWorkspaceProps {
  attemptId: string;
  testTitle: string;
  mode: "practice" | "exam";
  scope: "full" | "section";
  part: ListeningPart;
  sections: TestSectionSummary[];
  meta: AttemptWorkspaceMeta;
  initialAnswers?: Record<string, string>;
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
