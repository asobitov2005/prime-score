"use client";

import { GiftCodeGeneratorCard, MarketingPlan, UserGiftCodeSummary, UserPaymentRecord, copyTextToClipboard, createApiClient, parseAnalyticsAmount, trackBeginCheckout, trackPaymentCanceled, trackPaymentCopy, trackPlanSelect, useEffect, useMemo, useRef, useState } from "./dependencies";

import { SubscriptionPageHeader, copyFieldKey, mapPaymentRecord, normalizePaymentErrorMessage } from "./shared-part-01";

import { CurrentPlanCard, SubscriptionLandingPricingGrid } from "./shared-part-02";

import { ActivationStepsSection, PremiumCodeSection } from "./shared-part-03";

import { ActivePaymentNotice } from "./shared-part-04";



export function SubscriptionWorkspace({
  plans,
  initialPayments,
  initialGiftSummary,
}: {
  plans: MarketingPlan[];
  initialPayments: UserPaymentRecord[];
  initialGiftSummary: UserGiftCodeSummary;
}) {
  const api = useMemo(() => createApiClient(), []);
  const [payments, setPayments] = useState<UserPaymentRecord[]>(initialPayments);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const copyResetTimeoutRef = useRef<number | null>(null);

  const activePayment = useMemo(
    () => payments.find((item) => item.status === "pending" || item.status === "matched") ?? null,
    [payments],
  );

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

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
    } catch (createError) {
      setError(normalizePaymentErrorMessage(createError, "Failed to create the invoice. Please try again."));
    } finally {
      setBusyPlanId(null);
    }
  }

  async function handleCancelPayment(paymentId: string) {
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
    } catch (cancelError) {
      setError(normalizePaymentErrorMessage(cancelError, "Failed to cancel the invoice. Please try again in a moment."));
    }
  }

  async function handleCopyField(paymentId: string, field: "card" | "amount", value: string): Promise<boolean> {
    if (!value || value === "-") {
      return false;
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        await copyTextToClipboard(value);
      }
      const key = copyFieldKey(paymentId, field);
      trackPaymentCopy({ paymentId, field });
      setCopiedField(key);
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
      copyResetTimeoutRef.current = window.setTimeout(() => {
        setCopiedField((current) => (current === key ? null : current));
      }, 1800);
      return true;
    } catch {
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
          copiedField={copiedField}
          onCopy={handleCopyField}
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
