"use client";
import type { WritingTaskDetailPageScope } from "./controller";
import { Badge, Card, CardContent, CardHeader, CardTitle, Clock, ImageIcon, Loader2, RefreshCcw, Sparkles, buttonClassName, formatImageSummaryStatus, formatStatus, formatTaskType, writingApi } from "../dependencies";
import { badgeToneForStatus, badgeToneForSummary, formatDateTime } from "../shared";

export function WritingTaskDetailPageSection7({ scope }: { scope: WritingTaskDetailPageScope }) {
  const { task, minutes, performAction, actionLoading } = scope;
  return (
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
  );
}
