"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Edit3,
  ImageIcon,
  Loader2,
  RefreshCcw,
  Sparkles,
  Trash2,
  Upload
} from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  SectionHeader,
  buttonClassName,
  cn
} from "@/components/ui";
import type { WritingSubmission, WritingTask } from "@/lib/writing-api";
import {
  formatImageSummaryStatus,
  formatStatus,
  formatTaskType,
  writingApi
} from "@/lib/writing-api";

function badgeToneForStatus(status: string): "neutral" | "success" | "warning" | "paused" {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  return "paused";
}

function badgeToneForSummary(status: string): "neutral" | "success" | "warning" | "danger" {
  if (status === "ready") return "success";
  if (status === "pending") return "warning";
  if (status === "failed") return "danger";
  return "neutral";
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function WritingTaskDetailPage({ params }: { params: { taskId: string } }) {
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
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading task…
      </div>
    );
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
        eyebrow={`${formatTaskType(task.task_type)} · ${formatStatus(task.status)}`}
        title={task.title}
        description={task.source ?? undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/writing/${task.id}/edit`}
              className={buttonClassName({ variant: "outline", size: "sm" })}
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </Link>
            {task.status !== "published" ? (
              <button
                type="button"
                onClick={() =>
                  performAction(() => writingApi.publishTask(task.id), "Task published.")
                }
                disabled={actionLoading}
                className={buttonClassName({ variant: "solid", size: "sm" })}
              >
                <Upload className="h-4 w-4" />
                Publish
              </button>
            ) : null}
            {task.status !== "archived" ? (
              <button
                type="button"
                onClick={() =>
                  performAction(() => writingApi.archiveTask(task.id), "Task archived.")
                }
                disabled={actionLoading}
                className={buttonClassName({ variant: "ghost", size: "sm" })}
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setConfirmDelete((v) => !v)}
              disabled={actionLoading}
              className={cn(
                buttonClassName({ variant: "ghost", size: "sm" }),
                "text-danger hover:bg-danger/10"
              )}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        }
      />

      {actionError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 text-danger shrink-0" />
          <p>{actionError}</p>
        </div>
      ) : null}
      {actionSuccess ? (
        <div className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/8 px-4 py-3 text-sm">
          <CheckCircle2 className="h-4 w-4 mt-0.5 text-success shrink-0" />
          <p>{actionSuccess}</p>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm font-semibold">Delete this task?</p>
          <p className="text-xs text-muted-foreground mt-1">
            This cannot be undone. Tasks with submissions cannot be deleted.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className={buttonClassName({ variant: "ghost", size: "sm" })}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={actionLoading}
              className={buttonClassName({ variant: "danger", size: "sm" })}
            >
              {actionLoading ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Prompt</CardTitle>
            <div className="flex items-center gap-2">
              <Badge tone={badgeToneForStatus(task.status)}>{formatStatus(task.status)}</Badge>
              <Badge tone="info">{formatTaskType(task.task_type)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {task.task_type === "task_1" && task.image_url ? (
              <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-muted/30">
                <img
                  src={task.image_url}
                  alt="Task diagram"
                  className="max-h-[420px] w-full object-contain"
                />
              </div>
            ) : null}
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-sm leading-7"
              dangerouslySetInnerHTML={{ __html: task.prompt_html }}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Word minimum</span>
                <span className="font-semibold">{task.word_minimum}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Time limit</span>
                <span className="font-semibold inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {minutes} min
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Difficulty</span>
                <span className="font-semibold capitalize">{task.difficulty}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sample band</span>
                <span className="font-semibold">{task.sample_band ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-semibold">{formatDateTime(task.created_at)}</span>
              </div>
              {task.source ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-semibold text-right">{task.source}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {task.task_type === "task_1" ? (
            <Card className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Image Summary
                </CardTitle>
                <Badge tone={badgeToneForSummary(task.image_summary_status)}>
                  {formatImageSummaryStatus(task.image_summary_status)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {task.image_url ? (
                  <button
                    type="button"
                    onClick={() =>
                      performAction(
                        () => writingApi.regenerateImageSummary(task.id),
                        "Summary regeneration started."
                      )
                    }
                    disabled={actionLoading}
                    className={buttonClassName({ variant: "outline", size: "sm" })}
                  >
                    {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                    Regenerate
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" />
                    No image uploaded
                  </p>
                )}
                <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs leading-6 text-foreground whitespace-pre-wrap">
                  {task.image_summary || "No summary available yet."}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {task.description ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-6 text-muted-foreground">
              {task.description}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {task.sample_answer ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Sample Answer</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap font-sans leading-7 text-foreground">
              {task.sample_answer}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent Submissions</CardTitle>
          <Link href={`/writing/submissions?task_id=${task.id}`} className="text-xs font-semibold text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {submissions.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No submissions yet.
            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-muted-foreground bg-muted/30">
                  <th className="border-b border-border px-4 py-3 font-semibold">User</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Words</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Band</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Status</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="border-b border-border/50 px-4 py-3 text-sm">
                      {s.user_username || s.user_email || s.user_id.slice(0, 8)}
                    </td>
                    <td className="border-b border-border/50 px-3 py-3 text-sm font-semibold">
                      {s.word_count}
                    </td>
                    <td className="border-b border-border/50 px-3 py-3 text-sm font-bold">
                      {s.evaluation?.overall_band ?? "—"}
                    </td>
                    <td className="border-b border-border/50 px-3 py-3">
                      <Badge tone={
                        s.status === "completed" ? "success" :
                        s.status === "failed" ? "danger" :
                        s.status === "queued" || s.status === "running" ? "warning" : "neutral"
                      }>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="border-b border-border/50 px-3 py-3 text-xs text-muted-foreground">
                      {formatDateTime(s.submitted_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
