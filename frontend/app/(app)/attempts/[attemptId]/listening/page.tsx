import { redirect } from "next/navigation";

import { getBackendAttempt } from "@/lib/server-attempts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface ListeningAttemptPageProps {
  params: {
    attemptId: string;
  };
  searchParams?: {
    mode?: string;
  };
}

export default async function ListeningAttemptPage({ params, searchParams }: ListeningAttemptPageProps) {
  const backendAttempt = await getBackendAttempt(params.attemptId).catch(() => null);
  const mode = backendAttempt?.mode ?? (searchParams?.mode === "practice" ? "practice" : "exam");
  if (backendAttempt?.status === "completed" || backendAttempt?.status === "auto_submitted") {
    redirect(`/tests?type=listening&refresh=${Date.now()}`);
  }
  redirect(`/exam-preview/listening?attemptId=${params.attemptId}&mode=${mode}&resume=${Date.now()}`);
}
