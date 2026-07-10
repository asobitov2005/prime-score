"use client";
import type { WritingTaskFormProps } from "../shared";
import { useWritingTaskFormController } from "./controller";
import { WritingTaskFormView } from "./view";

export function WritingTaskForm(props: WritingTaskFormProps) {
  const scope = useWritingTaskFormController(props);
  return <WritingTaskFormView scope={scope} />;
}
