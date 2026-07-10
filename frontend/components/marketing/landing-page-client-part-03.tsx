"use client";

import { CalendarDays, Check, LandingPricingPlanAction, MarketingPlan, Quote, Reveal, ReviewItem, Star, cn } from "./landing-page-client-dependencies";
import { Eyebrow, display } from "./landing-page-client-part-01";
import { getPricingFeatures, getPricingPlanStyles } from "./landing-page-client-part-02";

export // ── Pricing ─────────────────────────────────────────────────────────
function Pricing({ plans }: { plans: MarketingPlan[] }) {
  const pricingFeatures = getPricingFeatures();
  const planStyles = getPricingPlanStyles();
  const planSummaries = plans.map((plan) => ({ id: plan.id, durationDays: plan.durationDays }));

  return (
    <section id="pricing" className="relative isolate overflow-hidden border-t border-slate-100 bg-[#fbfcfe] px-2 py-24 dark:border-slate-900 dark:bg-slate-950 sm:px-3 sm:py-32">
      <div className="pointer-events-none absolute right-0 top-0 -z-10 h-80 w-80 bg-[radial-gradient(rgba(249,115,22,0.18)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom_left,black,transparent_76%)] dark:bg-[radial-gradient(rgba(249,115,22,0.14)_1px,transparent_1px)]" />
      <div className="mx-auto max-w-[86rem]">
        <Reveal className="mx-auto max-w-[86rem] text-center">
          <Eyebrow no="03">{"Pricing"}</Eyebrow>
          <h2 className="mx-auto mt-4 text-4xl font-bold tracking-[-0.02em] text-slate-950 dark:text-white sm:text-5xl xl:whitespace-nowrap">
            {"Choose the plan that fits your"} <span className="text-orange-500">{"IELTS goal"}</span>
          </h2>
          <p className="mx-auto mt-4 text-base leading-7 text-slate-500 dark:text-slate-400 sm:text-lg xl:whitespace-nowrap">
            {"Get full access to Mock Test, AI Feedback and smart analytics to improve with confidence."}
          </p>
        </Reveal>

        <div className="mt-14 grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-[1.12fr_repeat(3,minmax(0,1fr))]">
          <Reveal
            as="article"
            className="flex min-h-[31rem] flex-col rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-44px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/75 dark:shadow-black/25"
          >
            <div>
              <h3 className="text-xl font-bold tracking-[-0.01em] text-slate-950 dark:text-white">
                {"Everything you need to improve faster"}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {"Premium tools, real exam practice and AI insights - all in one place."}
              </p>
            </div>

            <ul className="mt-6 flex-1 divide-y divide-slate-100 dark:divide-slate-800">
              {pricingFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 py-2.5 text-sm font-medium leading-5 text-slate-700 dark:text-slate-300">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          {plans.length === 0 ? (
            <Reveal
              as="article"
              className="flex min-h-[31rem] flex-col justify-center rounded-[20px] border border-dashed border-slate-200 bg-white p-6 text-center shadow-[0_20px_60px_-44px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/75 dark:shadow-black/25 lg:col-span-3"
            >
              <h3 className="text-xl font-semibold tracking-[-0.01em] text-slate-950 dark:text-white">No active backend plans</h3>
              <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                Pricing cards are loaded from the backend. Add or activate public plans in admin to show them here.
              </p>
            </Reveal>
          ) : null}

          {plans.map((backendPlan, index) => {
            const plan = planStyles[index % planStyles.length];
            const featureItems = backendPlan.perks;

            return (
              <Reveal
                key={backendPlan.id}
                as="article"
                delay={(index + 1) * 90}
                className={cn(
                  "relative flex min-h-[31rem] flex-col rounded-[20px] border bg-white p-6 shadow-[0_20px_60px_-44px_rgba(15,23,42,0.35)] transition-all duration-500 hover:-translate-y-1 dark:bg-slate-900/75 dark:shadow-black/25",
                  backendPlan.isFeatured
                    ? "border-orange-300 shadow-[0_34px_80px_-42px_rgba(249,115,22,0.85)] ring-1 ring-orange-100 dark:border-orange-500/45 dark:ring-orange-500/20 dark:shadow-orange-950/25"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700",
                )}
              >
                {backendPlan.isFeatured ? (
                  <div className="absolute inset-x-6 -top-4 flex justify-center">
                    <span className="rounded-full bg-orange-500 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_16px_30px_-18px_rgba(249,115,22,0.9)]">
                      {backendPlan.badgeLabel}
                    </span>
                  </div>
                ) : null}

                <div className="pt-2 text-center">
                  <span className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-full ring-1", plan.iconClassName)}>
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  <h3 className="mt-6 text-2xl font-bold tracking-[-0.01em] text-slate-950 dark:text-white">{backendPlan.title}</h3>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{backendPlan.badgeLabel || `${backendPlan.durationDays} days`}</p>
                </div>

                <div className="mt-7 text-center">
                  <p className="text-[2.05rem] font-bold leading-none tracking-[-0.03em] text-slate-950 dark:text-white">{backendPlan.priceLabel}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-400 dark:text-slate-500">{backendPlan.monthlyLabel || `${backendPlan.durationDays} days`}</p>
                </div>

                <div className="mt-7">
                  <LandingPricingPlanAction
                    planId={backendPlan.id}
                    planName={backendPlan.title}
                    durationDays={backendPlan.durationDays}
                    numericPrice={backendPlan.numericPrice}
                    currency={backendPlan.currency}
                    isFeatured={backendPlan.isFeatured}
                    plans={planSummaries}
                    label={"Get Started"}
                    buttonClassName={plan.buttonClassName}
                  />
                </div>

                <ul className="mt-7 flex-1 space-y-3.5 border-t border-slate-100 pt-6 dark:border-slate-800">
                  {featureItems.length ? (
                    featureItems.map((feature) => (
                      <li key={feature} className="flex gap-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                        <Check className={cn("mt-0.5 h-4 w-4 shrink-0", plan.checkClassName)} />
                        <span>{feature}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                      Plan perks are not configured yet.
                    </li>
                  )}
                </ul>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export // ── Reviews ─────────────────────────────────────────────────────────
function Reviews({ reviews }: { reviews: ReviewItem[] }) {
  const visibleReviews = reviews.slice(0, 3);
  if (!visibleReviews.length) return null;

  // Build a seamless marquee loop (rendered twice → -50% keyframe wraps cleanly).
  const base = visibleReviews.length >= 3 ? visibleReviews : [...visibleReviews, ...visibleReviews];
  const loop = [...base, ...base];

  return (
    <section id="reviews" className="overflow-hidden bg-[#fffaf5] py-24 dark:bg-slate-900 sm:py-32">
      <div className="mx-auto max-w-[86rem] px-2 sm:px-3">
        <Reveal className="mx-auto max-w-[86rem] text-center">
          <Eyebrow no="04">{"Loved by learners"}</Eyebrow>
          <h2 className={cn(display.className, "mt-4 text-4xl font-bold tracking-[-0.02em] text-slate-900 dark:text-white sm:text-5xl xl:whitespace-nowrap")}>
            {"Practice with more"} <span className="text-orange-500">{"direction."}</span>
          </h2>
        </Reveal>
      </div>

      <div className="group relative mt-16 [mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)]">
        <div className="flex w-max animate-marquee gap-6 group-hover:[animation-play-state:paused]">
          {loop.map((review, index) => (
            <article
              key={`${review.name}-${index}`}
              className="flex w-[330px] shrink-0 flex-col rounded-3xl border border-slate-200/70 bg-white p-7 dark:border-slate-800 dark:bg-slate-950/50 sm:w-[360px]"
            >
              <Quote className="h-7 w-7 text-orange-200 dark:text-orange-500/40" />
              <p className="mt-4 line-clamp-4 flex-1 text-[15px] leading-7 text-slate-600 dark:text-slate-300">{review.text}</p>
              <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-semibold text-white">
                  {review.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{review.name}</p>
                  <p className="flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-500">
                    <Star className="h-3 w-3 fill-orange-400 text-orange-400" />
                    Band {review.band}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
