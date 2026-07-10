"use client";
import type { WritingResultReadyScope } from "../shared";

export function useBaseScope(props: { scope: WritingResultReadyScope }) {
  const { scope } = props;
    return { scope };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
