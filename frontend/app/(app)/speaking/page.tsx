import Link from "next/link";
import { ArrowRight, Mic } from "lucide-react";

export default function SpeakingPage() {
  return (
    <section className="mx-auto flex min-h-[55vh] w-full max-w-3xl items-center justify-center py-8">
      <div className="w-full rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-9">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Speaking <span aria-hidden="true">·</span> Soon
        </span>
        <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Mic className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Speaking practice is coming soon
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          We are preparing the online IELTS Speaking experience. Reading, Listening, and Writing practice are available now.
        </p>
        <Link
          href="/tests"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Explore practice tests <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
