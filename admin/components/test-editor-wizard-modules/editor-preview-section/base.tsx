"use client";
import type { AdminTestDraftState } from "../dependencies";

export function useBaseScope(props: {
  previewId: string;
  draftType: AdminTestDraftState["metadata"]["type"];
  section: AdminTestDraftState["content"]["sections"][number];
  logicalIndex: number;
  intro: string;
  groups: AdminTestDraftState["questionGroups"];
  compact?: boolean;
  showSectionIntro?: boolean;
}) {
  const {
    previewId,
    draftType,
    section,
    logicalIndex,
    intro,
    groups,
    compact = false,
    showSectionIntro = true,
  } = props;
    return { previewId, draftType, section, logicalIndex, intro, groups, compact, showSectionIntro };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
