import { Suspense } from "react";

import { SpeakingSessionResultClient } from "./result-client";

export const dynamic = "force-dynamic";

interface SpeakingSessionResultPageProps {
  params: { sessionId: string };
}

function SpeakingSessionResultFallback() {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-[20px] border border-[#E5E7EB] bg-white">
      <p className="text-sm font-medium text-[#64748B]">Loading detailed feedback...</p>
    </div>
  );
}

export default function SpeakingSessionResultPage({ params }: SpeakingSessionResultPageProps) {
  return (
    <Suspense fallback={<SpeakingSessionResultFallback />}>
      <SpeakingSessionResultClient sessionId={params.sessionId} />
    </Suspense>
  );
}
