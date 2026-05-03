import { notFound } from "next/navigation";

import { getWritingSubmission, getWritingSubmissionResult } from "@/lib/server-writing";
import { WritingResultClient } from "./result-client";

export const dynamic = "force-dynamic";

interface WritingResultPageProps {
  params: { submissionId: string };
}

export default async function WritingResultPage({ params }: WritingResultPageProps) {
  const submissionId = params.submissionId;
  const submission = await getWritingSubmission(submissionId).catch(() => null);
  if (!submission) {
    notFound();
  }

  const status = String(submission.status ?? "").toLowerCase();
  let initialResult = null;
  if (status === "completed") {
    initialResult = await getWritingSubmissionResult(submissionId).catch(() => null);
  }

  return (
    <WritingResultClient
      submissionId={submissionId}
      initialStatus={submission.status}
      initialErrorMessage={submission.error_message ?? null}
      initialResult={initialResult}
    />
  );
}
