"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";
import { useControllerPart2 } from "./controller-part-02";
import { useControllerPart3 } from "./controller-part-03";

export function useWritingExamClientController(props: {
  task: ExamWritingTask | null;
  taskType: WritingTaskType;
  draftKey?: string | null;
}) {
  let scope = useBaseScope(props);
  scope = { ...scope, ...useControllerPart1(scope) };
  scope = { ...scope, ...useControllerPart2(scope) };
  scope = { ...scope, ...useControllerPart3(scope) };
  return scope;
}

export type WritingExamClientScope = ReturnType<typeof useWritingExamClientController>;
