"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Clock3, Gift, Info, Loader2, MessageCircle, ShieldCheck, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { GiftCodeGeneratorCard } from "@/components/subscription/gift-code-generator-card";
import { landingFont } from "@/components/marketing/landing-font";
import { SubscriptionOverview, SubscriptionPaymentGuide } from "./subscription-overview";
import styles from "./subscription.module.css";
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
    <section className="rounded-[18px] border border-border bg-card p-5 shadow-none">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] lg:items-center">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-primary ring-1 ring-border">
            <Gift className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Have a premium code?</h2>
            <p className="text-sm font-medium text-muted-foreground">Enter your code to activate premium instantly.</p>
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
              className="h-12 rounded-xl border-border bg-muted font-semibold uppercase tracking-[0.08em]"
            />
            <Button
              type="submit"
              disabled={!isReady || isSubmitting || normalizedCodeLength < 7}
              className="h-12 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-none hover:bg-primary/90"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Redeeming..." : "Redeem Code"}
            </Button>
          </div>

          <div className="flex items-start gap-2 text-sm font-medium text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p>Each code works once and cannot be used on your own account.</p>
          </div>
        </form>
      </div>

      {message ? (
        <div
          className={cn(
            "mt-4 rounded-xl border px-4 py-3 text-sm font-medium",
            message.type === "success"
              ? "border-border bg-muted text-muted-foreground"
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
      <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-bold lowercase text-muted-foreground ring-1 ring-border">
        activated
      </span>
    );
  }
  if (status === "expired" || status === "canceled" || status === "failed") {
    return (
      <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-bold lowercase text-muted-foreground ring-1 ring-border">
        expired
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-bold lowercase text-primary ring-1 ring-border">
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
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <h3 className="text-lg font-semibold text-foreground">Cancel invoice?</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          You can create a new invoice anytime by choosing a plan again.
        </p>
        {error ? <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onKeep} disabled={isCancelling}>
            Keep invoice
          </Button>
          <Button type="button" className="h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90" onClick={onConfirm} disabled={isCancelling}>
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-[4px]">
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        className={cn(
          "relative my-3 max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-[20px] bg-card outline-none",
          "max-w-[460px] border border-border shadow-none",
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
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-5 w-5" />
        </button>

        <div className={cn("p-4 sm:p-5 lg:p-6", isClick && "p-5 sm:p-6")}>
          {isClick ? (
            <>
              <header className="pr-10">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 items-center rounded-lg bg-black px-3">
                    <Image src="/click-logo.svg" alt="Click" width={86} height={22} />
                  </span>
                  <PaymentStatusPill status={isTerminal ? "expired" as UserPaymentRecord["status"] : payment.status} />
                </div>
                <h2 id="payment-modal-title" className="mt-5 text-[1.35rem] font-semibold tracking-tight text-foreground">
                  {isActivated ? "Premium activated" : "Complete your payment"}
                </h2>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {isActivated
                    ? "Your Premium plan is now active."
                    : isTerminal
                      ? "This invoice has expired. Please create a new one."
                      : "Pay securely with Click. Premium activates automatically after Click confirms payment."}
                </p>
              </header>

              <div className="mt-5 border-y border-border py-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Amount due</p>
                    <p className="mt-1 text-[1.7rem] font-semibold tracking-tight text-foreground">{payment.amount}</p>
                  </div>
                  <span className="pb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{planLabel}</span>
                </div>
                {!isActivated ? (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5 shrink-0" />
                    {isTerminal ? "Invoice expired" : `Valid for ${countdown}`}
                  </p>
                ) : null}
              </div>

              {updatedPlan && !isTerminal && !isActivated ? (
                <p className="mt-4 text-sm leading-5 text-muted-foreground">
                  This plan now costs <span className="font-semibold text-foreground">{updatedPlan.priceLabel}</span>. Update your invoice to pay the current price.
                </p>
              ) : null}
              {isActivated ? (
                <Button asChild className="mt-5 h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
                  <a href="/dashboard">Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" /></a>
                </Button>
              ) : updatedPlan && !isTerminal ? (
                <Button type="button" onClick={onRefreshInvoice} disabled={refreshingInvoice} className="mt-5 h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
                  {refreshingInvoice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Update invoice <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : payment.paymentUrl && !isTerminal ? (
                <Button asChild className="mt-5 h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
                  <a href={payment.paymentUrl} target="_blank" rel="noopener noreferrer">Pay with Click <ArrowRight className="ml-2 h-4 w-4" /></a>
                </Button>
              ) : (
                <p className="mt-5 text-sm text-muted-foreground">Checkout is unavailable. Please create a new invoice or contact support.</p>
              )}
              {invoiceError ? <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300">{invoiceError}</p> : null}
              {!isActivated ? (
                <Button type="button" variant="ghost" onClick={() => setConfirmCancelOpen(true)} className="mt-2 h-9 w-full text-sm font-medium text-muted-foreground hover:text-foreground ">
                  Cancel invoice
                </Button>
              ) : null}
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
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
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted px-4 py-3 shadow-none sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">You have a pending payment invoice.</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          {countdown === "Expired" ? "This invoice has expired." : `Valid for ${countdown}. Open it when you are ready to continue payment.`}
        </p>
      </div>
      <Button
        type="button"
        onClick={onOpen}
        className="h-10 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
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
  const isPremium = useAuthStore((state) => state.isPremium);
  const premiumUntil = useAuthStore((state) => state.premiumUntil);
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
    <div className={cn(styles.workspace, landingFont.className)}>
      <SubscriptionOverview
        plans={plans}
        busyPlanId={busyPlanId}
        onChoosePlan={handleChoosePlan}
        isPremium={isPremium}
        premiumUntil={premiumUntil}
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

      <SubscriptionPaymentGuide />
      <details className={styles.extras}>
        <summary>Gift codes &amp; redeem a code</summary>
        <div className={styles.extrasContent}>
          <PremiumCodeSection />
          <GiftCodeGeneratorCard initialSummary={initialGiftSummary} />
        </div>
      </details>
    </div>
  );
}
