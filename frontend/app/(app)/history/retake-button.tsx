"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { AttemptMode, TestType } from "@/lib/types";

interface HistoryRetakeButtonProps {
  testId: string;
  testType: TestType;
  mode: AttemptMode;
}

export function HistoryRetakeButton({ testId, testType, mode }: HistoryRetakeButtonProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  async function retake() {
    try {
      setIsStarting(true);
      const response = await fetch("/api/attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          scope: "full",
          mode,
          forceNew: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Retake start failed.");
      }

      const result = (await response.json()) as { attemptId: string };
      const resumeToken = Date.now();
      if (testType === "reading") {
        router.push(`/exam-preview/reading?attemptId=${result.attemptId}&mode=${mode}&resume=${resumeToken}`);
        return;
      }

      router.push(`/attempts/${result.attemptId}/${testType}?resume=${resumeToken}`);
    } catch (error) {
      console.error(error);
      setIsStarting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isStarting}
      onClick={retake}
      className="h-8 rounded-xl border-border/60 bg-background px-3 text-[11px] font-bold text-foreground shadow-sm hover:bg-muted/40"
    >
      {isStarting ? "Starting..." : "Retake"}
    </Button>
  );
}
