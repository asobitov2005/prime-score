"use client";
import type { WritingSubmissionDetailPageScope } from "./controller";
import { WritingSubmissionDetailPageView1 } from "./view-section-03";

export function WritingSubmissionDetailPageView({ scope }: { scope: WritingSubmissionDetailPageScope }) {
  return <WritingSubmissionDetailPageView1 scope={scope} />;
}
