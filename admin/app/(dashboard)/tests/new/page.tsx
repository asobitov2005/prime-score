import { TestEditorWizard } from "@/components/test-editor-wizard";
import { getAdminTestDraft } from "@/lib/server-data";

interface NewTestPageProps {
  searchParams: {
    type?: "reading" | "listening";
  };
}

export default async function NewTestPage({ searchParams }: NewTestPageProps) {
  const type = searchParams.type || "reading";
  const initialDraft = await getAdminTestDraft(undefined, type);
  return <TestEditorWizard mode="create" initialDraft={initialDraft ?? undefined} />;
}
