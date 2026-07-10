"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";

export function useWritingSubmissionDetailPageController(props: { params: { submissionId: string } }) {
  let scope = useBaseScope(props);
  scope = { ...scope, ...useControllerPart1(scope) };
  return scope;
}

export type WritingSubmissionDetailPageScope = ReturnType<typeof useWritingSubmissionDetailPageController>;
