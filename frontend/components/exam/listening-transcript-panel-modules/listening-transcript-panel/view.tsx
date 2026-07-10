"use client";
import type { ListeningTranscriptPanelScope } from "./controller";
import { ListeningTranscriptPanelView1 } from "./view-section-01";

export function ListeningTranscriptPanelView({ scope }: { scope: ListeningTranscriptPanelScope }) {
  return <ListeningTranscriptPanelView1 scope={scope} />;
}
