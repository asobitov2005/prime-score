"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { writingInputRejection } from "@/lib/writing-feedback";

export function WritingResultFailure({ message, onRetry, retrying }: {
  message: string | null;
  onRetry: () => void;
  retrying: boolean;
}) {
  const rejection = writingInputRejection(message);
  return (
    <section aria-labelledby="writing-failure-title" className="rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
      <AlertTriangle aria-hidden className="mx-auto h-6 w-6 text-amber-600 dark:text-amber-300" />
      <h1 id="writing-failure-title" className="mt-4 text-xl font-semibold">
        {rejection ? "This response needs a revision" : "We couldn't complete this review"}
      </h1>
      <p role="status" className="mx-auto mt-2 max-w-lg whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
        {rejection ?? (message || "Something went wrong while reviewing your essay. Please try again.")}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {rejection ? (
          <Button asChild><Link href="/writing">Write a new response<ArrowRight aria-hidden className="h-4 w-4" /></Link></Button>
        ) : (
          <>
            <Button onClick={onRetry} disabled={retrying}>
              {retrying ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
              Try again
            </Button>
            <Button asChild variant="outline"><Link href="/writing">Back to writing</Link></Button>
          </>
        )}
      </div>
    </section>
  );
}
