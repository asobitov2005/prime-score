"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ImageIcon,
  ImageOff,
  Loader2,
  PenSquare,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Upload,
  X
} from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  SectionHeader,
  buttonClassName,
  cn
} from "@/components/ui";
import type {
  WritingTask,
  WritingTaskStatus,
  WritingTaskType
} from "@/lib/writing-api";
import {
  formatImageSummaryStatus,
  formatStatus,
  formatTaskType,
  writingApi
} from "@/lib/writing-api";

type StatusFilter = WritingTaskStatus | "all";
type TypeFilter = WritingTaskType | "all";

const PAGE_SIZE = 20;

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

function formatDateTime(value: string): string {
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

interface FilterDropdownOption {
  id: string;
  label: string;
}

function FilterDropdown({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: FilterDropdownOption[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.id === value);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "h-9 pl-3 pr-2 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all",
          value !== "all"
            ? "border-primary/40 bg-primary/5 text-primary"
            : "border-border bg-card text-foreground hover:bg-muted"
        )}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">
          {label}
        </span>
        {current?.label ?? "All"}
        <svg
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open ? (
        <div className="absolute top-full left-0 mt-1 w-44 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden py-1">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-sm text-left transition-colors flex items-center justify-between",
                value === opt.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {opt.label}
              {value === opt.id ? (
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RowMenuButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = "default"
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
        tone === "danger"
          ? "text-danger hover:bg-danger/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}

function Toast({ message, tone, onClose }: { message: string; tone: "success" | "danger"; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 3500);
    return () => window.clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg max-w-sm",
        tone === "success"
          ? "border-success/30 bg-success/10 text-foreground"
          : "border-danger/30 bg-danger/10 text-foreground"
      )}>
        {tone === "success" ? <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 text-danger mt-0.5 shrink-0" />}
        <div className="text-sm">{message}</div>
        <button type="button" onClick={onClose} className="ml-2 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function WritingTasksPage() {
  const [tasks, setTasks] = useState<WritingTask[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "danger" } | null>(null);

  // debounce search
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, statusFilter]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await writingApi.listTasks({
        status: statusFilter,
        task_type: typeFilter,
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch || undefined
      });
      setTasks(result.items);
      setTotal(result.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load tasks.";
      setError(message);
      setTasks([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, page, debouncedSearch]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters =
    typeFilter !== "all" || statusFilter !== "all" || debouncedSearch !== "";

  function clearFilters() {
    setTypeFilter("all");
    setStatusFilter("all");
    setSearch("");
  }

  async function runTaskAction(
    id: string,
    action: () => Promise<unknown>,
    successMsg: string
  ) {
    setActionId(id);
    try {
      await action();
      setToast({ message: successMsg, tone: "success" });
      await fetchTasks();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action failed.";
      setToast({ message, tone: "danger" });
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(id: string) {
    setActionId(id);
    try {
      await writingApi.deleteTask(id);
      setToast({ message: "Task deleted.", tone: "success" });
      setDeleteConfirmId(null);
      await fetchTasks();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed.";
      setToast({ message, tone: "danger" });
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Content Management"
        title="Writing Tasks"
        description="Manage AI Writing Checker prompts, diagrams, and reference answers."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/writing/submissions" className={buttonClassName({ variant: "ghost", size: "sm" })}>
              Submissions
            </Link>
            <Link href="/writing/new" className={buttonClassName({ variant: "solid", size: "sm" })}>
              <Plus className="h-4 w-4" />
              New Writing Task
            </Link>
          </div>
        }
      />

      {/* Toolbar */}
      <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm pb-4 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown
            label="Type"
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as TypeFilter)}
            options={[
              { id: "all", label: "All types" },
              { id: "task_1", label: "Task 1" },
              { id: "task_2", label: "Task 2" }
            ]}
          />
          <FilterDropdown
            label="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { id: "all", label: "All statuses" },
              { id: "draft", label: "Draft" },
              { id: "published", label: "Published" },
              { id: "archived", label: "Archived" }
            ]}
          />

          <div className="relative">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search className="h-4 w-4" />
            </div>
            <input
              placeholder="Search title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-56 pl-8 pr-3 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-all"
            />
          </div>

          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="h-9 px-2.5 rounded-lg text-xs font-semibold text-danger hover:bg-danger/10 transition-colors flex items-center gap-1.5"
              title="Clear all filters"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          ) : null}

          <div className="ml-auto">
            <Badge tone="neutral">
              {total} {total === 1 ? "task" : "tasks"}
            </Badge>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 text-danger shrink-0" />
          <div>
            <p className="font-semibold text-danger">Failed to load</p>
            <p className="opacity-90">{error}</p>
          </div>
        </div>
      ) : null}

      <Card className="rounded-2xl overflow-hidden">
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading writing tasks…
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
          ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-muted-foreground bg-muted/30">
                  <th className="border-b border-border px-4 py-3 font-semibold">Title</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Type</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Status</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Difficulty</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Word min</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Image</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Summary</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Created</th>
                  <th className="border-b border-border px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const acting = actionId === task.id;
                  return (
                    <tr key={task.id} className="align-top hover:bg-muted/20 transition-colors">
                      <td className="border-b border-border/50 px-4 py-4 max-w-md">
                        <Link
                          href={`/writing/${task.id}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors"
                        >
                          {task.title}
                        </Link>
                        {task.source ? (
                          <p className="mt-1 text-xs text-muted-foreground">{task.source}</p>
                        ) : null}
                      </td>
                      <td className="border-b border-border/50 px-3 py-4">
                        <Badge tone="info" className="text-[10px] uppercase font-black tracking-widest">
                          {formatTaskType(task.task_type)}
                        </Badge>
                      </td>
                      <td className="border-b border-border/50 px-3 py-4">
                        <Badge tone={badgeToneForStatus(task.status)} className="text-[10px] uppercase font-black tracking-widest">
                          {formatStatus(task.status)}
                        </Badge>
                      </td>
                      <td className="border-b border-border/50 px-3 py-4 text-xs uppercase font-semibold text-muted-foreground">
                        {task.difficulty}
                      </td>
                      <td className="border-b border-border/50 px-3 py-4 text-sm font-semibold">
                        {task.word_minimum}
                      </td>
                      <td className="border-b border-border/50 px-3 py-4">
                        {task.image_url ? (
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-success/10 text-success">
                            <ImageIcon className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <ImageOff className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </td>
                      <td className="border-b border-border/50 px-3 py-4">
                        <Badge tone={badgeToneForSummary(task.image_summary_status)}>
                          {formatImageSummaryStatus(task.image_summary_status)}
                        </Badge>
                      </td>
                      <td className="border-b border-border/50 px-3 py-4 text-xs text-muted-foreground">
                        {formatDateTime(task.created_at)}
                      </td>
                      <td className="border-b border-border/50 px-3 py-4">
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex flex-wrap justify-end gap-1">
                            <Link
                              href={`/writing/${task.id}/edit`}
                              className={buttonClassName({ variant: "outline", size: "sm" })}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Edit
                            </Link>
                            {task.status !== "published" ? (
                              <RowMenuButton
                                icon={Upload}
                                label="Publish"
                                disabled={acting}
                                onClick={() =>
                                  runTaskAction(task.id, () => writingApi.publishTask(task.id), "Task published.")
                                }
                              />
                            ) : null}
                            {task.status !== "archived" ? (
                              <RowMenuButton
                                icon={Archive}
                                label="Archive"
                                disabled={acting}
                                onClick={() =>
                                  runTaskAction(task.id, () => writingApi.archiveTask(task.id), "Task archived.")
                                }
                              />
                            ) : null}
                            {task.task_type === "task_1" && task.image_url ? (
                              <RowMenuButton
                                icon={RefreshCcw}
                                label="Regen summary"
                                disabled={acting}
                                onClick={() =>
                                  runTaskAction(
                                    task.id,
                                    () => writingApi.regenerateImageSummary(task.id),
                                    "Summary regeneration started."
                                  )
                                }
                              />
                            ) : null}
                            <RowMenuButton
                              icon={Trash2}
                              label="Delete"
                              tone="danger"
                              disabled={acting}
                              onClick={() =>
                                setDeleteConfirmId((curr) => (curr === task.id ? null : task.id))
                              }
                            />
                          </div>
                          {deleteConfirmId === task.id ? (
                            <div className="w-[260px] rounded-xl border border-danger/20 bg-danger/5 p-3 text-left">
                              <p className="text-sm font-semibold text-foreground">Delete this task?</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                This cannot be undone. Tasks with submissions cannot be deleted.
                              </p>
                              <div className="mt-3 flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className={buttonClassName({ variant: "ghost", size: "sm" })}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(task.id)}
                                  disabled={acting}
                                  className={cn(
                                    buttonClassName({ variant: "danger", size: "sm" }),
                                    "disabled:opacity-60"
                                  )}
                                >
                                  {acting ? "Deleting…" : "Delete"}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={buttonClassName({ variant: "outline", size: "sm" })}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={buttonClassName({ variant: "outline", size: "sm" })}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function EmptyState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="rounded-full bg-muted p-4">
          <Search className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-base font-semibold">No tasks match these filters</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Try adjusting your search or clearing the filters.
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className={buttonClassName({ variant: "outline", size: "sm" })}
        >
          Clear filters
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="rounded-full bg-primary/10 p-5">
        <PenSquare className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-bold">Build your first writing task</p>
        <p className="text-sm text-muted-foreground max-w-md">
          Create Task 1 (chart description) or Task 2 (essay) prompts. Students will see them in the AI Writing Checker.
        </p>
      </div>
      <Link href="/writing/new" className={buttonClassName({ variant: "solid", size: "md" })}>
        <Plus className="h-4 w-4" />
        Create your first writing task
      </Link>
    </div>
  );
}
