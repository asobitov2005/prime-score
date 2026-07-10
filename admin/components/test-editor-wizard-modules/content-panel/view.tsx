"use client";
import type { ContentPanelScope } from "./controller";
import { ContentPanelEditorColumn } from "./editor-column";
import { ContentPanelPreviewColumn } from "./preview-column";

export function ContentPanelView({ scope }: { scope: ContentPanelScope }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(360px,0.72fr)]">
      <ContentPanelEditorColumn scope={scope} />
      <ContentPanelPreviewColumn scope={scope} />
    </div>
  );
}
