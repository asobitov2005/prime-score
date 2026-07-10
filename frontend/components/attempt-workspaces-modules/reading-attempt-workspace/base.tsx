"use client";
import type { ReadingAttemptWorkspaceProps } from "../shared";

export function useBaseScope(props: ReadingAttemptWorkspaceProps) {
  const { attemptId, testTitle, mode, scope, passage, sections, meta, initialAnswers } = props;
    return { attemptId, testTitle, mode, scope, passage, sections, meta, initialAnswers };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
