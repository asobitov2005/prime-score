"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";

export function useWritingTaskFormController(props: WritingTaskFormProps) {
  let scope = useBaseScope(props);
  scope = { ...scope, ...useControllerPart1(scope) };
  return scope;
}

export type WritingTaskFormScope = ReturnType<typeof useWritingTaskFormController>;
