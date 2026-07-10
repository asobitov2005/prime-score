"use client";
import type { WritingTasksPageScope } from "./controller";
import { WritingTasksPageView1 } from "./view-section-08";

export function WritingTasksPageView({ scope }: { scope: WritingTasksPageScope }) {
  return <WritingTasksPageView1 scope={scope} />;
}
