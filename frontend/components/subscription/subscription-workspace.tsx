"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Clock3, Copy, Loader2, MessageCircle, RefreshCcw, Wallet } from "lucide-react";

import { PricingPlanGrid } from "@/components/marketing/pricing-plan-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { createApiClient, ApiError } from "@/lib/api/client";
import { parseAnalyticsAmount, trackBeginCheckout, trackPurchase } from "@/lib/analytics";
import type { PaymentRecordResponse } from "@/lib/api/types";
import type { MarketingPlan } from "@/lib/server-plans";
import type { UserPaymentRecord } from "@/lib/types";
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

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
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

function statusTone(status: UserPaymentRecord["status"]): "default" | "secondary" | "danger" | "outline" {
  if (status === "completed") {
    return "default";
  }
  if (status === "pending" || status === "matched") {
    return "secondary";
  }
  if (status === "failed" || status === "review") {
    return "danger";
  }
  return "outline";
}

function formatCardPreview(value: string | null): string {
  const normalized = value?.replace(/\D+/g, "") ?? "";
  if (!normalized) {
    return "-";
  }
  return normalized.replace(/(.{4})/g, "$1 ").trim();
}

function copyFieldKey(paymentId: string, field: "card" | "amount"): string {
  return `${paymentId}:${field}`;
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

function CopyActionButton({
  label,
  copied,
  onClick,
}: {
  label: string;
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant={copied ? "secondary" : "outline"} size="sm" className="h-8 px-2.5 text-xs" onClick={onClick}>
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}

function PaymentDetailCard({
  eyebrow,
  value,
  accent,
  action,
}: {
  eyebrow: string;
  value: string;
  accent?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border px-4 py-3", accent ? "border-primary/20 bg-primary/10" : "border-border/60 bg-background/90")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
          <p className="mt-2 break-all font-mono text-base font-semibold tracking-[0.12em] text-foreground sm:text-lg">
            {value}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

function ActiveInvoiceCard({
  payment,
  copiedField,
  onCopy,
  onCancel,
}: {
  payment: UserPaymentRecord;
  copiedField: string | null;
  onCopy: (paymentId: string, field: "card" | "amount", value: string) => void;
  onCancel: () => void;
}) {
  const countdown = useCountdown(payment.expiresAt);
  const isExpired = countdown === "Expired";
  const cardValue = payment.cardNumber ?? "-";
  const supportContact = payment.supportContact || "@TheBugCreator";

  return (
    <Card className="overflow-hidden rounded-[1.4rem] border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.12),transparent_24%),linear-gradient(180deg,#111a2d_0%,#0b1220_100%)] shadow-[0_28px_70px_rgba(2,6,23,0.28)]">
      <CardContent className="grid gap-5 p-4 md:p-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(payment.status)}>{payment.status}</Badge>
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              {payment.planName}
            </span>
          </div>

          <div className="grid gap-3">
            <PaymentDetailCard
              eyebrow="Amount to transfer"
              value={payment.amount}
              accent={true}
              action={
                <CopyActionButton
                  label="Copy amount"
                  copied={copiedField === copyFieldKey(payment.id, "amount")}
                  onClick={() => onCopy(payment.id, "amount", payment.amount.replace(/[^\d]/g, ""))}
                />
              }
            />
            <PaymentDetailCard
              eyebrow={payment.cardLabel ?? "Card number"}
              value={formatCardPreview(payment.cardNumber ?? "-")}
              action={
                <CopyActionButton
                  label="Copy card"
                  copied={copiedField === copyFieldKey(payment.id, "card")}
                  onClick={() => onCopy(payment.id, "card", cardValue)}
                />
              }
            />
          </div>

          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-100">
            Transfer the shown amount to the card, then send the receipt screenshot to {supportContact} on Telegram.
          </div>
        </div>

        <div className="flex h-full flex-col justify-between gap-4 rounded-[1.25rem] border border-white/8 bg-white/8 p-4 backdrop-blur-sm">
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <Clock3 className={cn("h-4 w-4", isExpired ? "text-red-500" : "text-primary")} />
              <span className={cn("font-medium", isExpired && "text-red-400")}>
                {isExpired ? "Invoice expired" : `Valid for ${countdown}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span>{payment.paymentInstructions}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Premium is activated after support checks the screenshot.</span>
            </div>
          </div>
          <div className="space-y-3">
            <Button type="button" asChild className="w-full">
              <a href={telegramUrl(supportContact)} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" />
                Send screenshot
              </a>
            </Button>
            <Button type="button" variant="outline" className="w-full border-white/10 bg-black/30 text-white hover:bg-white/10 hover:text-white" onClick={onCancel} disabled={isExpired}>
              Cancel invoice
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SubscriptionWorkspace({
  plans,
  initialPayments,
}: {
  plans: MarketingPlan[];
  initialPayments: UserPaymentRecord[];
}) {
  const api = useMemo(() => createApiClient(), []);
  const syncSession = useAuthStore((state) => state.syncSession);
  const [payments, setPayments] = useState<UserPaymentRecord[]>(initialPayments);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyResetTimeoutRef = useRef<number | null>(null);
  const paymentStatusRef = useRef<Record<string, UserPaymentRecord["status"]>>(
    Object.fromEntries(initialPayments.map((item) => [item.id, item.status])),
  );

  const activePayment = useMemo(
    () => payments.find((item) => item.status === "pending" || item.status === "matched") ?? null,
    [payments],
  );
  const historyPayments = useMemo(
    () => payments.filter((item) => item.status !== "completed" && item.id !== activePayment?.id),
    [activePayment?.id, payments],
  );

  const syncPaymentStatuses = useCallback((nextPayments: UserPaymentRecord[], emitEvents: boolean) => {
    const previousStatuses = paymentStatusRef.current;
    if (emitEvents) {
      for (const payment of nextPayments) {
        const previousStatus = previousStatuses[payment.id];
        if (previousStatus && previousStatus !== payment.status && payment.status === "completed") {
          trackPurchase({
            paymentId: payment.id,
            invoiceCode: payment.invoiceCode,
            planId: payment.planId,
            planName: payment.planName,
            durationDays: payment.durationDays,
            value: parseAnalyticsAmount(payment.amount),
            currency: payment.currency,
            grantedUntil: payment.grantedUntil,
          });
        }
      }
    }
    paymentStatusRef.current = Object.fromEntries(nextPayments.map((item) => [item.id, item.status]));
  }, []);

  const refreshPayments = useCallback(async () => {
    setRefreshing(true);
    try {
      const [items, profile] = await Promise.all([
        api.listPayments(),
        api.getMe().catch(() => null),
      ]);
      const mapped = items.map(mapPaymentRecord);
      syncPaymentStatuses(mapped, true);
      setPayments(mapped);
      if (profile) {
        syncSession({
          isPremium: Boolean(profile.is_premium),
          premiumUntil: profile.premium_until ?? null,
          createdAt: profile.created_at ?? null,
        });
      }
    } catch (loadError) {
      setError(normalizePaymentErrorMessage(loadError, "Failed to load payments. Please try again in a moment."));
    } finally {
      setRefreshing(false);
    }
  }, [api, syncPaymentStatuses, syncSession]);

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
      paymentStatusRef.current = {
        ...paymentStatusRef.current,
        [payment.id]: payment.status,
      };
      setPayments((current) => [payment, ...current.filter((item) => item.id !== payment.id)]);
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
      paymentStatusRef.current = {
        ...paymentStatusRef.current,
        [canceled.id]: canceled.status,
      };
      setPayments((current) => [canceled, ...current.filter((item) => item.id !== canceled.id)]);
    } catch (cancelError) {
      setError(normalizePaymentErrorMessage(cancelError, "Failed to cancel the invoice. Please try again in a moment."));
    }
  }

  async function handleCopyField(paymentId: string, field: "card" | "amount", value: string) {
    if (!value || value === "-") {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      const key = copyFieldKey(paymentId, field);
      setCopiedField(key);
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
      copyResetTimeoutRef.current = window.setTimeout(() => {
        setCopiedField((current) => (current === key ? null : current));
      }, 1800);
    } catch {
      setError("Clipboard copy failed.");
    }
  }

  return (
    <div className="space-y-4">
      <PricingPlanGrid
        plans={plans}
        mode="subscription"
        showStateCard={false}
        showPlanNotes={false}
        denseCards={true}
        showSubscriptionHeader={false}
        onChoosePlan={handleChoosePlan}
        paymentBusyPlanId={busyPlanId}
      />

      <Card className="rounded-[1.4rem] border-border/50">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 border-b border-border/50">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold tracking-tight">My payments</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose a plan, transfer the shown amount, then send the screenshot to Telegram support.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refreshPayments()} disabled={refreshing}>
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          {activePayment ? (
            <ActiveInvoiceCard
              payment={activePayment}
              copiedField={copiedField}
              onCopy={handleCopyField}
              onCancel={() => void handleCancelPayment(activePayment.id)}
            />
          ) : (
            <EmptyState
              compact
              icon="wallet"
              title="No active invoice"
              description="Choose a plan above to generate a payment invoice."
              className="border-dashed bg-muted/15 shadow-none"
            />
          )}

          <div className="space-y-3">
            {historyPayments.length === 0 ? (
              <EmptyState
                compact
                icon="clock3"
                title="No payment history yet"
                description="Archived invoices will appear here after you create or complete payments."
                className="border-dashed bg-muted/15 shadow-none"
              />
            ) : null}

            {historyPayments.map((payment) => (
              <div key={payment.id} className="grid gap-3 rounded-xl border border-border/60 px-4 py-3 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)_auto] md:items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone(payment.status)}>{payment.status}</Badge>
                    <span className="text-sm font-semibold text-foreground">{payment.planName}</span>
                  </div>
                  {payment.statusReason ? <p className="text-xs text-muted-foreground">{payment.statusReason}</p> : null}
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">{payment.amount}</p>
                  <p>{formatDateTime(payment.createdAt)}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {payment.updatedAt ? `Updated ${formatDateTime(payment.updatedAt)}` : ""}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
