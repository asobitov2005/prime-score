"use client";
import type { UserDetailPageScope } from "./controller";
import { Badge, Card, CardContent, CardHeader, CardTitle, Link } from "../dependencies";
import { fmt, humanizeStatus, statusTone } from "../shared";

export function UserDetailPageSection12({ scope }: { scope: UserDetailPageScope }) {
  const { activityError, activity } = scope;
  return (
    <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Writing submissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activityError ? (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                  {activityError}
                </div>
              ) : activity?.writing_submissions.length ? (
                activity.writing_submissions.map((submission) => (
                  <div key={submission.id} className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/writing/submissions/${submission.id}`} className="font-semibold text-foreground hover:text-primary">
                          {submission.task_title}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{submission.task_type === "task_1" ? "Task 1" : "Task 2"}</span>
                          <span>{submission.word_count} words</span>
                          <span>{fmt(submission.submitted_at)}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={statusTone(submission.status)} className="text-[10px] uppercase font-black tracking-widest">
                          {humanizeStatus(submission.status)}
                        </Badge>
                        <Badge tone="neutral" className="text-[10px] uppercase font-black tracking-widest">
                          Band {submission.overall_band != null ? submission.overall_band.toFixed(1) : "—"}
                        </Badge>
                      </div>
                    </div>
                    {submission.error_message ? (
                      <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600">
                        {submission.error_message}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-border/60 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
                  Writing submissions topilmadi.
                </div>
              )}
            </CardContent>
          </Card>
  );
}
