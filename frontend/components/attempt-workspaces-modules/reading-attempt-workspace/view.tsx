"use client";
import type { ReadingAttemptWorkspaceScope } from "./controller";
import { ReadingAttemptWorkspaceView1 } from "./view-section-01";

export function ReadingAttemptWorkspaceView({ scope }: { scope: ReadingAttemptWorkspaceScope }) {
  return <ReadingAttemptWorkspaceView1 scope={scope} />;
}
