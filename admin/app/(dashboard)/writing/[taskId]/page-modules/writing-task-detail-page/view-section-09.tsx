"use client";
import type { WritingTaskDetailPageScope } from "./controller";
import { Card, CardContent, CardHeader, CardTitle } from "../dependencies";

export function WritingTaskDetailPageSection9({ scope }: { scope: WritingTaskDetailPageScope }) {
  const { task } = scope;
  return (
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
  );
}
