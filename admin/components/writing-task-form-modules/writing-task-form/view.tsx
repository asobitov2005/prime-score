"use client";
import type { WritingTaskFormScope } from "./controller";
import { WritingTaskFormView1 } from "./view-section-08";

export function WritingTaskFormView({ scope }: { scope: WritingTaskFormScope }) {
  return <WritingTaskFormView1 scope={scope} />;
}
