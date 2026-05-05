"use client";

import { useEffect } from "react";

import { trackAttemptResultView } from "@/lib/analytics";

export function ResultViewTracker(props: {
  attemptId: string;
  testId: string;
  testTitle: string;
  testType: string;
  testFormat?: string | null;
  rawScore?: number | null;
  totalQuestions?: number | null;
  bandScore?: string | number | null;
}) {
  useEffect(() => {
    trackAttemptResultView(props);
  }, [props]);

  return null;
}
