import { notFound } from "next/navigation";

import { getWritingTask, resolveWritingAssetUrl } from "@/lib/server-writing";
import { WritingTaskWorkspace } from "./workspace-client";

export const dynamic = "force-dynamic";

interface WritingTaskDetailPageProps {
  params: { taskId: string };
}

export default async function WritingTaskDetailPage({ params }: WritingTaskDetailPageProps) {
  const task = await getWritingTask(params.taskId).catch(() => null);
  if (!task) {
    notFound();
  }

  const imageUrl = resolveWritingAssetUrl(task.image_url);

  return (
    <WritingTaskWorkspace
      task={{
        id: task.id,
        title: task.title,
        task_type: task.task_type,
        prompt_html: task.prompt_html,
        image_url: imageUrl,
        word_minimum: task.word_minimum,
        time_limit_seconds: task.time_limit_seconds,
        difficulty: task.difficulty ?? null,
        source: task.source ?? null,
      }}
    />
  );
}
