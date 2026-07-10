"use client";
import type { Props } from "../shared";
import { useTestEditorWizardController } from "./controller";
import { TestEditorWizardView } from "./view";

export function TestEditorWizard(props: Props) {
  const scope = useTestEditorWizardController(props);
  return <TestEditorWizardView scope={scope} />;
}
