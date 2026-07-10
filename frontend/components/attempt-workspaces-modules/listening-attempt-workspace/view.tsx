"use client";
import type { ListeningAttemptWorkspaceScope } from "./controller";
import { ListeningAttemptWorkspaceView1 } from "./view-section-01";

export function ListeningAttemptWorkspaceView({ scope }: { scope: ListeningAttemptWorkspaceScope }) {
  return <ListeningAttemptWorkspaceView1 scope={scope} />;
}
