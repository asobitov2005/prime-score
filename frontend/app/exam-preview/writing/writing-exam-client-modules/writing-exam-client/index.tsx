"use client";
import type { ExamWritingTask, WritingTaskType } from "../shared";
import { useWritingExamClientController } from "./controller";
import { WritingExamClientView } from "./view";

export function WritingExamClient(props: {
  task: ExamWritingTask | null;
  taskType: WritingTaskType;
  draftKey?: string | null;
}) {
  const scope = useWritingExamClientController(props);
  return <WritingExamClientView scope={scope} />;
}
