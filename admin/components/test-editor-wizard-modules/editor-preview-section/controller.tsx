"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";
import { useControllerPart2 } from "./controller-part-02";

export function useEditorPreviewSectionController(props: {
  previewId: string;
  draftType: AdminTestDraftState["metadata"]["type"];
  section: AdminTestDraftState["content"]["sections"][number];
  logicalIndex: number;
  intro: string;
  groups: AdminTestDraftState["questionGroups"];
  compact?: boolean;
  showSectionIntro?: boolean;
}) {
  let scope = useBaseScope(props);
  scope = { ...scope, ...useControllerPart1(scope) };
  scope = { ...scope, ...useControllerPart2(scope) };
  return scope;
}

export type EditorPreviewSectionScope = ReturnType<typeof useEditorPreviewSectionController>;
