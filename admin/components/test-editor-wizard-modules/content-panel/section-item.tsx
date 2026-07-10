"use client";
import type { ContentPanelScope } from "./controller";
import { parsePassageContentBlocks } from "../shared";
export function buildContentSectionItem(
  scope: ContentPanelScope,
  section: ContentPanelScope["draft"]["content"]["sections"][number],
  idx: number,
) {
  const { draft, resolveLogicalIndex, collapsedSections, deleteConfirmSectionId } = scope;
  const sectionLabel = draft.metadata.type === "reading" ? "Passage " + (resolveLogicalIndex(idx) + 1) : "Part " + (resolveLogicalIndex(idx) + 1);
  const contentBlocks = parsePassageContentBlocks(section.content, Boolean(section.showLabels));
  const labelledBlocks = contentBlocks.filter((block) => block.isLabelled).length;
  const isSectionCollapsed = collapsedSections[section.id] ?? false;
  const showDeleteConfirm = deleteConfirmSectionId === section.id;
  return { section, idx, sectionLabel, contentBlocks, labelledBlocks, isSectionCollapsed, showDeleteConfirm };
}
export type ContentSectionItem = ReturnType<typeof buildContentSectionItem>;
