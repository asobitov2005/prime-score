"use client";
import type { ContentPanelScope } from "./controller";
import { buildContentSectionItem } from "./section-item";
import { ContentSectionCard } from "./section-card";

export function ContentSectionsList({ scope }: { scope: ContentPanelScope }) {
  const { draft } = scope;
  return (
    <>
      {draft.content.sections.map((section, idx) => (
        <ContentSectionCard
          key={section.id}
          scope={scope}
          item={buildContentSectionItem(scope, section, idx)}
        />
      ))}
    </>
  );
}
