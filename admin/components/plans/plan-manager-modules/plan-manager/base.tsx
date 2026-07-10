"use client";
import type { PlanManagerProps } from "../shared";

export function useBaseScope(props: PlanManagerProps) {
  const { initialPlans } = props;
    return { initialPlans };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
