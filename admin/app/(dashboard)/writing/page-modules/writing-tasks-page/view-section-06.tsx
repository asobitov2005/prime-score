"use client";
import type { WritingTasksPageScope } from "./controller";
import { AdminTableLoadingSkeleton, Archive, Badge, Card, CardContent, Edit3, ImageIcon, ImageOff, Link, RefreshCcw, Trash2, Upload, buttonClassName, cn, formatImageSummaryStatus, formatStatus, formatTaskType, writingApi } from "../dependencies";
import { EmptyState, RowMenuButton, badgeToneForStatus, badgeToneForSummary, formatDateTime } from "../shared";

export function WritingTasksPageSection6({ scope }: { scope: WritingTasksPageScope }) {
  const { loading, tasks, hasFilters, clearFilters, actionId, runTaskAction, setDeleteConfirmId, deleteConfirmId, handleDelete } = scope;
  return (
    <Card className="rounded-2xl overflow-hidden">
            <CardContent className="overflow-x-auto p-0">
              {loading ? (
                <AdminTableLoadingSkeleton rows={6} columns={9} />
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
  );
}
