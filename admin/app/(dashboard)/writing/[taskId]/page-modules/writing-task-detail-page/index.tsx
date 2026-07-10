"use client";
import { useWritingTaskDetailPageController } from "./controller";
import { WritingTaskDetailPageView } from "./view";

export function WritingTaskDetailPage(props: { params: { taskId: string } }) {
  const scope = useWritingTaskDetailPageController(props);
  return <WritingTaskDetailPageView scope={scope} />;
}
