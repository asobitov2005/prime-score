"use client";
import { useMicrophoneCheckClientController } from "./controller";
import { MicrophoneCheckClientView } from "./view";

export function MicrophoneCheckClient() {
  const scope = useMicrophoneCheckClientController();
  return <MicrophoneCheckClientView scope={scope} />;
}
