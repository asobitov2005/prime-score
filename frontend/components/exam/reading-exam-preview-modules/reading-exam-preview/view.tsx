"use client";
import type { ReadingExamPreviewScope } from "./controller";
import { ReadingExamPreviewView1 } from "./view-section-20";

export function ReadingExamPreviewView({ scope }: { scope: ReadingExamPreviewScope }) {
  return <ReadingExamPreviewView1 scope={scope} />;
}
