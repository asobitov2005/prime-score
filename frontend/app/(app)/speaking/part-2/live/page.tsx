import { Suspense } from "react";

import { Part2LiveClient } from "./part-2-live-client";
import { Part2LiveLoadingState } from "@/components/speaking/part-2-live-view";

export const dynamic = "force-dynamic";

export default function SpeakingPart2LivePage() {
  return (
    <Suspense fallback={<Part2LiveLoadingState />}>
      <Part2LiveClient />
    </Suspense>
  );
}
