"use client";
import type { MicrophoneCheckClientScope } from "./controller";
import { MicrophoneCheckClientView1 } from "./view-section-01";

export function MicrophoneCheckClientView({ scope }: { scope: MicrophoneCheckClientScope }) {
  return <MicrophoneCheckClientView1 scope={scope} />;
}
