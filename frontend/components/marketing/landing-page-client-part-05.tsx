"use client";

import { LandingFooter } from "./landing-page-client-dependencies";
import { Hero, LandingPageClientProps, Stats } from "./landing-page-client-part-01";
import { Features, Steps } from "./landing-page-client-part-02";
import { Pricing, Reviews } from "./landing-page-client-part-03";
import { FinalCta } from "./landing-page-client-part-04";

export function LandingPageClient({ plans, reviews, totalUsers, initialTests = [] }: LandingPageClientProps) {
  const publishedCount = initialTests.length;

  return (
    <main className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Hero />
      <Stats totalUsers={totalUsers} publishedCount={publishedCount} />
      <Features />
      <Steps />
      <Pricing plans={plans} />
      <Reviews reviews={reviews} />
      <FinalCta />
      <LandingFooter />
    </main>
  );
}
