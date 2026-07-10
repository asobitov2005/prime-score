"use client";
import type { AdminTestDraftState } from "../dependencies";
import { useEditorPreviewSectionController } from "./controller";
import { EditorPreviewSectionView } from "./view";

export function EditorPreviewSection(props: {
  previewId: string;
  draftType: AdminTestDraftState["metadata"]["type"];
  section: AdminTestDraftState["content"]["sections"][number];
  logicalIndex: number;
  intro: string;
  groups: AdminTestDraftState["questionGroups"];
  compact?: boolean;
  showSectionIntro?: boolean;
}) {
  const scope = useEditorPreviewSectionController(props);
  return <EditorPreviewSectionView scope={scope} />;
}
