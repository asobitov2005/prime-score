"use client";

import { Reveal, cn } from "./landing-page-client-dependencies";
import { Eyebrow, MiniBars, display, getFeatures, getSteps } from "./landing-page-client-part-01";

export // ── Features (bento) ────────────────────────────────────────────────
function Features() {
  const features = getFeatures();

  return (
    <section id="features" className="border-t border-slate-100 bg-white px-2 py-24 dark:border-slate-900 dark:bg-slate-950 sm:px-3 sm:py-32">
      <div className="mx-auto max-w-[86rem]">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow no="01">{"Why PrimeScore"}</Eyebrow>
          <h2 className={cn(display.className, "mt-4 text-4xl font-bold tracking-[-0.02em] text-slate-900 dark:text-white sm:text-5xl")}>
            {"Less noise. A clearer climb."}
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-5 lg:grid-cols-5">
          {features.map((feature, index) => {
            const Icon = feature.Icon;
            return (
              <Reveal
                key={feature.title}
                as="article"
                delay={index * 90}
                className={cn(
                  "group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-8 transition-all duration-500 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_40px_80px_-50px_rgba(249,115,22,0.5)] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-500/40",
                  feature.span,
                )}
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-orange-500/12 to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 dark:bg-orange-500/10 dark:text-orange-300">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="relative mt-6 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{feature.title}</h3>
                <p className="relative mt-3 text-[15px] leading-7 text-slate-500 dark:text-slate-400">{feature.body}</p>
                {feature.wide ? <MiniBars /> : null}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export // ── Steps ───────────────────────────────────────────────────────────
function Steps() {
  const steps = getSteps();

  return (
    <section id="how-it-works" className="relative overflow-hidden bg-[#fffaf5] px-2 py-24 dark:bg-slate-900 sm:px-3 sm:py-32">
      <div className="mx-auto max-w-[86rem]">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow no="02">{"How it works"}</Eyebrow>
          <h2 className={cn(display.className, "mt-4 text-4xl font-bold tracking-[-0.02em] text-slate-900 dark:text-white sm:text-5xl")}>
            {"Three steps, one path."}
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <Reveal
              key={step.no}
              delay={index * 120}
              className="relative overflow-hidden rounded-3xl border border-orange-100/70 bg-white/60 p-7 text-center backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-950/40 md:text-left"
            >
              <span className={cn(display.className, "pointer-events-none absolute -right-2 -top-4 select-none text-8xl font-extrabold leading-none text-orange-500/10 dark:text-orange-400/10")}>
                {step.no}
              </span>
              <div className="relative mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-base font-bold text-white shadow-[0_16px_36px_-20px_rgba(249,115,22,0.9)] md:mx-0">
                {step.no}
              </div>
              <h3 className="relative mt-6 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{step.title}</h3>
              <p className="relative mt-3 text-[15px] leading-7 text-slate-500 dark:text-slate-400">{step.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function getPricingFeatures() {
  return [
    "All premium Mock Test",
    "AI Writing Feedback",
    "Speaking Mock with AI Examiner",
    "Detailed analytics and progress tracking",
    "Review Mistakes",
    "Smart recommendations",
  ];
}

export function getPricingPlanStyles() {
  return [
    {
      iconClassName: "bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20",
      checkClassName: "text-blue-500 dark:text-blue-300",
      buttonClassName: "h-12 w-full rounded-xl border border-blue-200 bg-white text-sm font-semibold text-blue-700 shadow-none hover:border-blue-300 hover:bg-blue-50 dark:border-blue-500/30 dark:bg-slate-950 dark:text-blue-200 dark:hover:border-blue-400/50 dark:hover:bg-blue-500/10",
    },
    {
      iconClassName: "bg-orange-50 text-orange-600 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/25",
      checkClassName: "text-orange-500 dark:text-orange-300",
      buttonClassName: "h-12 w-full rounded-xl border border-orange-500 bg-orange-500 text-sm font-semibold text-white shadow-[0_16px_34px_-18px_rgba(249,115,22,0.9)] hover:bg-orange-600",
    },
    {
      iconClassName: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25",
      checkClassName: "text-emerald-500 dark:text-emerald-300",
      buttonClassName: "h-12 w-full rounded-xl border border-emerald-200 bg-white text-sm font-semibold text-emerald-700 shadow-none hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-slate-950 dark:text-emerald-200 dark:hover:border-emerald-400/50 dark:hover:bg-emerald-500/10",
    },
  ];
}
