"use client";
import type { WritingSubmissionDetailPageScope } from "./controller";
import { AlertCircle, Badge, Card, CardContent, CardHeader, CardTitle, Clock, describeSubmissionStatus, formatSubmissionStatus } from "../dependencies";
import { Row, badgeToneForStatus, formatDateTime } from "../shared";

export function WritingSubmissionDetailPageSection2({ scope }: { scope: WritingSubmissionDetailPageScope }) {
  const { submission, evalData } = scope;
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <Card className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Essay</CardTitle>
                <Badge tone={badgeToneForStatus(submission.status)}>{formatSubmissionStatus(submission.status)}</Badge>
              </CardHeader>
              <CardContent>
                <pre className="text-sm whitespace-pre-wrap font-sans leading-7 text-foreground">
                  {submission.essay_text ?? ""}
                </pre>
              </CardContent>
            </Card>
    
            <div className="space-y-6">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Submission</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="User" value={submission.user_display_name || submission.user_username || submission.user_phone || submission.user_id.slice(0, 8)} />
                  <Row label="Words" value={String(submission.word_count)} />
                  <Row label="Time spent" value={
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {Math.round((submission.time_spent_seconds ?? 0) / 60)} min
                    </span>
                  } />
                  <Row label="Status" value={formatSubmissionStatus(submission.status)} />
                  <Row label="Submitted" value={formatDateTime(submission.submitted_at)} />
                  <Row label="Status note" value={describeSubmissionStatus(submission.status)} />
                  {submission.error_message ? (
                    <div className="flex items-start gap-2 text-xs text-danger pt-2">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {submission.error_message}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
    
              {evalData ? (
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base">Bands</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <Row label="Overall" value={<span className="text-lg font-bold text-primary">{evalData.overall_band}</span>} />
                    <Row label="Task achievement" value={String(evalData.task_achievement.band)} />
                    <Row label="Coherence & cohesion" value={String(evalData.coherence.band)} />
                    <Row label="Lexical resource" value={String(evalData.lexical.band)} />
                    <Row label="Grammar" value={String(evalData.grammar.band)} />
                    {evalData.potential_band != null ? (
                      <Row label="Potential" value={String(evalData.potential_band)} />
                    ) : null}
                    <Row label="Word count penalty" value={String(evalData.word_count_penalty)} />
                    <Row label="Graded" value={formatDateTime(evalData.graded_at)} />
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
  );
}
