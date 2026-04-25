import { notFound } from "next/navigation";
import { ListeningAttemptWorkspace } from "@/components/attempt-workspaces";
import { buildAttemptWorkspaceMeta, getListeningPart, getTestById } from "@/lib/mock-data";
import { buildListeningPartFromSnapshot, mapSnapshotSections } from "@/lib/attempt-snapshot";
import { getBackendAttempt } from "@/lib/server-attempts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface ListeningAttemptPageProps {
  params: {
    attemptId: string;
  };
  searchParams?: {
    scope?: string;
    mode?: string;
    sectionId?: string;
  };
}

export default async function ListeningAttemptPage({ params, searchParams }: ListeningAttemptPageProps) {
  const { attemptId } = params;
  const backendAttempt = await getBackendAttempt(attemptId).catch(() => null);
  const scope = backendAttempt?.scope ?? (searchParams?.scope === "section" ? "section" : "full");
  const mode = backendAttempt?.mode ?? (searchParams?.mode === "exam" ? "exam" : "practice");
  const snapshotSections = backendAttempt?.test_snapshot ? mapSnapshotSections(backendAttempt.test_snapshot) : [];
  const test = getTestById(backendAttempt?.test_id ?? attemptId);
  const resolvedSections = snapshotSections.length > 0 ? snapshotSections : test?.sections ?? [];

  if (!test && resolvedSections.length === 0) {
    notFound();
  }

  const sectionId = backendAttempt?.section_id ?? searchParams?.sectionId ?? resolvedSections[0]?.id;
  const part = backendAttempt?.test_snapshot
    ? buildListeningPartFromSnapshot(backendAttempt.test_snapshot, sectionId ?? resolvedSections[0]?.id ?? "")
    : getListeningPart(sectionId ?? test?.sections[0].id ?? "");
  if (!part) {
    notFound();
  }
  const backendSection = backendAttempt?.test_snapshot?.sections?.find((section) => section.section_id === sectionId);
  const fallbackMeta = test ? buildAttemptWorkspaceMeta(test, scope, mode, sectionId) : {
    timeLimitSeconds: backendAttempt?.test_snapshot?.time_limit_seconds ?? 0,
    currentSectionId: sectionId ?? "",
    currentSectionTitle: backendSection?.title ?? part.title,
    currentSectionQuestionCount: backendSection?.question_count ?? part.questions.length
  };
  const meta = backendAttempt?.test_snapshot
    ? {
        timeLimitSeconds: backendAttempt.test_snapshot.time_limit_seconds,
        currentSectionId: sectionId,
        currentSectionTitle: backendSection?.title ?? part.title,
        currentSectionQuestionCount: backendSection?.question_count ?? part.questions.length
      }
    : fallbackMeta;

  return (
    <ListeningAttemptWorkspace
      attemptId={attemptId}
      testTitle={backendAttempt?.test_title ?? test?.title ?? "Listening attempt"}
      mode={mode}
      scope={scope}
      part={part}
      sections={resolvedSections}
      meta={meta}
      initialAnswers={backendAttempt?.answers ?? {}}
    />
  );
}
