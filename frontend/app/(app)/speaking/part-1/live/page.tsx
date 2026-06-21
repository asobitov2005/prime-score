import { Suspense } from "react";

import { Part1LiveClient } from "./part-1-live-client";
import { Part1LiveLoadingState } from "@/components/speaking/part-1-live-view";

export const dynamic = "force-dynamic";

export default function SpeakingPart1LivePage() {
  return (
    <Suspense fallback={<Part1LiveLoadingState />}>
      <Part1LiveClient />
    </Suspense>
  );
}
