"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Loader2,
  RefreshCcw
} from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  SectionHeader,
  buttonClassName
} from "@/components/ui";
import type { WritingSubmission } from "@/lib/writing-api";
import {
  describeSubmissionStatus,
  formatSubmissionStatus,
  formatTaskType,
  writingApi
} from "@/lib/writing-api";

function formatDateTime(value: string | null | undefined): string {
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

function badgeToneForStatus(status: string): "neutral" | "success" | "warning" | "danger" {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return "success";
  if (normalized === "failed") return "danger";
  if (normalized === "queued" || normalized === "running" || normalized === "processing") return "warning";
  return "neutral";
}

export default function WritingSubmissionDetailPage({ params }: { params: { submissionId: string } }) {
  const [submission, setSubmission] = useState<WritingSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await writingApi.getSubmission(params.submissionId);
      setSubmission(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load submission.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [params.submissionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function regrade() {
    if (!submission) return;
    setActionLoading(true);
    try {
      await writingApi.regradeSubmission(submission.id);
      setSuccess("Regrade queued.");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Regrade failed.";
      setError(message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading submission…
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="space-y-4">
        <Link
          href="/writing/submissions"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to submissions
        </Link>
        <div className="rounded-2xl border border-danger/30 bg-danger/8 p-6 text-sm">
          <p className="font-semibold text-danger">Failed to load submission</p>
          <p className="opacity-90 mt-1">{error ?? "Submission not found."}</p>
        </div>
      </div>
    );
  }

  const evalData = submission.evaluation;

  return (
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

      {evalData ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Overall Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="leading-7 text-foreground">{evalData.overall_summary || "No summary available."}</p>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Next steps</p>
                {evalData.next_steps.length > 0 ? (
                  <ul className="space-y-2">
                    {evalData.next_steps.map((step, index) => (
                      <li key={`${index}-${step}`} className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                        {step}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No next steps saved.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Version Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Model" value={evalData.model_version || "—"} />
              <Row label="Prompt" value={evalData.prompt_version || "—"} />
              <Row label="Grader profile" value={String(evalData.grader_profile_version ?? "—")} />
              <Row label="Rubric" value={String(evalData.rubric_version ?? "—")} />
              <Row label="Anchors" value={String(evalData.anchor_set_version ?? "—")} />
              <Row label="Roast profile" value={String(evalData.roast_profile_version ?? "—")} />
              <Row label="Improver profile" value={String(evalData.improved_profile_version ?? "—")} />
              <Row label="Annotation profile" value={String(evalData.annotation_profile_version ?? "—")} />
            </CardContent>
          </Card>
        </div>
      ) : null}

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
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}

function CriterionCard({
  title,
  criterion
}: {
  title: string;
  criterion: NonNullable<WritingSubmission["evaluation"]>["task_achievement"];
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span>{title}</span>
          <span className="text-lg font-bold text-primary">{criterion.band}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="leading-7 text-foreground">{criterion.summary || "No summary saved."}</p>
        {criterion.strengths.length ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Strengths</p>
            <ul className="mt-2 space-y-2">
              {criterion.strengths.map((item, index) => (
                <li key={`${index}-${item}`} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {criterion.improvements.length ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Improvements</p>
            <ul className="mt-2 space-y-2">
              {criterion.improvements.map((item, index) => (
                <li key={`${index}-${item}`} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
