import { notFound } from "next/navigation";
import { ReadingAttemptWorkspace } from "@/components/attempt-workspaces";
import { buildAttemptWorkspaceMeta, getReadingPassage, getTestById } from "@/lib/mock-data";
import { buildReadingPassageFromSnapshot, mapSnapshotSections } from "@/lib/attempt-snapshot";
import { getBackendAttempt } from "@/lib/server-attempts";

interface ReadingAttemptPageProps {
  params: {
    attemptId: string;
  };
  searchParams?: {
    scope?: string;
    mode?: string;
    sectionId?: string;
  };
}

export default async function ReadingAttemptPage({ params, searchParams }: ReadingAttemptPageProps) {
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
  const passage = backendAttempt?.test_snapshot
    ? buildReadingPassageFromSnapshot(backendAttempt.test_snapshot, sectionId ?? resolvedSections[0]?.id ?? "")
    : getReadingPassage(sectionId ?? test?.sections[0].id ?? "");
  if (!passage) {
    notFound();
  }
  const backendSection = backendAttempt?.test_snapshot?.sections?.find((section) => section.section_id === sectionId);
  const fallbackMeta = test ? buildAttemptWorkspaceMeta(test, scope, mode, sectionId) : {
    timeLimitSeconds: backendAttempt?.test_snapshot?.time_limit_seconds ?? 0,
    currentSectionId: sectionId ?? "",
    currentSectionTitle: backendSection?.title ?? passage.title,
    currentSectionQuestionCount: backendSection?.question_count ?? passage.questions.length
  };
  const meta = backendAttempt?.test_snapshot
    ? {
        timeLimitSeconds: backendAttempt.test_snapshot.time_limit_seconds,
        currentSectionId: sectionId,
        currentSectionTitle: backendSection?.title ?? passage.title,
        currentSectionQuestionCount: backendSection?.question_count ?? passage.questions.length
      }
    : fallbackMeta;

  return (
    <ReadingAttemptWorkspace
      attemptId={attemptId}
      testTitle={backendAttempt?.test_title ?? test?.title ?? "Reading attempt"}
      mode={mode}
      scope={scope}
      passage={passage}
      sections={resolvedSections}
      meta={meta}
    />
  );
}
