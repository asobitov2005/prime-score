import { redirect } from "next/navigation";

import { getBackendAttempt } from "@/lib/server-attempts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface ReadingAttemptPageProps {
  params: {
    attemptId: string;
  };
  searchParams?: {
    mode?: string;
  };
}

export default async function ReadingAttemptPage({ params, searchParams }: ReadingAttemptPageProps) {
  const backendAttempt = await getBackendAttempt(params.attemptId).catch(() => null);
  const mode = backendAttempt?.mode ?? (searchParams?.mode === "practice" ? "practice" : "exam");
  redirect("/exam-preview/reading?attemptId=" + params.attemptId + "&mode=" + mode + "&resume=" + Date.now());
}
