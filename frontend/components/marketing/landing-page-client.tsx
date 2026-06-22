"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Sora } from "next/font/google";
import {
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  Check,
  Clock,
  Crown,
  Gauge,
  Heart,
  LineChart,
  MapPinned,
  MessageCircle,
  Quote,
  Sparkles,
  Star,
} from "lucide-react";
import { LandingPricingPlanAction } from "@/components/marketing/landing-pricing-auth";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { MarketingAuthCta } from "@/components/marketing/marketing-auth-cta";
import { CountUp, DeviceShowcase, Reveal } from "@/components/marketing/landing-motion";
import type { LandingFeaturedTest, ReviewItem } from "@/components/marketing/landing-types";
import type { MarketingPlan } from "@/lib/server-plans";
import { cn } from "@/lib/utils";

const display = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

interface LandingPageClientProps {
  plans: MarketingPlan[];
  reviews: ReviewItem[];
  totalUsers: number;
  initialTests?: LandingFeaturedTest[];
}

// Numbered section eyebrow for a consistent editorial rhythm.
function Eyebrow({ no, children }: { no: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <span className="font-mono text-xs font-semibold text-orange-400/80 dark:text-orange-300/80">{no}</span>
      <span className="h-px w-7 bg-gradient-to-r from-orange-400 to-orange-400/0 dark:from-orange-300" />
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500 dark:text-orange-300">{children}</span>
    </div>
  );
}

// Decorative rising bars used inside large feature cards.
function MiniBars() {
  return (
    <div className="mt-6 flex h-12 items-end gap-1.5 opacity-70" aria-hidden="true">
      {[40, 62, 52, 78, 70, 92].map((h, i) => (
        <div
          key={i}
          className="w-2.5 rounded-full bg-gradient-to-t from-orange-500/70 to-amber-400/70 dark:from-orange-500/60 dark:to-amber-400/60"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function getFeatures() {
  return [
  {
    Icon: BrainCircuit,
    title: "AI Band Estimate",
    body: "Finish a test and get an honest predicted band with the exact reason behind every lost mark.",
    span: "lg:col-span-3",
    wide: true,
  },
  {
    Icon: Gauge,
    title: "Targeted practice",
    body: "We surface the one skill dragging you down and route you straight into the right set.",
    span: "lg:col-span-2",
    wide: false,
  },
  {
    Icon: LineChart,
    title: "Progress you can read",
    body: "Band movement, timing, and weak topics in one calm view - the next step is never a mystery.",
    span: "lg:col-span-2",
    wide: false,
  },
  {
    Icon: Sparkles,
    title: "Real exam feel",
    body: "Computer-delivered layout, timing, and scoring that mirror the test day experience.",
    span: "lg:col-span-3",
    wide: true,
  },
  ];
}

function getSteps() {
  return [
    { no: "01", title: "Diagnose", body: "A short exam-style test places your current band across all four skills." },
    { no: "02", title: "Practice", body: "Move into the exact area holding you back, guided from the same path." },
    { no: "03", title: "Rise", body: "Review scores and weak topics, then repeat toward a clear target." },
  ];
}

// ── Hero ────────────────────────────────────────────────────────────
function Hero() {
  const titleSuffix = "";

  return (
    <section className="relative isolate overflow-hidden bg-white px-2 pb-24 pt-14 dark:bg-slate-950 sm:px-3 sm:pb-32 sm:pt-20">
      {/* aurora background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-aurora absolute -left-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.26),transparent_62%)] dark:bg-[radial-gradient(circle,rgba(249,115,22,0.22),transparent_62%)]" />
        <div className="animate-aurora-slow absolute -right-32 top-10 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.24),transparent_62%)] dark:bg-[radial-gradient(circle,rgba(251,191,36,0.16),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(15,23,42,0.05)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] dark:bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,white_88%)] dark:bg-[linear-gradient(to_bottom,transparent,#020617_88%)]" />
      </div>

      <div className="mx-auto grid max-w-[86rem] items-center gap-12 lg:grid-cols-2 lg:gap-10">
        {/* LEFT: copy */}
        <div className="text-center lg:text-left">
          <Reveal as="div" className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50/80 px-3.5 py-1.5 text-[13px] font-medium text-orange-600 shadow-sm backdrop-blur dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300">
            <span className="premium-live-dot" />
            {"FREE ONLINE IELTS MOCK TESTS"}
          </Reveal>

          <Reveal
            as="div"
            delay={80}
            className={cn(
              display.className,
              "mt-6 text-[2.6rem] font-extrabold leading-[1.03] tracking-[-0.03em] text-slate-900 dark:text-white sm:text-[3.6rem]",
            )}
          >
            <h1>
              {"Prepare for IELTS"}{" "}
              <span className="text-orange-500">
                {"Computer-Based Test"}
              </span>
              {titleSuffix ? <> {titleSuffix}</> : null}
            </h1>
          </Reveal>

          <Reveal as="div" delay={160}>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-500 dark:text-slate-400 lg:mx-0">
              {"Take a free diagnostic, see exactly where you lose marks, and practice with AI Feedback - on any device, with every next step crystal clear."}
            </p>
          </Reveal>

          <Reveal as="div" delay={240} className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:items-start lg:justify-start">
            <MarketingAuthCta
              guestLabel={"Start free diagnostic"}
              authLabel={"Go to dashboard"}
              className="animate-sheen relative h-14 overflow-hidden rounded-full bg-orange-500 px-7 text-[15px] font-semibold text-white shadow-[0_24px_50px_-18px_rgba(249,115,22,0.85)] transition-all hover:-translate-y-0.5 hover:bg-orange-600"
            />
            <Link
              href="#pricing"
              className="group flex h-14 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/70 px-7 text-[15px] font-semibold text-slate-800 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:text-orange-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:border-orange-500/40 dark:hover:text-orange-300"
            >
              {"View plans"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Reveal>

        </div>

        {/* RIGHT: device showcase */}
        <Reveal as="div" delay={220} className="mt-4 lg:mt-0">
          <DeviceShowcase />
        </Reveal>
      </div>
    </section>
  );
}

// ── Stats ───────────────────────────────────────────────────────────
function Stats({ totalUsers, publishedCount }: { totalUsers: number; publishedCount: number }) {
  const users = Math.max(0, totalUsers);
  const published = publishedCount > 0 ? publishedCount : 120;

  const items = [
    { node: <CountUp to={users} />, label: "users total" },
    { node: <CountUp to={published} suffix="+" />, label: "Mock Test" },
    { node: <span>4</span>, label: "IELTS skills" },
    { node: <span>7.0+</span>, label: "Band target" },
  ];

  return (
    <section className="bg-white px-2 dark:bg-slate-950 sm:px-3">
      <div className="mx-auto max-w-[86rem]">
        <Reveal className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-200/70 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="bg-white px-6 py-8 text-center dark:bg-slate-900">
              <div className={cn(display.className, "text-4xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white sm:text-5xl")}>
                {item.node}
              </div>
              <p className="mt-2 text-[12px] font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{item.label}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

// ── Features (bento) ────────────────────────────────────────────────
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

// ── Steps ───────────────────────────────────────────────────────────
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

function getPricingFeatures() {
  return [
    "All premium Mock Test",
    "AI Writing Feedback",
    "Speaking Mock with AI Examiner",
    "Detailed analytics and progress tracking",
    "Review Mistakes",
    "Smart recommendations",
  ];
}

function getPricingPlanStyles() {
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

// ── Pricing ─────────────────────────────────────────────────────────
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

// ── Reviews ─────────────────────────────────────────────────────────
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

function FloatingProductPreviewCards() {
  const progressRows = [
    { label: "Task response", value: 78 },
    { label: "Timing", value: 64 },
    { label: "Vocabulary", value: 86 },
  ];
  const chartBars = [38, 48, 44, 57, 66, 74, 86];
  const skills = [
    { label: "R", value: "8.5" },
    { label: "L", value: "8.0" },
    { label: "W", value: "7.5" },
    { label: "S", value: "8.0" },
  ];
  const weakAreas = [
    {
      Icon: Clock,
      title: "Timing",
      text: "Work on answering more within time",
      badge: "Focus",
      iconClassName: "bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-300",
    },
    {
      Icon: MessageCircle,
      title: "Cohesion",
      text: "Improve linking of ideas",
      badge: "Improve",
      iconClassName: "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    {
      Icon: MapPinned,
      title: "Map labels",
      text: "Practice labeling key features",
      badge: "Practice",
      iconClassName: "bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300",
    },
  ];

  return (
    <div className="relative isolate overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-50 to-orange-50/45 p-4 dark:from-slate-950 dark:to-slate-900 sm:p-6">
      <div className="pointer-events-none absolute left-10 top-14 -z-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.2),transparent_68%)] blur-sm dark:bg-[radial-gradient(circle,rgba(249,115,22,0.16),transparent_68%)]" />
      <div className="pointer-events-none absolute bottom-10 right-12 -z-10 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.14),transparent_70%)] blur-sm dark:bg-[radial-gradient(circle,rgba(16,185,129,0.1),transparent_70%)]" />
      <div className="pointer-events-none absolute right-8 top-8 -z-10 h-40 w-40 bg-[radial-gradient(rgba(249,115,22,0.22)_1px,transparent_1px)] opacity-60 [background-size:14px_14px] dark:bg-[radial-gradient(rgba(249,115,22,0.16)_1px,transparent_1px)]" />
      <div className="pointer-events-none absolute -bottom-8 left-8 -z-10 h-28 w-64 rounded-[100%] border-t border-orange-200/70 dark:border-orange-500/20" />
      <div className="pointer-events-none absolute -right-8 top-32 -z-10 h-32 w-72 rounded-[100%] border-t border-emerald-200/60 dark:border-emerald-500/20" />

      <div className="relative z-10 grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <div className="grid gap-4">
          <article className="rounded-[22px] border border-orange-100 bg-white p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.55)] dark:border-orange-500/25 dark:bg-slate-900 dark:shadow-black/30">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{"Overall Band Score"}</p>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div className="flex items-end gap-2">
                <span className="text-6xl font-black leading-none tracking-[-0.05em] text-slate-950 dark:text-white">8.0</span>
                <span className="mb-2 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-black text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">+0.5</span>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">{"Good"}</span>
            </div>
            <div className="mt-6 space-y-3">
              {progressRows.map((row) => (
                <div key={row.label}>
                  <div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>{row.label}</span>
                    <span>{row.value}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-orange-500" style={{ width: `${row.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{"Skill breakdown"}</p>
            <div className="mt-5 grid grid-cols-4 gap-3">
              {skills.map((skill) => (
                <div key={skill.label} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-[5px] border-orange-200 bg-white text-sm font-black text-slate-950 dark:border-orange-500/35 dark:bg-slate-950 dark:text-white">
                    {skill.label}
                  </div>
                  <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">{skill.value}</p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="grid gap-4">
          <article className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{"Band progress"}</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">
                <LineChart className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-5 grid h-28 grid-cols-7 items-end gap-2">
              {chartBars.map((height, index) => (
                <div key={index} className="flex h-full flex-col justify-end gap-2 text-center">
                  <span className="mx-auto w-full rounded-t-lg bg-gradient-to-t from-orange-500 to-orange-300" style={{ height: `${height}%` }} />
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">{`Test ${index + 1}`}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{"Weak areas and recommendations"}</p>
            <div className="mt-4 space-y-3">
              {weakAreas.map((area) => {
                const Icon = area.Icon;
                return (
                  <div key={area.title} className="flex items-start gap-3 rounded-2xl bg-slate-50/80 p-3 dark:bg-slate-950/70">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", area.iconClassName)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-slate-900 dark:text-white">{area.title}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{area.text}</span>
                    </span>
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                      {area.badge}
                    </span>
                  </div>
                );
              })}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

// ── Final CTA ───────────────────────────────────────────────────────
function FinalCta() {
  const bullets = [
    "Full test experience for all 4 skills",
    "Instant Band Estimate and performance report",
    "Personalized recommendations",
  ];

  return (
    <section id="about" className="relative isolate overflow-hidden border-t border-slate-100 bg-[#fbfcfe] px-2 pb-14 pt-24 dark:border-slate-900 dark:bg-slate-950 sm:px-3 sm:pb-16 sm:pt-32">
      <div className="pointer-events-none absolute right-0 top-14 -z-10 h-80 w-80 bg-[radial-gradient(rgba(249,115,22,0.18)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom_left,black,transparent_72%)] dark:bg-[radial-gradient(rgba(249,115,22,0.13)_1px,transparent_1px)]" />
      <div className="pointer-events-none absolute -bottom-20 -left-24 -z-10 h-52 w-[28rem] rounded-[100%] border-t border-orange-200/50 dark:border-orange-500/20" />
      <div className="pointer-events-none absolute -bottom-24 right-0 -z-10 h-60 w-[34rem] rounded-[100%] border-t border-slate-200/80 dark:border-slate-800" />

      <div className="mx-auto max-w-[86rem]">
        <Reveal className="text-center">
          <Eyebrow no="05">{"Final step"}</Eyebrow>
          <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-slate-950 dark:text-white sm:text-5xl lg:whitespace-nowrap">
            {"Ready to achieve your"} <span className="text-orange-500">{"target band?"}</span>
          </h2>
        </Reveal>

        <Reveal className="mt-10 overflow-hidden rounded-[26px] border border-orange-100 bg-white p-5 shadow-[0_34px_110px_-68px_rgba(15,23,42,0.55)] dark:border-orange-500/20 dark:bg-slate-900/75 dark:shadow-black/30 sm:p-7 lg:p-9">
          <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="max-w-xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">{"Start for free"}</p>
              <h3 className="mt-4 text-3xl font-black leading-tight tracking-[-0.025em] text-slate-950 dark:text-white sm:text-4xl">
                {"Take Free Tests"}
                <span className="block">{"and get your"} <span className="text-orange-500">{"Band Estimate!"}</span></span>
              </h3>

              <ul className="mt-7 space-y-3.5">
                {bullets.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 shrink-0 text-orange-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <MarketingAuthCta
                  guestLabel={"Start Free Tests"}
                  authLabel={"Start Free Tests"}
                  authHref="/tests"
                  className="h-12 rounded-xl bg-orange-500 px-6 text-sm font-bold text-white shadow-[0_20px_38px_-20px_rgba(249,115,22,0.9)] hover:bg-orange-600"
                />
                <Link
                  href="#pricing"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10"
                >
                  <Crown className="h-4 w-4 text-orange-500" />
                  {"View Premium Plans"}
                </Link>
              </div>

            </div>

            <FloatingProductPreviewCards />
          </div>
        </Reveal>

        <Reveal className="mt-10 text-center">
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">{"Your target band is closer than you think."}</p>
          <p className="mt-2 inline-flex items-center justify-center gap-2 text-lg font-black text-orange-500">
            {"Let's reach it together!"}
            <Heart className="h-4 w-4 fill-orange-500" />
          </p>
        </Reveal>
      </div>
    </section>
  );
}

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
