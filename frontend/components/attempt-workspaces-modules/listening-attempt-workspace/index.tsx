"use client";
import type { ListeningAttemptWorkspaceProps } from "../shared";
import { useListeningAttemptWorkspaceController } from "./controller";
import { ListeningAttemptWorkspaceView } from "./view";

export function ListeningAttemptWorkspace(props: ListeningAttemptWorkspaceProps) {
  const scope = useListeningAttemptWorkspaceController(props);
  return <ListeningAttemptWorkspaceView scope={scope} />;
}
