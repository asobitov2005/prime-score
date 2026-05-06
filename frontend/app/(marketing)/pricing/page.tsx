import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenText, Headphones, ShieldCheck, Sparkles } from "lucide-react";
import { PricingPlanGrid } from "@/components/marketing/pricing-plan-grid";
import { Button } from "@/components/ui/button";
import { getPublicPlans } from "@/lib/server-plans";
import {
  absoluteUrl,
  buildBreadcrumbStructuredData,
  buildOrganizationStructuredData,
  buildPricingFaqStructuredData,
  buildPricingOfferCatalogStructuredData,
  buildPricingWebPageStructuredData,
  buildWebsiteStructuredData,
  defaultOgImage,
  pricingFaqs,
  pricingKeywords,
} from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "PrimeScore Pricing for IELTS Mock Online Practice",
  description:
    "Compare PrimeScore one-time pricing plans for IELTS mock online practice, Reading and Listening tests, Writing feedback, premium tests, and answer explanations.",
  keywords: pricingKeywords,
  alternates: {
    canonical: absoluteUrl("/pricing"),
  },
  openGraph: {
    type: "website",
    url: absoluteUrl("/pricing"),
    title: "PrimeScore Pricing for IELTS Mock Online Practice",
    description:
      "See PrimeScore pricing plans for IELTS mock online preparation, premium tests, Writing feedback, and explanation access.",
    images: [
      {
        url: absoluteUrl(defaultOgImage),
        width: 1088,
        height: 944,
        alt: "PrimeScore pricing for IELTS preparation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PrimeScore Pricing for IELTS Mock Online Practice",
    description:
      "Choose a PrimeScore plan for IELTS mock online practice, premium tests, Writing feedback, and explanation access.",
    images: [absoluteUrl(defaultOgImage)],
  },
};

export default async function PricingPage() {
  const plans = await getPublicPlans();

  const structuredDataBlocks = [
    buildOrganizationStructuredData(),
    buildWebsiteStructuredData(),
    buildPricingWebPageStructuredData(),
    buildPricingFaqStructuredData(),
    buildBreadcrumbStructuredData([
      { name: "Home", path: "/" },
      { name: "Pricing", path: "/pricing" },
    ]),
    buildPricingOfferCatalogStructuredData(plans),
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

      <div className="relative isolate w-full overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_58%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-[24rem] h-[42rem] bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.08),transparent_52%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[28rem] bg-[radial-gradient(circle_at_bottom,hsl(var(--primary)/0.07),transparent_60%)]" />
        <div className="pointer-events-none absolute left-[-8rem] top-16 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
        <div className="pointer-events-none absolute right-[-10rem] top-[28rem] h-80 w-80 rounded-full bg-primary/10 blur-[140px]" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 pt-12 sm:px-6 lg:px-8 lg:pt-20 lg:pb-24">
          <div className="space-y-20 lg:space-y-24">
            <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div className="space-y-8">
                <div className="mt-2 animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out fill-mode-both">
                  <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-md backdrop-blur-sm">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                      One-Time Plans · No Auto-Renew
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-4xl text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1] flex flex-col">
                    <span>Upgrade Your</span>
                    <span className="bg-gradient-to-r from-primary/80 via-primary to-primary/60 bg-clip-text text-transparent pb-2">
                      IELTS Practice
                    </span>
                  </h1>
                  <p className="max-w-2xl text-base sm:text-lg font-medium leading-relaxed text-muted-foreground/90">
                    Unlock full IELTS mock practice online, track
                    <br className="hidden sm:block" />
                    <span className="sm:ml-0"> your progress, and practice under real exam conditions.</span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                  <Button asChild size="lg" className="w-full sm:w-auto h-14 px-10 text-base font-semibold shadow-xl shadow-primary/20 transition-all hover:scale-105 hover:-translate-y-1 rounded-2xl bg-primary text-background">
                    <Link href="/login">
                      Start Free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-14 px-10 text-base font-medium border-border/60 bg-background/50 backdrop-blur-sm hover:bg-muted/50 rounded-2xl transition-all hover:scale-105">
                    <Link href="/tests">
                      See Public Tests
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 lg:pt-1">
                <div className="relative w-full overflow-hidden rounded-[2rem] border border-primary/15 bg-card/85 p-5 shadow-[0_24px_60px_-28px_rgba(217,75,4,0.28)] backdrop-blur-xl">
                  <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                  <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-primary/12 blur-3xl pointer-events-none" />
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                      <BookOpenText className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">Free access stays useful</h2>
                  </div>
                  <p className="mt-2 text-sm md:text-[15px] font-medium leading-relaxed text-muted-foreground">
                    Public IELTS mock practice lets new users start immediately without paying first.
                  </p>
                </div>

                <div className="relative w-full overflow-hidden rounded-[2rem] border border-primary/15 bg-card/85 p-5 shadow-[0_24px_60px_-28px_rgba(217,75,4,0.28)] backdrop-blur-xl">
                  <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                  <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-primary/12 blur-3xl pointer-events-none" />
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 shadow-inner">
                      <Headphones className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">Premium unlocks more depth</h2>
                  </div>
                  <p className="mt-2 text-sm md:text-[15px] font-medium leading-relaxed text-muted-foreground">
                    Premium is for learners who want more premium tests and explanation-led review before exam day.
                  </p>
                </div>

                <div className="relative w-full overflow-hidden rounded-[2rem] border border-primary/15 bg-card/85 p-5 shadow-[0_24px_60px_-28px_rgba(217,75,4,0.28)] backdrop-blur-xl">
                  <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                  <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-primary/12 blur-3xl pointer-events-none" />
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 shadow-inner">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">Built around real timelines</h2>
                  </div>
                  <p className="mt-2 text-sm md:text-[15px] font-medium leading-relaxed text-muted-foreground">
                    Short plans fit a final sprint. Longer plans fit steady band improvement over multiple months.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-8 border-t border-border/30 pt-16">
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Compare Plans
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-[1.08]">
                  Choose the plan that matches your{" "}
                  <span className="bg-gradient-to-r from-primary/80 via-primary to-primary/60 bg-clip-text text-transparent">
                    target test date.
                  </span>
                </h2>
                <p className="max-w-2xl text-base sm:text-lg font-medium leading-relaxed text-muted-foreground">
                  Most IELTS learners start with free tests, then move to a premium plan when they want better review depth, more premium material, and a tighter prep schedule.
                </p>
              </div>

              <PricingPlanGrid plans={plans} />
            </section>

            <section className="border-t border-border/30 pt-16">
              <div className="mb-10 max-w-3xl space-y-4">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-[1.08]">
                  Pricing questions{" "}
                  <span className="bg-gradient-to-r from-primary/80 via-primary to-primary/60 bg-clip-text text-transparent">
                    students usually ask.
                  </span>
                </h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {pricingFaqs.map((item) => (
                  <div key={item.question} className="rounded-[2rem] border border-border/50 bg-card/80 p-6 shadow-sm">
                    <h3 className="text-base md:text-lg font-semibold tracking-tight text-foreground leading-snug">{item.question}</h3>
                    <p className="mt-3 text-[13px] md:text-sm font-medium leading-relaxed text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
