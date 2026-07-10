"use client";
import type { WritingSubmissionDetailPageScope } from "./controller";
import { AlertCircle, Badge, Card, CardContent, CardHeader, CardTitle, CheckCircle2, ChevronLeft, Clock, Link, Loader2, RefreshCcw, SectionHeader, buttonClassName, describeSubmissionStatus, formatSubmissionStatus, formatTaskType } from "../dependencies";
import { CriterionCard, Row, badgeToneForStatus, formatDateTime } from "../shared";
import { WritingSubmissionDetailPageSection2 } from "./view-section-02";
import { WritingSubmissionDetailPageSection3 } from "./view-section-03";

export function WritingSubmissionDetailPageView1({ scope }: { scope: WritingSubmissionDetailPageScope }) {
  const { submission, regrade, actionLoading, success, evalData } = scope;
  return (
    (
        <div className="space-y-6">
          <Link
            href="/writing/submissions"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to submissions
          </Link>
    
          <SectionHeader
            eyebrow={`${formatTaskType(submission.task_type)} · ${formatSubmissionStatus(submission.status)}`}
            title={submission.task_title || `Submission ${submission.id.slice(0, 8)}`}
            description={`${submission.word_count} words · submitted ${formatDateTime(submission.submitted_at)}`}
            actions={
              <div className="flex items-center gap-2">
                <Link
                  href={`/writing/${submission.task_id}`}
                  className={buttonClassName({ variant: "outline", size: "sm" })}
                >
                  View task
                </Link>
                <button
                  type="button"
                  onClick={() => void regrade()}
                  disabled={actionLoading}
                  className={buttonClassName({ variant: "solid", size: "sm" })}
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Regrade
                </button>
              </div>
            }
          />
    
          {success ? (
            <div className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/8 px-4 py-3 text-sm">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-success shrink-0" />
              <p>{success}</p>
            </div>
          ) : null}
    
          <WritingSubmissionDetailPageSection2 scope={scope} />
    
          {!evalData ? (
            <Card className="rounded-2xl border-dashed">
              <CardHeader>
                <CardTitle className="text-base">Evaluation state</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{describeSubmissionStatus(submission.status)}</p>
                {submission.error_message ? (
                  <div className="rounded-xl border border-danger/30 bg-danger/8 px-3 py-2 text-danger">
                    {submission.error_message}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
    
          <WritingSubmissionDetailPageSection3 scope={scope} />
    
          {evalData ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <CriterionCard title="Task Achievement" criterion={evalData.task_achievement} />
              <CriterionCard title="Coherence & Cohesion" criterion={evalData.coherence} />
              <CriterionCard title="Lexical Resource" criterion={evalData.lexical} />
              <CriterionCard title="Grammar" criterion={evalData.grammar} />
            </div>
          ) : null}
    
          {evalData?.inline_annotations?.length ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Inline Annotations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {evalData.inline_annotations.map((annotation, index) => (
                  <div key={`${annotation.offset}-${index}`} className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="warning">{annotation.category}</Badge>
                      <span className="font-semibold text-foreground">{annotation.original}</span>
                      {annotation.replacements?.[0] ? (
                        <span className="text-muted-foreground">→ {annotation.replacements[0]}</span>
                      ) : null}
                    </div>
                    {annotation.short_message ? <p className="mt-2 font-medium">{annotation.short_message}</p> : null}
                    {annotation.explanation ? <p className="mt-1 text-muted-foreground">{annotation.explanation}</p> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
    
          {evalData?.vocabulary_suggestions?.length ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Vocabulary Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {evalData.vocabulary_suggestions.map((item, index) => (
                  <div key={`${item.current_phrase}-${index}`} className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
                    <p className="font-semibold text-foreground">
                      {item.current_phrase} → {item.improved_phrase}
                    </p>
                    {item.why_it_works ? <p className="mt-1 text-muted-foreground">{item.why_it_works}</p> : null}
                    {item.example_sentence ? <p className="mt-2 text-xs text-muted-foreground">{item.example_sentence}</p> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
    
          {evalData?.roast ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Roast</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="font-semibold text-foreground">{evalData.roast.one_liner || evalData.roast.overall_roast}</p>
                {evalData.roast.savage_tips.length ? (
                  <ul className="space-y-2">
                    {evalData.roast.savage_tips.map((tip, index) => (
                      <li key={`${index}-${tip}`} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                        {tip}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {evalData.roast.pep_talk ? <p className="text-muted-foreground">{evalData.roast.pep_talk}</p> : null}
              </CardContent>
            </Card>
          ) : null}
    
          {evalData?.improved_version ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Improved Version</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm whitespace-pre-wrap font-sans leading-7 text-foreground">
                  {evalData.improved_version}
                </pre>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )
  );
}
