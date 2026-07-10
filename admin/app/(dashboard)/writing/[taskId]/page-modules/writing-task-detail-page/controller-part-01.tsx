"use client";
import type { BaseScope } from "./base";
import { AdminDetailLoadingSkeleton, ChevronLeft, Link, WritingSubmission, WritingTask, useCallback, useEffect, useRouter, useState, writingApi } from "../dependencies";

export function useControllerPart1(scope: BaseScope) {
  const { params } = scope;
  const router = useRouter();

  const [task, setTask] = useState<WritingTask | null>(null);

  const [submissions, setSubmissions] = useState<WritingSubmission[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const t = await writingApi.getTask(params.taskId);
        setTask(t);
        try {
          const subs = await writingApi.listSubmissions({ task_id: params.taskId, page_size: 10 });
          setSubmissions(subs.items);
        } catch {
          setSubmissions([]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load task.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }, [params.taskId]);

  useEffect(() => {
      void load();
    }, [load]);

  async function performAction(action: () => Promise<unknown>, successMsg: string) {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);
      try {
        await action();
        setActionSuccess(successMsg);
        await load();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Action failed.";
        setActionError(message);
      } finally {
        setActionLoading(false);
      }
    }

  async function handleDelete() {
      setActionLoading(true);
      setActionError(null);
      try {
        await writingApi.deleteTask(params.taskId);
        router.push("/writing");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Delete failed.";
        setActionError(message);
        setActionLoading(false);
      }
    }

  if (loading) {
      return <AdminDetailLoadingSkeleton />;
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
          </div>
        </div>
      );
    }

  const minutes = Math.round(task.time_limit_seconds / 60);

  return { router, task, setTask, submissions, setSubmissions, loading, setLoading, error, setError, actionLoading, setActionLoading, actionError, setActionError, actionSuccess, setActionSuccess, confirmDelete, setConfirmDelete, load, performAction, handleDelete, minutes };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
