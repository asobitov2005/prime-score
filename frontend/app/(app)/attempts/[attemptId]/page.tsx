import { redirect } from "next/navigation";
import { getBackendAttempt } from "@/lib/server-attempts";

interface AttemptIndexPageProps {
  params: {
    attemptId: string;
  };
  searchParams?: {
    type?: string;
  };
}

export default async function AttemptIndexPage({ params, searchParams }: AttemptIndexPageProps) {
  const { attemptId } = params;
  const query = searchParams;
  const backendAttempt = await getBackendAttempt(attemptId).catch(() => null);
  const type = backendAttempt?.test_type ?? (query?.type === "listening" ? "listening" : "reading");
  if (backendAttempt?.status === "completed" || backendAttempt?.status === "auto_submitted") {
    redirect(`/tests?type=${type}&refresh=${Date.now()}`);
  }
  redirect(`/attempts/${attemptId}/${type}`);
}
