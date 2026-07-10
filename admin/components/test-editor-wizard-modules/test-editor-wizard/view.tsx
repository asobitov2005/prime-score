"use client";
import type { TestEditorWizardScope } from "./controller";
import { TestEditorWizardView1 } from "./view-section-01";

export function TestEditorWizardView({ scope }: { scope: TestEditorWizardScope }) {
  return <TestEditorWizardView1 scope={scope} />;
}
