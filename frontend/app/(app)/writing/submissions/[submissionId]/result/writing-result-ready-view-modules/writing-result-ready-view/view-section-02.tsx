"use client";
import type { WritingResultReadyViewScope } from "./controller";
import { ArrowRight, Badge, Button, Card, CardHeader, CardTitle, Link, formatDate } from "../dependencies";

export function WritingResultReadyViewSection2({ scope }: { scope: WritingResultReadyViewScope }) {
  const { result, taskBadgeLabel } = scope;
  return (
    <Card className="border-0 bg-transparent shadow-none">
                <CardHeader className="space-y-0.5 px-0 pb-0 pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-3">
                      <CardTitle className="text-3xl text-foreground">{result.task_title}</CardTitle>
                      <Badge tone="outline" className="border-border/70 bg-muted/40 text-foreground">
                        Writing · {taskBadgeLabel}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button asChild size="sm">
                        <Link href="/writing">
                          Try Another <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/writing/history">View history</Link>
                      </Button>
                    </div>
                  </div>
                  <p className="-mt-1 text-sm text-muted-foreground">
                    Submitted {formatDate(result.submitted_at)} · Graded {formatDate(result.graded_at)}
                  </p>
                </CardHeader>
              </Card>
  );
}
