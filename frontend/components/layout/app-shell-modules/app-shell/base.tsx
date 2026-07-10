"use client";
import type { AppShellProps } from "../shared";

export function useBaseScope(props: AppShellProps) {
  const { children } = props;
    return { children };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
