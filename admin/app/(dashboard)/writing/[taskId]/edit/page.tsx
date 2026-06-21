"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { SectionHeader } from "@/components/ui";
import { AdminFormLoadingSkeleton } from "@/components/loading-skeletons";
import { WritingTaskForm } from "@/components/writing-task-form";
import type { WritingTask } from "@/lib/writing-api";
import { writingApi } from "@/lib/writing-api";

export default function EditWritingTaskPage({ params }: { params: { taskId: string } }) {
  const router = useRouter();
  const [task, setTask] = useState<WritingTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await writingApi.getTask(params.taskId);
        if (!cancelled) setTask(result);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load task.";
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.taskId]);

  if (loading) {
    return <AdminFormLoadingSkeleton />;
  }

  if (error || !task) {
    return (
      <div className="space-y-4">
        <Link
          href="/writing"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to writing tasks
        </Link>
        <div className="rounded-2xl border border-danger/30 bg-danger/8 p-6 text-sm">
          <p className="font-semibold text-danger">Failed to load task</p>
          <p className="opacity-90 mt-1">{error ?? "Task not found."}</p>
          <button
            type="button"
            onClick={() => router.push("/writing")}
            className="mt-3 text-sm font-semibold text-primary hover:underline"
          >
            Back to writing tasks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/writing"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to writing tasks
      </Link>
      <SectionHeader
        eyebrow="Edit Writing Task"
        title={task.title}
        description="Update the prompt, image, or reference answer for this task."
      />
      <WritingTaskForm mode="edit" task={task} />
    </div>
  );
}
