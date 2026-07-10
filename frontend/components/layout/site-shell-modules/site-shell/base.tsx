"use client";
import type { SiteShellProps } from "../shared";

export function useBaseScope(props: SiteShellProps) {
  const { children } = props;
    return { children };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
