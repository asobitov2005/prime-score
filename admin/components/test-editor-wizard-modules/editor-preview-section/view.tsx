"use client";
import type { EditorPreviewSectionScope } from "./controller";
import { EditorPreviewSectionView1 } from "./view-section-04";

export function EditorPreviewSectionView({ scope }: { scope: EditorPreviewSectionScope }) {
  return <EditorPreviewSectionView1 scope={scope} />;
}
