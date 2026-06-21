"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackTestStart } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { emitNavigationStart } from "@/lib/navigation-transition";
import { buildExamStartHref } from "@/lib/exam-start";

export function StartTestButton({
  testId,
  testTitle,
  testType,
  mode,
  scope,
  sectionId,
  label,
  variant = "outline",
  className
}: {
  testId: string;
  testTitle: string;
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
      onClick={() => {
        setIsSubmitting(true);
        trackTestStart({
          testId,
          testTitle,
          testType,
          mode,
          scope,
          sectionId,
        });
        const href = buildExamStartHref({ testType, testId, scope, mode, sectionId });
        emitNavigationStart(href);
        router.push(href);
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
