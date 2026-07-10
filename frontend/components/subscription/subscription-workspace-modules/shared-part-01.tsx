"use client";

import { ApiError, PaymentRecordResponse, UserPaymentRecord, useEffect, useState } from "./dependencies";



export function formatAmount(value: string | number): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "0 sum";
  }
  return `${Math.round(numeric).toLocaleString("en-US").replace(/,/g, " ")} sum`;
}

export function mapPaymentRecord(payload: PaymentRecordResponse): UserPaymentRecord {
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
    paymentInstructions: payload.payment_instructions ?? "Transfer the amount to the card, then send a screenshot to Telegram support.",
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

export function computeTimeLeft(expiresAt: string | null): string {
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

export function formatCardPreview(value: string | null): string {
  const normalized = value?.replace(/\D+/g, "") ?? "";
  if (!normalized) {
    return "-";
  }
  return normalized.replace(/(.{4})/g, "$1 ").trim();
}

export function copyFieldKey(paymentId: string, field: "card" | "amount"): string {
  return `${paymentId}:${field}`;
}

export function normalizePaymentErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }
  const message = error.message?.trim();
  if (!message || message.startsWith("Request failed for /me/payments/")) {
    return fallback;
  }
  return message;
}

export function useCountdown(expiresAt: string | null): string {
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

export function telegramUrl(contact: string): string {
  const username = contact.trim().replace(/^@/, "");
  return username ? `https://t.me/${username}` : "https://t.me/TheBugCreator";
}

export function getIncludedFeatures() {
  return [
    "All premium Mock Test",
    "AI Writing Feedback",
    "Speaking Mock with AI Examiner",
    "Detailed analytics and progress tracking",
    "Review Mistakes",
    "Smart recommendations",
  ];
}

export function getSubscriptionPricingPlanStyles() {
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

export function formatPremiumDate(value: string | null) {
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

export function SubscriptionPageHeader() {
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
