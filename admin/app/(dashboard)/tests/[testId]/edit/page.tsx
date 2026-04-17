import { TestEditorWizard } from "@/components/test-editor-wizard";
import { getAdminTestDraft } from "@/lib/server-data";

export default async function EditTestPage({
  params
}: {
  params: { testId: string };
}) {
  const initialDraft = await getAdminTestDraft(params.testId);
  return <TestEditorWizard mode="edit" testId={params.testId} initialDraft={initialDraft} />;
}
