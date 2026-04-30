import { TestEditorWizard } from "@/components/test-editor-wizard";
import { getAdminTestDraft } from "@/lib/server-data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditTestPage({
  params
}: {
  params: { testId: string };
}) {
  const initialDraft = await getAdminTestDraft(params.testId);
  if (!initialDraft) {
    redirect("/tests");
  }
  return <TestEditorWizard mode="edit" testId={params.testId} initialDraft={initialDraft} />;
}
