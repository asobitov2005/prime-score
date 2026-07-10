"use client";
import type { WritingTaskDetailPageScope } from "./controller";
import { Card, CardContent, CardHeader, CardTitle } from "../dependencies";

export function WritingTaskDetailPageSection8({ scope }: { scope: WritingTaskDetailPageScope }) {
  const { task } = scope;
  return (
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
  );
}
