import Link from "next/link";
import { ArrowRight, CheckCircle2, Globe2, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildSeoFaqStructuredData,
  buildSeoPageMetadata,
  buildSeoWebApplicationStructuredData,
  buildSeoWebPageStructuredData,
  getRelatedSeoPages,
  getSeoLandingPage,
  type SeoLandingPage,
} from "@/lib/seo-pages";

export const SEO_PAGE_REVALIDATE_SECONDS = 86400;

export function buildSeoRouteMetadata(slug: string) {
  return buildSeoPageMetadata(slug);
}

export function SeoPageRoute({ slug }: { slug: string }) {
  const page = getSeoLandingPage(slug);

  if (!page) {
    return null;
  }

  const structuredDataBlocks = [
    buildSeoWebPageStructuredData(page),
    buildSeoFaqStructuredData(page),
    buildSeoWebApplicationStructuredData(page),
  ];

  return (
    <>
      {structuredDataBlocks.map((payload, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
        />
      ))}

      <SeoLandingPageView page={page} />
    </>
  );
}

function SeoLandingPageView({ page }: { page: SeoLandingPage }) {
  const relatedPages = getRelatedSeoPages(page);

  return (
    <div className="relative mx-auto max-w-[1500px] overflow-hidden">
      <div className="pointer-events-none absolute left-[-12%] top-[-10%] h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[10%] right-[-14%] h-[24rem] w-[24rem] rounded-full bg-emerald-500/10 blur-[120px]" />

      <div className="relative z-10 px-4 py-12 sm:px-8 lg:px-12 lg:py-20">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.75fr)] lg:items-start">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              <Globe2 className="h-3.5 w-3.5" />
              {page.badge}
            </div>

            <div className="space-y-5">
              <h1 className="max-w-5xl text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {page.title}
              </h1>
              <p className="max-w-3xl text-base font-medium leading-8 text-muted-foreground sm:text-lg">
                {page.lead}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-2xl px-6 font-bold">
                <Link href={page.primaryCta.href}>
                  {page.primaryCta.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-2xl px-6 font-semibold">
                <Link href={page.secondaryCta.href}>{page.secondaryCta.label}</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {page.highlights.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card/70 p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="text-sm font-semibold leading-6 text-foreground/90">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-border/60 bg-card/80 p-5 shadow-2xl shadow-black/5 backdrop-blur">
            <div className="flex items-center gap-2 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
              <Search className="h-4 w-4" />
              What you can practice here
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {page.searchIntents.map((intent) => (
                <span
                  key={intent}
                  className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                >
                  {intent}
                </span>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Online practice</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Practice from home or anywhere else. No classroom schedule is required.
              </p>
            </div>
          </aside>
        </section>

        <section className="mt-16 grid gap-5 lg:grid-cols-3">
          {page.sections.map((section) => (
            <article key={section.title} className="rounded-[2rem] border border-border/50 bg-card/70 p-6 shadow-sm">
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{section.title}</h2>
              <p className="mt-3 text-sm font-medium leading-7 text-muted-foreground">{section.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-16 grid gap-10 border-t border-border/40 pt-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Why this helps</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
              Each IELTS section has its own clear path.
            </h2>
            <p className="mt-4 text-sm font-medium leading-7 text-muted-foreground">
              Choose full mock practice, Reading, Listening, Writing, or Speaking without digging through unrelated content.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {page.benefits.map((benefit) => (
              <div key={benefit} className="rounded-2xl border border-border/50 bg-background/60 p-4 text-sm font-semibold leading-6 text-foreground/90">
                {benefit}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 border-t border-border/40 pt-14">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Common questions</h2>
            <p className="mt-3 text-sm font-medium leading-7 text-muted-foreground">
              Short answers for students who want online IELTS mock practice without extra noise.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {page.faqs.map((item) => (
              <article key={item.question} className="rounded-[1.75rem] border border-border/50 bg-card/70 p-5">
                <h3 className="text-base font-semibold leading-6 text-foreground">{item.question}</h3>
                <p className="mt-3 text-sm font-medium leading-7 text-muted-foreground">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        {relatedPages.length ? (
          <section className="mt-16 border-t border-border/40 pt-14">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Related IELTS mock pages</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {relatedPages.map((related) => (
                <Link
                  key={related.slug}
                  href={related.path}
                  className="group rounded-[1.75rem] border border-border/50 bg-card/70 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{related.badge}</p>
                  <h3 className="mt-3 text-lg font-semibold leading-6 text-foreground">{related.title}</h3>
                  <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-muted-foreground">{related.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">
                    Open page <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
