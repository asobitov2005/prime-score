"use client";
import type { BaseScope } from "./base";
import { AdminDetailLoadingSkeleton, ChevronLeft, Link, WritingSubmission, useCallback, useEffect, useState, writingApi } from "../dependencies";

export function useControllerPart1(scope: BaseScope) {
  const { params } = scope;
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
      return <AdminDetailLoadingSkeleton />;
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

  return { submission, setSubmission, loading, setLoading, error, setError, actionLoading, setActionLoading, success, setSuccess, load, regrade, evalData };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
