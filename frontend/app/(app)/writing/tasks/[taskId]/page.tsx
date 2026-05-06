import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface WritingTaskDetailPageProps {
  params: { taskId: string };
}

export default function WritingTaskDetailPage({ params }: WritingTaskDetailPageProps) {
  redirect(`/exam-preview/writing?taskId=${params.taskId}&mode=practice`);
}
