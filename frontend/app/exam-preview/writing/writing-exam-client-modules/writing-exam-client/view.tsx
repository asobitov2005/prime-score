"use client";
import type { WritingExamClientScope } from "./controller";
import { WritingExamClientView1 } from "./view-section-01";

export function WritingExamClientView({ scope }: { scope: WritingExamClientScope }) {
  return <WritingExamClientView1 scope={scope} />;
}
