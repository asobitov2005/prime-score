import { WritingResultClient } from "./result-client";

export const dynamic = "force-dynamic";

interface WritingResultPageProps {
  params: { submissionId: string };
}

export default async function WritingResultPage({ params }: WritingResultPageProps) {
  return (
    <WritingResultClient
      submissionId={params.submissionId}
      initialStatus="queued"
      initialErrorMessage={null}
      initialResult={null}
    />
  );
}
