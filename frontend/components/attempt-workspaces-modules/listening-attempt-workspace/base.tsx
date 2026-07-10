"use client";
import type { ListeningAttemptWorkspaceProps } from "../shared";

export function useBaseScope(props: ListeningAttemptWorkspaceProps) {
  const {
    attemptId,
    testTitle,
    mode,
    scope,
    part,
    sections,
    meta,
    initialAnswers
  } = props;
    return { attemptId, testTitle, mode, scope, part, sections, meta, initialAnswers };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
