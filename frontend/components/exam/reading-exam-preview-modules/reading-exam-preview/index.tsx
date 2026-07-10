"use client";
import type { PreviewMode, ReadingExamPreviewData } from "../shared";
import { useReadingExamPreviewController } from "./controller";
import { ReadingExamPreviewView } from "./view";

export function ReadingExamPreview(props: { mode: PreviewMode; data?: ReadingExamPreviewData }) {
  const scope = useReadingExamPreviewController(props);
  return <ReadingExamPreviewView scope={scope} />;
}
