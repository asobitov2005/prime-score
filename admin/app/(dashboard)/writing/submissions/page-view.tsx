"use client";

import Link from "next/link";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, PenSquare, RefreshCcw, Search, X } from "lucide-react";
import { Badge, Card, CardContent, SectionHeader, buttonClassName, cn } from "@/components/ui";
import { AdminTableLoadingSkeleton } from "@/components/loading-skeletons";
import { describeSubmissionStatus, formatSubmissionStatus, formatTaskType } from "@/lib/writing-api";
import { FilterDropdown, Toast, badgeToneForStatus, formatDateTime } from "./page-shared";
import type { WritingSubmissionsPageScope } from "./page-scope";

export function WritingSubmissionsPageView({ scope }: { scope: WritingSubmissionsPageScope }) {
  const { items, total, loading, error, statusFilter, setStatusFilter, taskIdFilter, setTaskIdFilter, userIdFilter, setUserIdFilter, page, setPage, actionId, toast, setToast, totalPages, hasFilters, clearFilters, regrade } = scope;
  return (
    (
        <div className="space-y-6">
          <Link
            href="/writing"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to writing tasks
          </Link>
    
          <SectionHeader
            eyebrow="Moderation"
            title="Writing Submissions"
            description="Review user submissions and trigger regrades."
          />
    
          <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm pb-4 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <FilterDropdown
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { id: "all", label: "All statuses" },
                  { id: "queued", label: "Queued" },
                  { id: "running", label: "Running" },
                  { id: "completed", label: "Completed" },
                  { id: "failed", label: "Failed" }
                ]}
              />
    
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  placeholder="Task ID…"
                  value={taskIdFilter}
                  onChange={(e) => setTaskIdFilter(e.target.value)}
                  className="h-9 w-56 pl-8 pr-3 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-all"
                />
              </div>
    
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  placeholder="User ID…"
                  value={userIdFilter}
                  onChange={(e) => setUserIdFilter(e.target.value)}
                  className="h-9 w-56 pl-8 pr-3 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-all"
                />
              </div>
    
              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-9 px-2.5 rounded-lg text-xs font-semibold text-danger hover:bg-danger/10 transition-colors flex items-center gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              ) : null}
    
              <div className="ml-auto">
                <Badge tone="neutral">
                  {total} {total === 1 ? "submission" : "submissions"}
                </Badge>
              </div>
            </div>
          </div>
    
          {error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 text-danger shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}
    
          <Card className="rounded-2xl overflow-hidden">
            <CardContent className="overflow-x-auto p-0">
              {loading ? (
                <AdminTableLoadingSkeleton rows={6} columns={8} />
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                  <div className="rounded-full bg-primary/10 p-5">
                    <PenSquare className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-base font-semibold">No submissions yet</p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Once students submit writing tasks, they will appear here for moderation.
                  </p>
                </div>
              ) : (
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.18em] text-muted-foreground bg-muted/30">
                      <th className="border-b border-border px-4 py-3 font-semibold">User</th>
                      <th className="border-b border-border px-3 py-3 font-semibold">Task</th>
                      <th className="border-b border-border px-3 py-3 font-semibold">Type</th>
                      <th className="border-b border-border px-3 py-3 font-semibold">Words</th>
                      <th className="border-b border-border px-3 py-3 font-semibold">Band</th>
                      <th className="border-b border-border px-3 py-3 font-semibold">Status</th>
                      <th className="border-b border-border px-3 py-3 font-semibold">Submitted</th>
                      <th className="border-b border-border px-3 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((s) => {
                      const acting = actionId === s.id;
                      return (
                        <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                          <td className="border-b border-border/50 px-4 py-3 text-sm">
                            <div className="font-medium">
                              {s.user_display_name || s.user_username || s.user_phone || s.user_id.slice(0, 8)}
                            </div>
                            {s.user_username || s.user_phone ? (
                              <div className="text-xs text-muted-foreground">
                                {[s.user_username ? `@${s.user_username}` : null, s.user_phone].filter(Boolean).join(" · ")}
                              </div>
                            ) : null}
                          </td>
                          <td className="border-b border-border/50 px-3 py-3 text-sm">
                            <Link
                              href={`/writing/${s.task_id}`}
                              className="font-medium text-foreground hover:text-primary transition-colors"
                            >
                              {s.task_title || s.task_id.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="border-b border-border/50 px-3 py-3">
                            <Badge tone="info" className="text-[10px] uppercase font-black tracking-widest">
                              {formatTaskType(s.task_type)}
                            </Badge>
                          </td>
                          <td className="border-b border-border/50 px-3 py-3 text-sm font-semibold">
                            {s.word_count}
                          </td>
                          <td className="border-b border-border/50 px-3 py-3 text-sm font-bold">
                            {s.overall_band ?? "—"}
                          </td>
                          <td className="border-b border-border/50 px-3 py-3">
                            <div className="space-y-1">
                              <Badge tone={badgeToneForStatus(s.status)}>{formatSubmissionStatus(s.status)}</Badge>
                              <div className="text-[11px] text-muted-foreground">
                                {describeSubmissionStatus(s.status)}
                              </div>
                              {s.error_message ? (
                                <div className="text-[11px] text-danger line-clamp-2">
                                  {s.error_message}
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td className="border-b border-border/50 px-3 py-3 text-xs text-muted-foreground">
                            {formatDateTime(s.submitted_at)}
                          </td>
                          <td className="border-b border-border/50 px-3 py-3">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/writing/submissions/${s.id}`}
                                className={buttonClassName({ variant: "outline", size: "sm" })}
                              >
                                View
                              </Link>
                              <button
                                type="button"
                                onClick={() => void regrade(s.id)}
                                disabled={acting}
                                className={cn(
                                  buttonClassName({ variant: "ghost", size: "sm" }),
                                  "disabled:opacity-50"
                                )}
                              >
                                {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                                Regrade
                              </button>
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
      )
  );
}
