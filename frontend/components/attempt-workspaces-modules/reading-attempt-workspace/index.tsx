"use client";
import type { ReadingAttemptWorkspaceProps } from "../shared";
import { useReadingAttemptWorkspaceController } from "./controller";
import { ReadingAttemptWorkspaceView } from "./view";

export function ReadingAttemptWorkspace(props: ReadingAttemptWorkspaceProps) {
  const scope = useReadingAttemptWorkspaceController(props);
  return <ReadingAttemptWorkspaceView scope={scope} />;
}
