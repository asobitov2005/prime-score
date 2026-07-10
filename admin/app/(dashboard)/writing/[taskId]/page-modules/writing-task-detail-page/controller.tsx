"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";

export function useWritingTaskDetailPageController(props: { params: { taskId: string } }) {
  let scope = useBaseScope(props);
  scope = { ...scope, ...useControllerPart1(scope) };
  return scope;
}

export type WritingTaskDetailPageScope = ReturnType<typeof useWritingTaskDetailPageController>;
