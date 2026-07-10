"use client";
import type { ListeningTranscriptPanelProps } from "../shared";
import { useListeningTranscriptPanelController } from "./controller";
import { ListeningTranscriptPanelView } from "./view";

export function ListeningTranscriptPanel(props: ListeningTranscriptPanelProps) {
  const scope = useListeningTranscriptPanelController(props);
  return <ListeningTranscriptPanelView scope={scope} />;
}
