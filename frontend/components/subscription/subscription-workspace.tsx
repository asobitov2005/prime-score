"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BarChart3, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, Crown, CreditCard, Gift, Infinity, Info, Loader2, MessageCircle, PenTool, ShieldCheck, ShoppingCart, TrendingUp, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { GiftCodeGeneratorCard } from "@/components/subscription/gift-code-generator-card";
import { PrimePremiumIcon } from "@/components/ui/prime-premium-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createApiClient, ApiError } from "@/lib/api/client";
import {
  parseAnalyticsAmount,
  trackBeginCheckout,
  trackPaymentCanceled,
  trackPlanSelect,
} from "@/lib/analytics";
import type { PaymentRecordResponse } from "@/lib/api/types";
import type { MarketingPlan } from "@/lib/server-plans";
import type { UserGiftCodeSummary, UserPaymentRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

function formatAmount(value: string | number): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "0 sum";
  }
  return `${Math.round(numeric).toLocaleString("en-US").replace(/,/g, " ")} sum`;
}

function mapPaymentRecord(payload: PaymentRecordResponse): UserPaymentRecord {
  return {
    id: payload.id,
    invoiceCode: payload.invoice_code,
    planId: payload.plan_id ?? null,
    planName: payload.plan_name,
    durationDays: payload.duration_days ?? null,
    method: payload.method,
    status: payload.status,
    baseAmount: formatAmount(payload.base_amount),
    compareAtAmount: formatAmount(payload.compare_at_amount),
    amount: formatAmount(payload.amount),
    discountAmount: formatAmount(payload.discount_amount),
    currency: payload.currency,
    cardLabel: payload.card_label ?? null,
    cardNumber: payload.card_number ?? null,
    supportContact: payload.support_contact ?? "@TheBugCreator",
    paymentInstructions: payload.payment_instructions ?? "Choose a plan and pay with Click. Premium activates automatically after payment confirmation. Contact support only if you have a problem.",
    paymentUrl: payload.payment_url ?? null,
    expiresAt: payload.expires_at ?? null,
    matchedAt: payload.matched_at ?? null,
    paidAt: payload.paid_at ?? null,
    archivedAt: payload.archived_at ?? null,
    grantedUntil: payload.granted_until ?? null,
    statusReason: payload.status_reason ?? null,
    createdAt: payload.created_at ?? null,
    updatedAt: payload.updated_at ?? null,
  };
}

function computeTimeLeft(expiresAt: string | null): string {
  if (!expiresAt) {
    return "No deadline";
  }
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) {
    return "Expired";
  }
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m left`;
}
function normalizePaymentErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }
  const message = error.message?.trim();
  if (!message || message.startsWith("Request failed for /me/payments/")) {
    return fallback;
  }
  return message;
}

function useCountdown(expiresAt: string | null): string {
  const [timeLeft, setTimeLeft] = useState(() => computeTimeLeft(expiresAt));

  useEffect(() => {
    setTimeLeft(computeTimeLeft(expiresAt));
    const intervalId = window.setInterval(() => {
      setTimeLeft(computeTimeLeft(expiresAt));
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [expiresAt]);

  return timeLeft;
}

function telegramUrl(contact: string): string {
  const username = contact.trim().replace(/^@/, "");
  return username ? `https://t.me/${username}` : "https://t.me/TheBugCreator";
}

function getIncludedFeatures() {
  return [
    "All premium Mock Test",
    "AI Writing Feedback",
    "Speaking Mock with AI Examiner",
    "Detailed analytics and progress tracking",
    "Review Mistakes",
    "Smart recommendations",
  ];
}

function getSubscriptionPricingPlanStyles() {
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

function formatPremiumDate(value: string | null) {
  if (!value) {
    return "07 Jul 2026";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "07 Jul 2026";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function SubscriptionPageHeader() {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-[1.85rem]">
        Subscription
      </h1>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        Choose a plan, activate premium, or manage your subscription.
      </p>
    </header>
  );
}

function CurrentPlanCard() {
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

function PremiumIncludedCard() {
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

function SubscriptionLandingPricingGrid({
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

function ActivationStepsSection() {
  const steps = [
    {
      Icon: ShoppingCart,
      title: "Choose a plan",
      text: "Select the plan that fits you best.",
      tone: "blue",
    },
    {
      Icon: CreditCard,
      title: "Pay with Click",
      text: "Complete your payment securely in Click.",
      tone: "blue",
    },
    {
      Icon: ShieldCheck,
      title: "Automatic confirmation",
      text: "Click confirms your payment. No screenshot is needed.",
      tone: "blue",
    },
    {
      Icon: Crown,
      title: "Get activated",
      text: "Premium activates automatically after Click confirms payment.",
      tone: "green",
    },
  ];

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/75">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">How activation works</h2>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] xl:items-start">
        {steps.map((step, index) => (
          <div key={step.title} className="contents">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border text-center shadow-sm",
                  step.tone === "green"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
                )}
              >
                <step.Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                  {index + 1}. {step.title}
                </h3>
                <p className="mt-1 min-h-12 text-sm leading-6 text-slate-500 dark:text-slate-400">{step.text}</p>
              </div>
            </div>
            {index < steps.length - 1 ? (
              <div className="hidden pt-4 text-slate-300 dark:text-slate-700 xl:block">
                <ChevronRight className="h-5 w-5" />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
        <a
          href="https://t.me/TheBugCreator"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2.5 text-sm font-semibold text-sky-700 underline-offset-4 hover:underline dark:text-sky-300"
        >
          <svg className="h-5 w-5" viewBox="0 0 240 240" aria-hidden="true" fill="currentColor">
            <path d="M120 0C53.7 0 0 53.7 0 120s53.7 120 120 120 120-53.7 120-120S186.3 0 120 0Zm55.7 82.3-19.7 92.8c-1.5 6.6-5.4 8.2-10.9 5.1l-30.2-22.3-14.6 14c-1.6 1.6-3 3-6.1 3l2.2-30.8 56.1-50.7c2.4-2.2-.5-3.4-3.8-1.2l-69.3 43.6-29.8-9.3c-6.5-2-6.6-6.5 1.4-9.6l116.5-44.9c5.4-2 10.1 1.3 8.2 10.3Z" />
          </svg>
          Payment or activation problem? Contact @TheBugCreator
        </a>
      </div>
    </section>
  );
}

function PremiumCodeSection() {
  const router = useRouter();
  const api = useMemo(() => createApiClient(), []);
  const { userId, accessToken, syncSession } = useAuthStore();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const isReady = Boolean(userId && accessToken);
  const normalizedCodeLength = code.trim().replace(/\s+/g, "").length;

  async function handleRedeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = code.trim().replace(/\s+/g, "").toUpperCase();
    if (!normalizedCode || !isReady) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await api.redeem({ code: normalizedCode });
      syncSession({
        isPremium: response.is_premium,
        premiumUntil: response.premium_until,
      });
      setCode("");
      setMessage({ type: "success", text: response.message });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof ApiError ? error.message : "Redeem code could not be applied." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/75">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] lg:items-center">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
            <Gift className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">Have a premium code?</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Enter your code to activate premium instantly.</p>
          </div>
        </div>

        <form onSubmit={handleRedeem} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                if (message) setMessage(null);
              }}
              placeholder="Enter code"
              autoComplete="off"
              spellCheck={false}
              disabled={!isReady || isSubmitting}
              className="h-12 rounded-xl border-slate-200 bg-slate-50/70 font-semibold uppercase tracking-[0.08em] dark:border-slate-800 dark:bg-slate-950/35"
            />
            <Button
              type="submit"
              disabled={!isReady || isSubmitting || normalizedCodeLength < 7}
              className="h-12 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white shadow-[0_16px_34px_-20px_rgba(249,115,22,0.9)] hover:bg-orange-600"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Redeeming..." : "Redeem Code"}
            </Button>
          </div>

          <div className="flex items-start gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
            <p>Each code works once and cannot be used on your own account.</p>
          </div>
        </form>
      </div>

      {message ? (
        <div
          className={cn(
            "mt-4 rounded-xl border px-4 py-3 text-sm font-medium",
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200",
          )}
        >
          {message.text}
        </div>
      ) : null}
    </section>
  );
}
function PaymentStatusPill({ status }: { status: UserPaymentRecord["status"] }) {
  if (status === "completed") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold lowercase text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
        activated
      </span>
    );
  }
  if (status === "expired" || status === "canceled" || status === "failed") {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold lowercase text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
        expired
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-bold lowercase text-orange-700 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
      pending
    </span>
  );
}

function ConfirmCancelDialog({
  onKeep,
  onConfirm,
  isCancelling,
  error,
}: {
  onKeep: () => void;
  onConfirm: () => void;
  isCancelling: boolean;
  error: string | null;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Cancel invoice?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          You can create a new invoice anytime by choosing a plan again.
        </p>
        {error ? <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onKeep} disabled={isCancelling}>
            Keep invoice
          </Button>
          <Button type="button" className="h-11 rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200" onClick={onConfirm} disabled={isCancelling}>
            {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Cancel invoice
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActiveInvoiceModal({
  payment,
  updatedPlan,
  refreshingInvoice,
  invoiceError,
  onRefreshInvoice,
  onCancel,
  onClose,
}: {
  payment: UserPaymentRecord;
  updatedPlan: MarketingPlan | null;
  refreshingInvoice: boolean;
  invoiceError: string | null;
  onRefreshInvoice: () => void;
  onCancel: () => Promise<boolean>;
  onClose: () => void;
}) {
  const countdown = useCountdown(payment.expiresAt);
  const modalRef = useRef<HTMLDivElement>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const isExpired = countdown === "Expired";
  const isActivated = payment.status === "completed";
  const isTerminal = isExpired || payment.status === "canceled" || payment.status === "failed";
  const isClick = payment.method === "click";
  const supportContact = payment.supportContact || "@TheBugCreator";
  const planLabel = payment.durationDays
    ? `${Math.round(payment.durationDays / 30)} MONTH${Math.round(payment.durationDays / 30) === 1 ? "" : "S"}`
    : payment.planName.toUpperCase();

  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (confirmCancelOpen) {
          setConfirmCancelOpen(false);
          return;
        }
        onClose();
      }
      if (event.key === "Tab") {
        const modal = modalRef.current;
        if (!modal) {
          return;
        }
        const focusable = Array.from(
          modal.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => !element.hasAttribute("disabled") && !element.getAttribute("aria-hidden"));
        if (focusable.length === 0) {
          event.preventDefault();
          modal.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmCancelOpen, onClose]);

  async function confirmCancel() {
    setIsCancelling(true);
    try {
      if (await onCancel()) {
        setConfirmCancelOpen(false);
        onClose();
      }
    } finally {
      setIsCancelling(false);
    }
  }


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-[4px]">
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        className={cn(
          "relative my-3 max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-[20px] bg-white outline-none dark:bg-slate-950",
          "max-w-[460px] border border-slate-200 shadow-[0_24px_72px_-32px_rgba(15,23,42,0.5)] dark:border-slate-800",
        )}
      >
        {confirmCancelOpen ? (
          <ConfirmCancelDialog
            onKeep={() => setConfirmCancelOpen(false)}
            onConfirm={() => void confirmCancel()}
            isCancelling={isCancelling}
            error={invoiceError}
          />
        ) : null}
        <button
          type="button"
          aria-label="Close payment modal"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <X className="h-5 w-5" />
        </button>

        <div className={cn("p-4 sm:p-5 lg:p-6", isClick && "p-5 sm:p-6")}>
          {isClick ? (
            <>
              <header className="pr-10">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 items-center rounded-lg bg-slate-950 px-3 dark:bg-slate-900">
                    <Image src="/click-logo.svg" alt="Click" width={86} height={22} />
                  </span>
                  <PaymentStatusPill status={isTerminal ? "expired" as UserPaymentRecord["status"] : payment.status} />
                </div>
                <h2 id="payment-modal-title" className="mt-5 text-[1.35rem] font-semibold tracking-tight text-slate-950 dark:text-white">
                  {isActivated ? "Premium activated" : "Complete your payment"}
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  {isActivated
                    ? "Your Premium plan is now active."
                    : isTerminal
                      ? "This invoice has expired. Please create a new one."
                      : "Pay securely with Click. Premium activates automatically after Click confirms payment."}
                </p>
              </header>

              <div className="mt-5 border-y border-slate-200 py-4 dark:border-slate-800">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Amount due</p>
                    <p className="mt-1 text-[1.7rem] font-semibold tracking-tight text-slate-950 dark:text-white">{payment.amount}</p>
                  </div>
                  <span className="pb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{planLabel}</span>
                </div>
                {!isActivated ? (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Clock3 className="h-3.5 w-3.5 shrink-0" />
                    {isTerminal ? "Invoice expired" : `Valid for ${countdown}`}
                  </p>
                ) : null}
              </div>

              {updatedPlan && !isTerminal && !isActivated ? (
                <p className="mt-4 text-sm leading-5 text-slate-600 dark:text-slate-300">
                  This plan now costs <span className="font-semibold text-slate-950 dark:text-white">{updatedPlan.priceLabel}</span>. Update your invoice to pay the current price.
                </p>
              ) : null}
              {isActivated ? (
                <Button asChild className="mt-5 h-11 w-full rounded-xl bg-[#0065ff] font-semibold text-white hover:bg-[#0054d6]">
                  <a href="/dashboard">Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" /></a>
                </Button>
              ) : updatedPlan && !isTerminal ? (
                <Button type="button" onClick={onRefreshInvoice} disabled={refreshingInvoice} className="mt-5 h-11 w-full rounded-xl bg-[#0065ff] font-semibold text-white hover:bg-[#0054d6]">
                  {refreshingInvoice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Update invoice <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : payment.paymentUrl && !isTerminal ? (
                <Button asChild className="mt-5 h-11 w-full rounded-xl bg-[#0065ff] font-semibold text-white hover:bg-[#0054d6]">
                  <a href={payment.paymentUrl} rel="noreferrer">Pay with Click <ArrowRight className="ml-2 h-4 w-4" /></a>
                </Button>
              ) : (
                <p className="mt-5 text-sm text-amber-700 dark:text-amber-300">Checkout is unavailable. Please create a new invoice or contact support.</p>
              )}
              {invoiceError ? <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300">{invoiceError}</p> : null}
              {!isActivated ? (
                <Button type="button" variant="ghost" onClick={() => setConfirmCancelOpen(true)} className="mt-2 h-9 w-full text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                  Cancel invoice
                </Button>
              ) : null}
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                No screenshot needed. Access starts after Click confirms payment.
              </p>
              {!isActivated ? (
                <a href={telegramUrl(supportContact)} target="_blank" rel="noreferrer" className="mt-3 block text-center text-xs text-muted-foreground underline underline-offset-4">
                  Payment or activation problem? Contact {supportContact}
                </a>
              ) : null}
            </>
          ) : (
          <div className="space-y-4 pr-8">
            <h2 id="payment-modal-title" className="text-xl font-semibold">
              {isActivated ? "Premium activated" : "Older payment invoice"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isActivated
                ? "Your Premium plan is active."
                : "New plan payments use Click. If you already paid this invoice and Premium is not active, contact support before paying again."}
            </p>
            {!isActivated ? (
              <a href={telegramUrl(supportContact)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm underline">
                <MessageCircle className="h-4 w-4" /> Payment problem? Contact {supportContact}
              </a>
            ) : null}
            {!isActivated && !isTerminal ? (
              <Button type="button" variant="outline" onClick={() => setConfirmCancelOpen(true)}>Cancel old invoice</Button>
            ) : null}
            <Button type="button" onClick={onClose}>Back to plans</Button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivePaymentNotice({
  payment,
  onOpen,
}: {
  payment: UserPaymentRecord;
  onOpen: () => void;
}) {
  const countdown = useCountdown(payment.expiresAt);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-orange-200 bg-orange-50/70 px-4 py-3 shadow-[0_18px_42px_-34px_rgba(249,115,22,0.55)] dark:border-orange-500/25 dark:bg-orange-500/10 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-950 dark:text-white">You have a pending payment invoice.</p>
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          {countdown === "Expired" ? "This invoice has expired." : `Valid for ${countdown}. Open it when you are ready to continue payment.`}
        </p>
      </div>
      <Button
        type="button"
        onClick={onOpen}
        className="h-10 shrink-0 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600"
      >
        Continue payment
      </Button>
    </div>
  );
}

export function SubscriptionWorkspace({
  plans,
  initialPayments,
  initialGiftSummary,
}: {
  plans: MarketingPlan[];
  initialPayments: UserPaymentRecord[];
  initialGiftSummary: UserGiftCodeSummary;
}) {
  const router = useRouter();
  const api = useMemo(() => createApiClient(), []);
  const [payments, setPayments] = useState<UserPaymentRecord[]>(initialPayments);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const activePayment = useMemo(
    () => payments.find((item) => item.status === "pending" || item.status === "matched") ?? null,
    [payments],
  );
  const updatedPlan = activePayment?.method === "click"
    ? plans.find((plan) => plan.id === activePayment.planId && parseAnalyticsAmount(activePayment.amount) !== plan.numericPrice) ?? null
    : null;

  useEffect(() => {
    if (!activePayment || activePayment.method !== "click") return;
    let alive = true;
    const check = async () => {
      try {
        const updated = mapPaymentRecord(await api.getPayment(activePayment.id));
        if (!alive) return;
        if (updated.status !== activePayment.status) {
          setPayments((current) => [updated, ...current.filter((item) => item.id !== updated.id)]);
          if (updated.status === "completed") {
            setPaymentModalOpen(false);
            router.refresh();
          }
        }
      } catch {
        // The invoice remains visible; the next poll or page refresh can retry.
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 5000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [activePayment, api, router]);

  async function handleChoosePlan(plan: MarketingPlan) {
    setBusyPlanId(plan.id);
    setError(null);
    trackPlanSelect({
      planId: plan.id,
      planName: plan.title,
      durationDays: plan.durationDays,
      value: plan.numericPrice,
      currency: plan.currency,
      location: "subscription_workspace",
      authState: "authenticated",
    });
    try {
      const payload = await api.createPayment({ plan_id: plan.id });
      const payment = mapPaymentRecord(payload.payment);
      trackBeginCheckout({
        paymentId: payment.id,
        invoiceCode: payment.invoiceCode,
        planId: payment.planId,
        planName: payment.planName || plan.title,
        durationDays: payment.durationDays ?? plan.durationDays,
        value: parseAnalyticsAmount(payment.amount) ?? plan.numericPrice,
        currency: payment.currency || plan.currency,
        discountValue: parseAnalyticsAmount(payment.discountAmount),
      });
      setPayments((current) => [payment, ...current.filter((item) => item.id !== payment.id)]);
      setPaymentModalOpen(true);
      router.refresh();
    } catch (createError) {
      setError(normalizePaymentErrorMessage(createError, "Failed to create the invoice. Please try again."));
    } finally {
      setBusyPlanId(null);
    }
  }

  async function handleCancelPayment(paymentId: string): Promise<boolean> {
    setError(null);
    try {
      const payload = await api.cancelPayment(paymentId);
      const canceled = mapPaymentRecord(payload.payment);
      trackPaymentCanceled({
        paymentId: canceled.id,
        invoiceCode: canceled.invoiceCode,
        planId: canceled.planId,
        planName: canceled.planName,
        value: parseAnalyticsAmount(canceled.amount),
        currency: canceled.currency,
      });
      setPayments((current) => [canceled, ...current.filter((item) => item.id !== canceled.id)]);
      return true;
    } catch (cancelError) {
      setError(normalizePaymentErrorMessage(cancelError, "Failed to cancel the invoice. Please try again in a moment."));
      return false;
    }
  }


  return (
    <div className="space-y-6">
      <SubscriptionPageHeader />

      <CurrentPlanCard />

      <SubscriptionLandingPricingGrid
        plans={plans}
        busyPlanId={busyPlanId}
        onChoosePlan={handleChoosePlan}
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {activePayment && !paymentModalOpen ? (
        <ActivePaymentNotice payment={activePayment} onOpen={() => setPaymentModalOpen(true)} />
      ) : null}

      {activePayment && paymentModalOpen ? (
        <ActiveInvoiceModal
          payment={activePayment}
          updatedPlan={updatedPlan}
          refreshingInvoice={busyPlanId === updatedPlan?.id}
          invoiceError={error}
          onRefreshInvoice={() => { if (updatedPlan) void handleChoosePlan(updatedPlan); }}
          onCancel={() => handleCancelPayment(activePayment.id)}
          onClose={() => setPaymentModalOpen(false)}
        />
      ) : null}

      <ActivationStepsSection />

      <PremiumCodeSection />

      <GiftCodeGeneratorCard initialSummary={initialGiftSummary} />
    </div>
  );
}
