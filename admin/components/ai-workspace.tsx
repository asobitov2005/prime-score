"use client";

import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  Clock3,
  Loader2,
  MessageSquareText,
  PanelRight,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  StopCircle,
  Trash2,
  Wrench
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Notice, Textarea, cn } from "@/components/ui";
import type { AdminAiJob, AdminAiMessage, AdminAiThreadDetail, AdminAiThreadStatus, AdminAiThreadSummary, AdminAiToolTrace } from "@/lib/types";
import { formatDate, titleCase } from "@/lib/utils";

const quickPrompts = [
  "Draft a new reading passage outline with a harder inference section.",
  "Review the latest premium plan changes and flag anything unclear.",
  "Summarize recent failed admin jobs and suggest the next debugging step."
];

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatDuration(durationMs?: number | null): string | null {
  if (!durationMs || durationMs < 0) {
    return null;
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  const seconds = durationMs / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainderSeconds}s`;
}

function toneForThreadStatus(status: AdminAiThreadStatus): "neutral" | "warning" | "success" | "danger" | "paused" {
  if (status === "running" || status === "queued") {
    return "warning";
  }
  if (status === "completed") {
    return "success";
  }
  if (status === "failed") {
    return "danger";
  }
  if (status === "archived") {
    return "paused";
  }
  return "neutral";
}

function toneForJobStatus(status: AdminAiJob["status"]): "neutral" | "warning" | "success" | "danger" | "paused" {
  if (status === "running" || status === "queued") {
    return "warning";
  }
  if (status === "completed") {
    return "success";
  }
  if (status === "failed") {
    return "danger";
  }
  if (status === "cancelled") {
    return "paused";
  }
  return "neutral";
}

function toneForTraceStatus(status: AdminAiToolTrace["status"]): "neutral" | "warning" | "success" | "danger" | "paused" {
  if (status === "running" || status === "pending") {
    return "warning";
  }
  if (status === "completed") {
    return "success";
  }
  if (status === "failed") {
    return "danger";
  }
  if (status === "cancelled") {
    return "paused";
  }
  return "neutral";
}

function messageBubbleClassName(message: AdminAiMessage): string {
  if (message.role === "user") {
    return "ml-auto border-primary/20 bg-primary/12 text-foreground";
  }
  if (message.role === "tool") {
    return "border-border bg-background/80 text-muted-foreground";
  }
  if (message.status === "failed") {
    return "border-danger/30 bg-danger/10 text-foreground";
  }
  return "border-border bg-card/90 text-foreground";
}

function toSummary(thread: AdminAiThreadDetail): AdminAiThreadSummary {
  return {
    id: thread.id,
    title: thread.title,
    summary: thread.summary,
    status: thread.status,
    updatedAt: thread.updatedAt,
    createdAt: thread.createdAt,
    messageCount: thread.messageCount,
    lastMessagePreview: thread.lastMessagePreview,
    activeJobId: thread.activeJobId,
    scope: thread.scope
  };
}

function upsertThread(threads: AdminAiThreadSummary[], detail: AdminAiThreadDetail): AdminAiThreadSummary[] {
  const summary = toSummary(detail);
  const remaining = threads.filter((thread) => thread.id !== detail.id);
  return [summary, ...remaining].sort((left, right) => {
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

function buildOptimisticThread(base: AdminAiThreadDetail, content: string): AdminAiThreadDetail {
  const createdAt = new Date().toISOString();
  return {
    ...base,
    updatedAt: createdAt,
    messageCount: base.messageCount + 1,
    lastMessagePreview: content,
    messages: [
      ...base.messages,
      {
        id: `local-user-${createdAt}`,
        role: "user",
        content,
        createdAt,
        status: "completed",
        authorLabel: "You",
        jobId: null,
        toolName: null,
        errorMessage: null
      },
      {
        id: `local-assistant-${createdAt}`,
        role: "assistant",
        content: "",
        createdAt,
        status: "pending",
        authorLabel: "PrimeScore AI",
        jobId: null,
        toolName: null,
        errorMessage: null
      }
    ]
  };
}

function ThreadStatusBadge({ status }: { status: AdminAiThreadStatus }) {
  return <Badge tone={toneForThreadStatus(status)}>{titleCase(status)}</Badge>;
}

function JobStatusBadge({ status }: { status: AdminAiJob["status"] }) {
  return <Badge tone={toneForJobStatus(status)}>{titleCase(status)}</Badge>;
}

function TraceStatusBadge({ status }: { status: AdminAiToolTrace["status"] }) {
  return <Badge tone={toneForTraceStatus(status)}>{titleCase(status)}</Badge>;
}

export function AdminAiWorkspace() {
  const [threads, setThreads] = useState<AdminAiThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<AdminAiThreadDetail | null>(null);
  const [composer, setComposer] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [creatingThread, setCreatingThread] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [archivingThread, setArchivingThread] = useState(false);
  const [jobActionId, setJobActionId] = useState<string | null>(null);
  const selectedThreadIdRef = useRef<string | null>(null);

  const filteredThreads = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) {
      return threads;
    }

    return threads.filter((thread) => {
      return [
        thread.title,
        thread.summary,
        thread.lastMessagePreview,
        thread.scope.label
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [deferredSearch, threads]);

  const selectedJob = useMemo(() => {
    if (!selectedThread) {
      return null;
    }

    return (
      selectedThread.jobs.find((job) => job.id === selectedThread.activeJobId)
      ?? selectedThread.jobs[0]
      ?? null
    );
  }, [selectedThread]);

  const loadThreads = useCallback(async (preferredThreadId?: string | null) => {
    setLoadingThreads(true);
    try {
      const nextThreads = await adminApi.listAiThreads();
      setThreads(nextThreads);
      setWorkspaceError(null);

      const fallbackThreadId =
        preferredThreadId
        ?? (selectedThreadIdRef.current && nextThreads.some((thread) => thread.id === selectedThreadIdRef.current) ? selectedThreadIdRef.current : null)
        ?? nextThreads[0]?.id
        ?? null;

      startTransition(() => {
        setSelectedThreadId(fallbackThreadId);
      });
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to load AI workspace.");
      setThreads([]);
      setSelectedThread(null);
      setSelectedThreadId(null);
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  const loadThread = useCallback(async (threadId: string) => {
    setLoadingThread(true);
    try {
      const detail = await adminApi.getAiThread(threadId);
      setSelectedThread(detail);
      setThreads((current) => upsertThread(current, detail));
      setWorkspaceError(null);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to load thread.");
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!selectedThreadId) {
      setSelectedThread(null);
      return;
    }

    void loadThread(selectedThreadId);
  }, [loadThread, selectedThreadId]);

  useEffect(() => {
    if (!selectedThreadId || !selectedThread) {
      return;
    }

    const hasActiveJob = selectedThread.status === "queued" || selectedThread.status === "running" || Boolean(selectedThread.activeJobId);
    if (!hasActiveJob) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadThread(selectedThreadId);
      void loadThreads(selectedThreadId);
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadThread, loadThreads, selectedThread, selectedThreadId]);

  async function handleCreateThread(initialPrompt?: string) {
    setCreatingThread(true);
    try {
      const detail = await adminApi.createAiThread({
        title: initialPrompt ? initialPrompt.slice(0, 48) : "Untitled workspace",
        scope: {
          type: "general",
          label: "General workspace"
        }
      });

      setThreads((current) => upsertThread(current, detail));
      setSelectedThread(detail);
      setWorkspaceError(null);
      startTransition(() => {
        setSelectedThreadId(detail.id);
      });
      return detail;
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to create thread.");
      return null;
    } finally {
      setCreatingThread(false);
    }
  }

  async function handleSendMessage() {
    const content = composer.trim();
    if (!content || sendingMessage) {
      return;
    }

    setSendingMessage(true);
    const previousThread = selectedThread;
    let workingThread = selectedThread;

    if (!workingThread) {
      workingThread = await handleCreateThread(content);
      if (!workingThread) {
        setSendingMessage(false);
        return;
      }
    }

    const optimistic = buildOptimisticThread(workingThread, content);
    setSelectedThread(optimistic);
    setThreads((current) => upsertThread(current, optimistic));
    setComposer("");

    try {
      const detail = await adminApi.sendAiMessage(workingThread.id, {
        content,
        scope: optimistic.scope
      });
      setSelectedThread(detail);
      setThreads((current) => upsertThread(current, detail));
      setWorkspaceError(null);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to send prompt.");
      setSelectedThread(previousThread);
      if (previousThread) {
        setThreads((current) => upsertThread(current, previousThread));
      } else {
        void loadThread(workingThread.id);
      }
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleArchiveThread() {
    if (!selectedThreadId || archivingThread) {
      return;
    }

    const confirmed = window.confirm("Archive this AI thread?");
    if (!confirmed) {
      return;
    }

    setArchivingThread(true);
    try {
      await adminApi.archiveAiThread(selectedThreadId);
      const remaining = threads.filter((thread) => thread.id !== selectedThreadId);
      setThreads(remaining);
      setSelectedThread(null);
      setWorkspaceError(null);
      startTransition(() => {
        setSelectedThreadId(remaining[0]?.id ?? null);
      });
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to archive thread.");
    } finally {
      setArchivingThread(false);
    }
  }

  async function handleRetryJob(jobId: string) {
    if (!selectedThreadId) {
      return;
    }

    setJobActionId(jobId);
    try {
      const detail = await adminApi.retryAiJob(selectedThreadId, jobId);
      setSelectedThread(detail);
      setThreads((current) => upsertThread(current, detail));
      setWorkspaceError(null);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to retry job.");
    } finally {
      setJobActionId(null);
    }
  }

  async function handleCancelJob(jobId: string) {
    if (!selectedThreadId) {
      return;
    }

    setJobActionId(jobId);
    try {
      const detail = await adminApi.cancelAiJob(selectedThreadId, jobId);
      setSelectedThread(detail);
      setThreads((current) => upsertThread(current, detail));
      setWorkspaceError(null);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to cancel job.");
    } finally {
      setJobActionId(null);
    }
  }

  return (
    <div className="space-y-2 animate-in fade-in duration-500">
      <div className="-mt-2 flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => void loadThreads(selectedThreadId)}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button size="sm" onClick={() => void handleCreateThread()} disabled={creatingThread}>
          {creatingThread ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          New Thread
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => selectedThreadId && void loadThread(selectedThreadId)}
          disabled={loadingThread || !selectedThreadId}
        >
          {loadingThread ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Reload
        </Button>
        <Button variant="outline" size="sm" onClick={() => void handleArchiveThread()} disabled={archivingThread || !selectedThreadId}>
          {archivingThread ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Archive
        </Button>
      </div>

      {workspaceError ? (
        <Notice
          tone="warning"
          title="Workspace API needs attention"
          description={workspaceError}
        />
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[220px,minmax(0,1fr),280px] xl:items-stretch">
        <Card className="order-2 flex min-h-[320px] min-h-0 flex-col overflow-hidden border-border/70 bg-card/80 backdrop-blur-sm xl:order-1 xl:h-[calc(100vh-10rem)]">
          <CardHeader className="border-b border-border/70 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm">Threads</CardTitle>
                <CardDescription className="text-xs">Persistent conversations</CardDescription>
              </div>
              <Badge tone="neutral">{threads.length}</Badge>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search threads"
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-0">
            <div className="h-full overflow-y-auto">
              {loadingThreads ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="rounded-2xl border border-border/60 bg-background/40 p-4">
                      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                      <div className="mt-3 h-3 w-full animate-pulse rounded bg-muted" />
                      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              ) : filteredThreads.length > 0 ? (
                <div className="p-3">
                  {filteredThreads.map((thread) => {
                    const active = thread.id === selectedThreadId;
                    return (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => {
                          startTransition(() => {
                            setSelectedThreadId(thread.id);
                          });
                        }}
                        className={cn(
                          "mb-2 w-full rounded-xl border p-3 text-left transition-all",
                          active
                            ? "border-primary/50 bg-primary/10 shadow-[0_10px_30px_rgba(249,115,22,0.12)]"
                            : "border-border/60 bg-background/35 hover:border-primary/25 hover:bg-background/60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-foreground">{thread.title}</p>
                            <p className="mt-1 truncate text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                              {thread.scope.label}
                            </p>
                          </div>
                          <ThreadStatusBadge status={thread.status} />
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{thread.lastMessagePreview}</p>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{thread.messageCount} messages</span>
                          <span>{formatDate(thread.updatedAt)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
                  <div className="rounded-full border border-primary/20 bg-primary/10 p-4 text-primary">
                    <MessageSquareText className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-foreground">No threads yet</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Create a workspace thread for content generation, QA, or ops debugging.
                  </p>
                  <Button className="mt-5" onClick={() => void handleCreateThread()} disabled={creatingThread}>
                    <Plus className="h-4 w-4" />
                    Start Workspace
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="order-1 flex min-h-[82vh] min-h-0 flex-col overflow-hidden border-border/70 bg-card/75 backdrop-blur-sm shadow-[0_30px_90px_rgba(15,23,42,0.18)] xl:order-2 xl:h-[calc(100vh-10rem)]">
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.08),transparent_34%)] px-4 py-4 sm:px-5">
              {selectedThread ? (
                selectedThread.messages.length > 0 ? (
                  <div className="space-y-2.5 pb-3">
                    {selectedThread.messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                      >
                        <div className={cn("max-w-[94%] rounded-2xl border px-3 py-2.5 shadow-sm xl:max-w-[78%]", messageBubbleClassName(message))}>
                          <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                            {message.role === "assistant" ? <Bot className="h-3.5 w-3.5" /> : null}
                            {message.role === "tool" ? <Wrench className="h-3.5 w-3.5" /> : null}
                            <span>{message.authorLabel}</span>
                            <span>{formatDateTime(message.createdAt)}</span>
                          </div>
                          {message.content ? (
                            <p className="whitespace-pre-wrap text-[13px] leading-5 text-foreground/95">{message.content}</p>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Waiting for model output
                            </div>
                          )}
                          {message.errorMessage ? (
                            <p className="mt-2 text-xs text-danger">{message.errorMessage}</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full flex-col justify-center">
                    <div className="mx-auto max-w-3xl text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 text-primary shadow-[0_20px_45px_rgba(249,115,22,0.14)]">
                        <Sparkles className="h-8 w-8" />
                      </div>
                      <h3 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">PrimeScore admin copilot</h3>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        Use one workspace for content drafting, another for QA or policy checks, and keep the full job trace on the right.
                      </p>
                      <div className="mt-6 grid gap-3 text-left">
                        {quickPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => setComposer(prompt)}
                            className="rounded-2xl border border-border/70 bg-background/65 px-4 py-4 text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-background"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex h-full flex-col justify-center">
                  <div className="mx-auto max-w-2xl text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-border bg-background/70 text-muted-foreground">
                      <MessageSquareText className="h-7 w-7" />
                    </div>
                    <p className="mt-5 text-lg font-semibold text-foreground">Nothing selected</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Choose a thread from the left rail or create a fresh workspace for a new admin task.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-border/70 bg-background/95 p-3">
              <div className="rounded-2xl border border-border/70 bg-card/95 p-3 shadow-[0_12px_28px_rgba(10,10,10,0.18)]">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-muted-foreground">Enter sends, Shift+Enter adds a newline.</span>
                  <Button size="sm" onClick={() => void handleSendMessage()} disabled={sendingMessage || !composer.trim()}>
                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </Button>
                </div>
                <Textarea
                  value={composer}
                  onChange={(event) => setComposer(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder="Ask the admin copilot to draft, review, summarize, or inspect a failed job…"
                  rows={3}
                  className="max-h-36 min-h-[72px] resize-y border-0 bg-transparent px-1 py-1 text-[14px] leading-5 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="order-3 flex min-h-[320px] min-h-0 flex-col overflow-hidden border-border/70 bg-card/80 backdrop-blur-sm xl:order-3 xl:h-[calc(100vh-10rem)]">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <PanelRight className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm">Job Trace</CardTitle>
                <CardDescription className="text-xs">Tool steps and backend trace</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
            {selectedJob ? (
              <>
                <div className="shrink-0 rounded-2xl border border-border/70 bg-background/60 p-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-semibold leading-5 text-foreground">{selectedJob.title}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{selectedJob.summary}</p>
                    </div>
                    <JobStatusBadge status={selectedJob.status} />
                  </div>

                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/60 bg-card/70 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Job Type</p>
                      <p className="mt-1.5 break-words text-xs font-medium text-foreground">{titleCase(selectedJob.kind)}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card/70 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Model</p>
                      <p className="mt-1.5 break-all text-xs font-medium text-foreground">{selectedJob.model ?? "Pending backend"}</p>
                    </div>
                  </div>

                  {selectedJob.progress ? (
                    <div className="mt-2.5 rounded-xl border border-border/60 bg-card/70 p-2.5">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{selectedJob.progress.label}</span>
                        <span>
                          {selectedJob.progress.completedSteps}/{selectedJob.progress.totalSteps}
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${selectedJob.progress.totalSteps > 0
                              ? Math.min(100, (selectedJob.progress.completedSteps / selectedJob.progress.totalSteps) * 100)
                              : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDateTime(selectedJob.createdAt)}
                    </span>
                    {selectedJob.finishedAt ? <span>Finished {formatDateTime(selectedJob.finishedAt)}</span> : null}
                    {selectedJob.errorMessage ? <span className="break-words text-danger">{selectedJob.errorMessage}</span> : null}
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {selectedJob.status === "running" || selectedJob.status === "queued" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleCancelJob(selectedJob.id)}
                        disabled={jobActionId === selectedJob.id}
                      >
                        {jobActionId === selectedJob.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />}
                        Cancel Job
                      </Button>
                    ) : null}
                    {selectedJob.status === "failed" || selectedJob.status === "completed" || selectedJob.status === "cancelled" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleRetryJob(selectedJob.id)}
                        disabled={jobActionId === selectedJob.id}
                      >
                        {jobActionId === selectedJob.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Retry Job
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="mb-3 shrink-0 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Tool Steps</p>
                    <Badge tone="neutral">{selectedJob.traces.length}</Badge>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    {selectedJob.traces.length > 0 ? (
                      <div className="space-y-3">
                        {selectedJob.traces.map((trace) => (
                          <div key={trace.id} className="rounded-xl border border-border/70 bg-background/55 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold leading-5 text-foreground">{trace.label}</p>
                                <p className="mt-1 break-all text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{trace.toolName}</p>
                              </div>
                              <TraceStatusBadge status={trace.status} />
                            </div>

                            <div className="mt-2.5 space-y-2 text-xs text-muted-foreground">
                              {trace.inputSummary ? (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground">Input</p>
                                  <pre className="max-h-28 overflow-auto rounded-xl border border-border/60 bg-card/80 p-2.5 font-mono text-[11px] leading-5 whitespace-pre-wrap break-words text-muted-foreground">
                                    {trace.inputSummary}
                                  </pre>
                                </div>
                              ) : null}
                              {trace.outputSummary ? (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground">Output</p>
                                  <pre className="max-h-32 overflow-auto rounded-xl border border-border/60 bg-card/80 p-2.5 font-mono text-[11px] leading-5 whitespace-pre-wrap break-words text-muted-foreground">
                                    {trace.outputSummary}
                                  </pre>
                                </div>
                              ) : null}
                            </div>

                            <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                              {trace.startedAt ? <span>Started {formatDateTime(trace.startedAt)}</span> : null}
                              {trace.finishedAt ? <span>Finished {formatDateTime(trace.finishedAt)}</span> : null}
                              {formatDuration(trace.durationMs) ? <span>{formatDuration(trace.durationMs)}</span> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 p-4 text-sm leading-6 text-muted-foreground">
                        Tool traces will appear here after the backend starts reporting step-level execution.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <div className="rounded-full border border-border bg-background/70 p-4 text-muted-foreground">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <p className="mt-4 text-sm font-semibold text-foreground">No job selected</p>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Once a thread has a running or completed backend job, this panel will show model metadata, progress, and tool-level traces.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
