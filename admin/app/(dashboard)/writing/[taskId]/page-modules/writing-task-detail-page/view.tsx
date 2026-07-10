"use client";
import type { WritingTaskDetailPageScope } from "./controller";
import { WritingTaskDetailPageView1 } from "./view-section-10";

export function WritingTaskDetailPageView({ scope }: { scope: WritingTaskDetailPageScope }) {
  return <WritingTaskDetailPageView1 scope={scope} />;
}
