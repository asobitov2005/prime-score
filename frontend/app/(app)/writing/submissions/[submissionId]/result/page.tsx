import { getWritingSubmission, getWritingSubmissionResult } from "@/lib/server-writing";
import { WritingResultClient } from "./result-client";

export const dynamic = "force-dynamic";

interface WritingResultPageProps {
  params: { submissionId: string };
}

export default async function WritingResultPage({ params }: WritingResultPageProps) {
  let initialStatus: "queued" | "processing" | "completed" | "failed" = "queued";
  let initialErrorMessage: string | null = null;
  let initialResult = null;

  try {
    const submission = await getWritingSubmission(params.submissionId);
    const status = String(submission.status ?? "").toLowerCase();
    initialStatus = status === "completed" || status === "failed" ? (status as typeof initialStatus) : "processing";
    initialErrorMessage = submission.error_message ?? null;

    if (status === "completed") {
      initialResult = await getWritingSubmissionResult(params.submissionId).catch(() => null);
    }
  } catch {}

  return (
    <WritingResultClient
      submissionId={params.submissionId}
      initialStatus={initialStatus}
      initialErrorMessage={initialErrorMessage}
      initialResult={initialResult}
    />
  );
}
