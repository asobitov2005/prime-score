"use client";

import { ArrowRight, BarChart3, Button, CalendarDays, Check, Infinity, MarketingPlan, PenTool, PrimePremiumIcon, TrendingUp, cn, useAuthStore } from "./dependencies";

import { formatPremiumDate, getIncludedFeatures, getSubscriptionPricingPlanStyles } from "./shared-part-01";



export function CurrentPlanCard() {
  const isPremium = useAuthStore((state) => state.isPremium);
  const premiumUntil = useAuthStore((state) => state.premiumUntil);
  const benefits = [
    {
      labelLines: ["All premium", "Mock Tests"],
      Icon: Infinity,
      iconClassName: "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20",
    },
    {
      labelLines: ["AI Writing", "Feedback"],
      Icon: PenTool,
      iconClassName: "bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20",
    },
    {
      labelLines: ["Detailed", "Analytics"],
      Icon: BarChart3,
      iconClassName: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    },
    {
      labelLines: ["Progress", "Tracking"],
      Icon: TrendingUp,
      iconClassName: "bg-orange-50 text-orange-600 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20",
    },
  ];
  const premiumUntilLabel = formatPremiumDate(premiumUntil);

  return (
    <section className="rounded-[18px] border border-orange-200/75 bg-[linear-gradient(135deg,#fff7ed,#ffffff_58%,#fffbeb)] p-4 shadow-[0_20px_55px_-44px_rgba(154,52,18,0.45)] dark:border-orange-500/25 dark:bg-[linear-gradient(135deg,rgba(67,20,7,0.42),rgba(15,23,42,0.88)_58%,rgba(67,20,7,0.22))]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.45fr)_auto] lg:items-center">
        <div className="flex items-start gap-3">
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-amber-100/75 text-amber-500 shadow-[0_18px_42px_-18px_rgba(245,158,11,0.95)] ring-1 ring-amber-200/80 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25">
            <PrimePremiumIcon className="h-9 w-9" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Current Plan</p>
            <h2 className={cn("mt-1 text-xl font-semibold tracking-[-0.02em]", isPremium ? "text-emerald-600 dark:text-emerald-300" : "text-slate-950 dark:text-white")}>
              {isPremium ? "Premium Active" : "Premium Inactive"}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              {isPremium ? (
                <>
                  Active until <span className="font-bold text-slate-950 dark:text-white">{premiumUntilLabel}</span>
                </>
              ) : (
                "Choose a plan below to activate premium."
              )}
            </p>
          </div>
        </div>

        <div className="grid gap-0 sm:grid-cols-4 sm:divide-x sm:divide-orange-200/70 dark:sm:divide-orange-500/20">
          {benefits.map((benefit) => (
            <div key={benefit.labelLines.join(" ")} className="flex flex-col items-center gap-1.5 border-b border-orange-200/70 px-3 py-2 text-center text-sm font-semibold text-slate-700 last:border-b-0 dark:border-orange-500/20 dark:text-slate-200 sm:border-b-0">
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1", benefit.iconClassName)}>
                <benefit.Icon className="h-4 w-4" />
              </span>
              <span className="grid min-h-9 place-items-center leading-[1.15rem]">
                <span>{benefit.labelLines[0]}</span>
                <span>{benefit.labelLines[1]}</span>
              </span>
            </div>
          ))}
        </div>

        <Button
          type="button"
          onClick={() => document.getElementById("premium-plans")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="h-10 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white shadow-[0_16px_34px_-20px_rgba(249,115,22,0.9)] hover:bg-orange-600"
        >
          Extend Plan
        </Button>
      </div>
    </section>
  );
}

export function PremiumIncludedCard() {
  const features = getIncludedFeatures();

  return (
    <article className="flex min-h-[31rem] flex-col rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-44px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/75 dark:shadow-black/25">
      <div>
        <h3 className="text-xl font-bold tracking-[-0.01em] text-slate-950 dark:text-white">
          All Premium plans include
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {"Premium tools, real exam practice and AI insights - all in one place."}
        </p>
      </div>

      <ul className="mt-6 flex-1 divide-y divide-slate-100 dark:divide-slate-800">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2.5 py-2.5 text-sm font-medium leading-5 text-slate-700 dark:text-slate-300">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
              <Check className="h-3.5 w-3.5" />
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function SubscriptionLandingPricingGrid({
  plans,
  busyPlanId,
  onChoosePlan,
}: {
  plans: MarketingPlan[];
  busyPlanId: string | null;
  onChoosePlan: (plan: MarketingPlan) => void;
}) {
  const planStyles = getSubscriptionPricingPlanStyles();

  return (
    <section id="premium-plans" className="scroll-mt-24 space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">
          Choose your Premium plan
        </h2>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Unlock all features and improve your IELTS score faster.
        </p>
      </div>

      <div className="grid items-stretch gap-4 pb-4 md:grid-cols-2 lg:grid-cols-[0.98fr_repeat(3,minmax(0,1.04fr))]">
        <PremiumIncludedCard />

        {plans.length === 0 ? (
          <article className="flex min-h-[31rem] flex-col justify-center rounded-[20px] border border-dashed border-slate-200 bg-white p-6 text-center shadow-[0_20px_60px_-44px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/75 dark:shadow-black/25 lg:col-span-3">
            <h3 className="text-xl font-semibold tracking-[-0.01em] text-slate-950 dark:text-white">No active backend plans</h3>
            <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              Subscription cards are loaded from the backend. Add or activate public plans in admin to show them here.
            </p>
          </article>
        ) : null}

        {plans.map((actionPlan, index) => {
          const plan = planStyles[index % planStyles.length];
          const isBusy = busyPlanId === actionPlan.id;
          const featureItems = actionPlan.perks;

          return (
            <article
              key={actionPlan.id}
              className={cn(
                "relative flex min-h-[31rem] flex-col rounded-[20px] border bg-white p-6 shadow-[0_20px_60px_-44px_rgba(15,23,42,0.35)] transition-all duration-500 hover:-translate-y-1 dark:bg-slate-900/75 dark:shadow-black/25",
                actionPlan.isFeatured
                  ? "border-orange-300 shadow-[0_34px_80px_-42px_rgba(249,115,22,0.85)] ring-1 ring-orange-100 dark:border-orange-500/45 dark:ring-orange-500/20 dark:shadow-orange-950/25"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700",
              )}
            >
              {actionPlan.isFeatured ? (
                <div className="absolute inset-x-6 -top-4 flex justify-center">
                  <span className="rounded-full bg-orange-500 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_16px_30px_-18px_rgba(249,115,22,0.9)]">
                    {actionPlan.badgeLabel}
                  </span>
                </div>
              ) : null}

              <div className="pt-2 text-center">
                <span className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-full ring-1", plan.iconClassName)}>
                  <CalendarDays className="h-5 w-5" />
                </span>
                <h3 className="mt-6 text-2xl font-bold tracking-[-0.01em] text-slate-950 dark:text-white">{actionPlan.title}</h3>
                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{actionPlan.badgeLabel || `${actionPlan.durationDays} days`}</p>
              </div>

              <div className="mt-7 text-center">
                <p className="text-[1.85rem] font-semibold leading-none tracking-[-0.025em] text-slate-950 dark:text-white">{actionPlan.priceLabel}</p>
                <p className="mt-2 text-xs font-medium text-slate-400 dark:text-slate-500">{actionPlan.monthlyLabel || `${actionPlan.durationDays} days`}</p>
              </div>

              <div className="mt-7">
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    onChoosePlan(actionPlan);
                  }}
                  className={cn(plan.buttonClassName, isBusy && "cursor-wait opacity-80")}
                >
                  {isBusy ? "Creating..." : "Get Started"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
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
            </article>
          );
        })}
      </div>
    </section>
  );
}
