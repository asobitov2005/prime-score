"use client";
import type { WritingTaskFormProps } from "../shared";

export function useBaseScope(props: WritingTaskFormProps) {
  const { mode, task } = props;
    return { mode, task };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
