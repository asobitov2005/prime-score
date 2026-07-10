"use client";
import { useWritingTasksPageController } from "./controller";
import { WritingTasksPageView } from "./view";

export function WritingTasksPage() {
  const scope = useWritingTasksPageController();
  return <WritingTasksPageView scope={scope} />;
}
