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
import { formatTaskType, writingApi } from "@/lib/writing-api";

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
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "queued" || status === "running") return "warning";
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
        eyebrow={`${formatTaskType(submission.task_type)} · ${submission.status}`}
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
            <Badge tone={badgeToneForStatus(submission.status)}>{submission.status}</Badge>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap font-sans leading-7 text-foreground">
              {submission.essay_text}
            </pre>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="User" value={submission.user_username || submission.user_email || submission.user_id.slice(0, 8)} />
              <Row label="Words" value={String(submission.word_count)} />
              <Row label="Time spent" value={
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {Math.round(submission.time_spent_seconds / 60)} min
                </span>
              } />
              <Row label="Submitted" value={formatDateTime(submission.submitted_at)} />
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
                <Row label="Task achievement" value={String(evalData.task_achievement_band)} />
                <Row label="Coherence & cohesion" value={String(evalData.coherence_band)} />
                <Row label="Lexical resource" value={String(evalData.lexical_band)} />
                <Row label="Grammar" value={String(evalData.grammar_band)} />
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
