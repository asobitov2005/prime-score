"use client";
import type { Props } from "../shared";

export function useBaseScope(props: Props) {
  const { mode, testId, initialDraft } = props;
    return { mode, testId, initialDraft };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
