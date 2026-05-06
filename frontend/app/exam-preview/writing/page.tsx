import { notFound } from "next/navigation";

import { getWritingTask, resolveWritingAssetUrl, type WritingTaskType } from "@/lib/server-writing";
import { WritingExamClient } from "./writing-exam-client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface WritingExamPreviewPageProps {
  searchParams?: {
    taskId?: string;
    task_type?: string;
    mode?: string;
  };
}

function asTaskType(value: string | undefined): WritingTaskType {
  return value === "task_1" ? "task_1" : "task_2";
}

export default async function WritingExamPreviewPage({ searchParams }: WritingExamPreviewPageProps) {
  const taskId = searchParams?.taskId?.trim();
  const task = taskId ? await getWritingTask(taskId).catch(() => null) : null;
  const writingMode = searchParams?.mode === "exam" ? "exam" : "practice";

  if (taskId && !task) {
    notFound();
  }

  return (
    <WritingExamClient
      task={
        task
          ? {
              id: task.id,
              title: task.title,
              task_type: task.task_type,
              prompt_html: task.prompt_html,
              image_url: resolveWritingAssetUrl(task.image_url),
              word_minimum: task.word_minimum,
              time_limit_seconds: task.time_limit_seconds,
              source: task.source ?? null,
            }
          : null
      }
      taskType={task?.task_type ?? asTaskType(searchParams?.task_type)}
      writingMode={writingMode}
    />
  );
}
