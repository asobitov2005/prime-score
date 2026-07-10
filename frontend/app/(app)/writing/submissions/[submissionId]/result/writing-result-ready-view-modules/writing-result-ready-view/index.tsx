"use client";
import type { WritingResultReadyScope } from "../shared";
import { useWritingResultReadyViewController } from "./controller";
import { WritingResultReadyViewView } from "./view";

export function WritingResultReadyView(props: { scope: WritingResultReadyScope }) {
  const scope = useWritingResultReadyViewController(props);
  return <WritingResultReadyViewView scope={scope} />;
}
