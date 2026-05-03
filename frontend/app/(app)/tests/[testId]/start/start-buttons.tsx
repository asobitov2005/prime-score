"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { emitNavigationStart } from "@/lib/navigation-transition";

export function StartTestButton({
  testId,
  testType,
  mode,
  scope,
  sectionId,
  label,
  variant = "outline",
  className
}: {
  testId: string;
  testType: string;
  mode: string;
  scope: string;
  sectionId?: string;
  label: ReactNode;
  variant?: "outline" | "default";
  className?: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Button
      variant={variant}
      disabled={isSubmitting}
      className={cn("w-full h-12 font-bold shadow-sm transition-all", className)}
      onClick={async () => {
        try {
          setIsSubmitting(true);
          const response = await fetch("/api/attempts/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              testId,
              scope,
              mode,
              sectionId
            })
          });

          if (!response.ok) throw new Error("Failed to start.");
          const result = (await response.json()) as { attemptId: string };
          const resumeToken = Date.now();
          const href = testType === "reading"
            ? "/exam-preview/reading?attemptId=" + result.attemptId + "&mode=" + mode + "&resume=" + resumeToken
            : "/exam-preview/listening?attemptId=" + result.attemptId + "&mode=" + mode + "&resume=" + resumeToken;
          emitNavigationStart(href);
          router.push(href);
        } catch (err) {
           console.error(err);
           setIsSubmitting(false);
        }
      }}
    >
      {isSubmitting ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting...</>
      ) : (
        <>{label} <ArrowRight className="ml-2 h-4 w-4" /></>
      )}
    </Button>
  );
}
