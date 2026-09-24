"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppPageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section role="alert" className="rounded-lg border border-border bg-card p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-foreground">This page could not load</h1>
      <p className="mt-2 text-sm text-muted-foreground">Try again or use the menu to open another section.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline"><Link href="/dashboard">Back to dashboard</Link></Button>
      </div>
    </section>
  );
}
