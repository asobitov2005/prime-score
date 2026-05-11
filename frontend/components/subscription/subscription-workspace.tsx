"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, Clock3, Copy, Loader2, RefreshCcw, Wallet, Zap } from "lucide-react";

import { PricingPlanGrid } from "@/components/marketing/pricing-plan-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { createApiClient, ApiError } from "@/lib/api/client";
import {
  parseAnalyticsAmount,
  trackBeginCheckout,
  trackPaymentMatched,
  trackPurchase,
} from "@/lib/analytics";
import type { PaymentRecordResponse } from "@/lib/api/types";
import type { MarketingPlan } from "@/lib/server-plans";
import type { UserPaymentRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { usePaymentSSE, type PaymentSSEEvent } from "@/lib/use-payment-sse";

/* ────── Helpers ────── */

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
    wheelOptions: (payload.wheel_options ?? []).map((item) => formatAmount(item)),
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
    return "Expired";
  }
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) {
    return "Expired";
  }
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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

function copyFieldKey(paymentId: string, field: "card" | "invoice"): string {
  return `${paymentId}:${field}`;
}

function normalizePaymentErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  const message = error.message?.trim();
  if (!message) {
    return fallback;
  }

  if (message.startsWith("Request failed for /me/payments/")) {
    return fallback;
  }

  return message;
}

type CircularWheelConfig = {
  options: string[];
  winningIndex: number;
  finalRotation: number;
  durationMs: number;
};

function parseFormattedAmount(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }

  const normalized = String(value ?? "").replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildCircularWheel(options: string[], winningAmount: string): CircularWheelConfig {
  const safeOptions = options.length > 0 ? options : [winningAmount];
  const winningIndex = Math.max(0, safeOptions.findIndex((item) => item === winningAmount));
  const sliceAngle = 360 / safeOptions.length;

  return {
    options: safeOptions,
    winningIndex,
    finalRotation: 360 * 18 - (winningIndex * sliceAngle) - (sliceAngle / 2),
    durationMs: 10000,
  };
}

function buildWheelBackground(sliceCount: number): string {
  if (sliceCount <= 1) {
    return "radial-gradient(circle at center, rgba(255,255,255,0.08), rgba(2,6,23,0.92) 74%)";
  }

  const segments = Array.from({ length: sliceCount }, (_, index) => {
    const start = (index * 360) / sliceCount;
    const end = ((index + 1) * 360) / sliceCount;
    const color = index % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.15)";
    return `${color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

/* ────── Real-time countdown hook ────── */

function useCountdown(expiresAt: string | null): string {
  const [timeLeft, setTimeLeft] = useState(() => computeTimeLeft(expiresAt));

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft("Expired");
      return;
    }

    // Immediately compute
    setTimeLeft(computeTimeLeft(expiresAt));

    const intervalId = window.setInterval(() => {
      const next = computeTimeLeft(expiresAt);
      setTimeLeft(next);
      if (next === "Expired") {
        window.clearInterval(intervalId);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [expiresAt]);

  return timeLeft;
}

/* ────── SSE event notification banner ────── */

type EventNotification = {
  id: number;
  type: "matched" | "completed" | "expired";
  message: string;
};

function EventNotificationBanner({ notification, onDismiss }: { notification: EventNotification; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const config = {
    matched: {
      icon: Zap,
      bg: "border-blue-200 bg-blue-50 text-blue-800",
      iconColor: "text-blue-600",
    },
    completed: {
      icon: CheckCircle2,
      bg: "border-emerald-200 bg-emerald-50 text-emerald-800",
      iconColor: "text-emerald-600",
    },
    expired: {
      icon: Clock3,
      bg: "border-amber-200 bg-amber-50 text-amber-800",
      iconColor: "text-amber-600",
    },
  }[notification.type];

  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300",
      config.bg,
    )}>
      <Icon className={cn("h-5 w-5 shrink-0", config.iconColor)} />
      <span className="flex-1">{notification.message}</span>
      <button type="button" onClick={onDismiss} className="shrink-0 text-xs opacity-60 hover:opacity-100">
        Dismiss
      </button>
    </div>
  );
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
    <div className={cn(
      "rounded-2xl border px-4 py-3",
      accent ? "border-primary/20 bg-primary/10" : "border-border/60 bg-background/90",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
          <p className="mt-2 break-all font-mono text-base font-semibold tracking-[0.18em] text-foreground sm:text-lg">
            {value}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

/* ────── Active Invoice Card ────── */

function ActiveInvoiceCard({
  payment,
  copiedField,
  onCopy,
  onCancel,
}: {
  payment: UserPaymentRecord;
  copiedField: string | null;
  onCopy: (paymentId: string, field: "card" | "invoice", value: string) => void;
  onCancel: () => void;
}) {
  const countdown = useCountdown(payment.expiresAt);
  const isExpired = countdown === "Expired";
  const cardValue = payment.cardNumber ?? "-";

  return (
    <Card className="overflow-hidden rounded-[1.4rem] border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.12),transparent_22%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.14),transparent_34%),linear-gradient(180deg,#111a2d_0%,#0b1220_100%)] shadow-[0_28px_70px_rgba(2,6,23,0.28)]">
      <CardContent className="grid gap-5 p-4 md:p-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(payment.status)}>{payment.status}</Badge>
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              {payment.planName}
            </span>
            <Badge tone="outline">{payment.amount}</Badge>
          </div>
          <div className="grid gap-3">
            <PaymentDetailCard
              eyebrow="Card Number"
              value={formatCardPreview(payment.cardNumber ?? "-")}
              accent={true}
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
            Auto-detection works only for the exact amount. Keep the card number visible and copy it directly.
          </div>
        </div>

        <div className="flex h-full flex-col justify-between gap-4 rounded-[1.25rem] border border-white/8 bg-white/8 p-4 backdrop-blur-sm">
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <Clock3 className={cn("h-4 w-4", isExpired ? "text-red-500" : "text-primary")} />
              <span className={cn("font-medium", isExpired && "text-red-400")}>
                {isExpired ? "Invoice expired" : `Expires in ${countdown}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span>{payment.statusReason ?? "Pay the exact shown amount."}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>Paying less or more may cause the detector to miss the payment.</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Amount to pay</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{payment.amount}</p>
            </div>
            <Button type="button" variant="outline" className="w-full border-white/10 bg-black/30 text-white hover:bg-white/10 hover:text-white" onClick={onCancel} disabled={isExpired}>
              Cancel invoice
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────── Main Component ────── */

export function SubscriptionWorkspace({
  plans,
  initialPayments,
}: {
  plans: MarketingPlan[];
  initialPayments: UserPaymentRecord[];
}) {
  const api = useMemo(() => createApiClient(), []);
  const syncSession = useAuthStore((state) => state.syncSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [payments, setPayments] = useState<UserPaymentRecord[]>(initialPayments);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [wheelPayment, setWheelPayment] = useState<UserPaymentRecord | null>(null);
  const [wheelConfig, setWheelConfig] = useState<CircularWheelConfig | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelSettled, setWheelSettled] = useState(false);
  const [notifications, setNotifications] = useState<EventNotification[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const notifIdRef = useRef(0);
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

  const hasActiveInvoice = activePayment !== null;

  const syncPaymentStatuses = useCallback((nextPayments: UserPaymentRecord[], emitEvents: boolean) => {
    const previousStatuses = paymentStatusRef.current;

    if (emitEvents) {
      for (const payment of nextPayments) {
        const previousStatus = previousStatuses[payment.id];
        if (!previousStatus || previousStatus === payment.status) {
          continue;
        }

        if (payment.status === "matched") {
          trackPaymentMatched({
            paymentId: payment.id,
            invoiceCode: payment.invoiceCode,
            planId: payment.planId,
            planName: payment.planName,
            durationDays: payment.durationDays,
            value: parseAnalyticsAmount(payment.amount),
            currency: payment.currency,
          });
        }

        if (payment.status === "completed") {
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

  /* ── Data refresh (used as fallback and for initial load after SSE events) ── */

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
      const message = normalizePaymentErrorMessage(loadError, "Failed to load payments. Please try again in a moment.");
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [api, syncPaymentStatuses, syncSession]);

  /* ── SSE real-time events ── */

  const addNotification = useCallback((type: EventNotification["type"], message: string) => {
    notifIdRef.current += 1;
    const id = notifIdRef.current;
    setNotifications((prev) => [...prev.slice(-2), { id, type, message }]);
  }, []);

  const handleSSEEvent = useCallback(
    (event: PaymentSSEEvent) => {
      if (event.type === "connected") {
        return;
      }

      if (event.type === "payment_matched") {
        addNotification("matched", "Payment detected. Verification is in progress...");
        const matchedPayment = payments.find((item) => item.id === event.paymentId || item.invoiceCode === event.invoiceCode);
        if (matchedPayment) {
          trackPaymentMatched({
            paymentId: matchedPayment.id,
            invoiceCode: matchedPayment.invoiceCode,
            planId: matchedPayment.planId,
            planName: matchedPayment.planName,
            durationDays: matchedPayment.durationDays,
            value: parseAnalyticsAmount(matchedPayment.amount),
            currency: matchedPayment.currency,
          });
        }
        void refreshPayments();
      }

      if (event.type === "payment_completed") {
        addNotification("completed", `Premium activated. ${event.planName ?? "Plan"} — active until ${event.grantedUntil ? new Date(event.grantedUntil).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"}.`);
        syncSession({ isPremium: true, premiumUntil: event.grantedUntil ?? null });
        const completedPayment = payments.find((item) => item.id === event.paymentId || item.invoiceCode === event.invoiceCode);
        if (completedPayment) {
          trackPurchase({
            paymentId: completedPayment.id,
            invoiceCode: completedPayment.invoiceCode,
            planId: completedPayment.planId,
            planName: completedPayment.planName,
            durationDays: completedPayment.durationDays,
            value: parseAnalyticsAmount(completedPayment.amount),
            currency: completedPayment.currency,
            grantedUntil: event.grantedUntil ?? completedPayment.grantedUntil,
          });
        }
        void refreshPayments();
      }

      if (event.type === "payment_expired") {
        addNotification("expired", "The invoice has expired.");
        void refreshPayments();
      }
    },
    [addNotification, payments, refreshPayments, syncSession],
  );

  usePaymentSSE({
    onEvent: handleSSEEvent,
    enabled: isAuthenticated && hasActiveInvoice,
  });

  /* ── Fallback polling (only when SSE not active or no active invoice) ── */

  useEffect(() => {
    // Light polling as fallback — 60s instead of 20s since SSE handles real-time
    const intervalId = window.setInterval(() => {
      void refreshPayments();
    }, 60000);
    return () => window.clearInterval(intervalId);
  }, [refreshPayments]);

  /* ── Wheel animation ── */

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!wheelOpen || !wheelPayment) {
      return;
    }

    const nextConfig = buildCircularWheel(wheelPayment.wheelOptions, wheelPayment.amount);
    setWheelConfig(nextConfig);
    setWheelRotation(0);
    setWheelSettled(false);
    const startTimeoutId = window.setTimeout(() => {
      setWheelRotation(nextConfig.finalRotation);
    }, 60);
    const settleTimeoutId = window.setTimeout(() => {
      setWheelSettled(true);
    }, nextConfig.durationMs + 180);

    return () => {
      window.clearTimeout(startTimeoutId);
      window.clearTimeout(settleTimeoutId);
    };
  }, [wheelOpen, wheelPayment]);

  /* ── Actions ── */

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
      setWheelPayment(payment);
      setWheelOpen(true);
    } catch (createError) {
      const message = normalizePaymentErrorMessage(createError, "Failed to create the invoice. Please try again.");
      setError(message);
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
      const message = normalizePaymentErrorMessage(cancelError, "Failed to cancel the invoice. Please try again in a moment.");
      setError(message);
    }
  }

  async function handleCopyField(paymentId: string, field: "card" | "invoice", value: string) {
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

  function dismissNotification(id: number) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
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

      {/* SSE event notifications */}
      {notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <EventNotificationBanner
              key={notif.id}
              notification={notif}
              onDismiss={() => dismissNotification(notif.id)}
            />
          ))}
        </div>
      ) : null}

      <Card className="rounded-[1.4rem] border-border/50">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 border-b border-border/50">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold tracking-tight">My payments</CardTitle>
            <p className="text-sm text-muted-foreground">
              Only active invoices stay visible here. Paid subscriptions are tracked through your premium access, not this list.
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
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No active invoice right now. Choose a plan above to generate one.
            </div>
          )}

          <div className="space-y-3">
            {historyPayments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No recent archived invoices.
              </div>
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

      <Dialog
        open={wheelOpen}
        onOpenChange={setWheelOpen}
        title={wheelPayment && wheelSettled ? `You won ${wheelPayment.discountAmount} off` : "Lucky Spin"}
        description={wheelPayment && wheelSettled ? `Final amount: ${wheelPayment.amount}` : "Spinning the wheel..."}
        className="max-w-[920px]"
      >
        {wheelPayment ? (
          <WheelDialogContent
            wheelPayment={wheelPayment}
            wheelConfig={wheelConfig}
            wheelRotation={wheelRotation}
            wheelSettled={wheelSettled}
            copiedField={copiedField}
            onCopy={handleCopyField}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

/* ────── Wheel Dialog Content (with live countdown) ────── */

function WheelDialogContent({
  wheelPayment,
  wheelConfig,
  wheelRotation,
  wheelSettled,
  copiedField,
  onCopy,
}: {
  wheelPayment: UserPaymentRecord;
  wheelConfig: CircularWheelConfig | null;
  wheelRotation: number;
  wheelSettled: boolean;
  copiedField: string | null;
  onCopy: (paymentId: string, field: "card" | "invoice", value: string) => void;
}) {
  const countdown = useCountdown(wheelPayment.expiresAt);
  const cardValue = wheelPayment.cardNumber ?? "-";
  const allAmounts = wheelPayment.wheelOptions.length > 0 ? wheelPayment.wheelOptions : [wheelPayment.amount];
  const amountNumbers = allAmounts.map(parseFormattedAmount).filter((value) => value > 0);
  const minAmount = amountNumbers.length > 0 ? formatAmount(Math.min(...amountNumbers)) : wheelPayment.amount;
  const maxAmount = amountNumbers.length > 0 ? formatAmount(Math.max(...amountNumbers)) : wheelPayment.amount;
  const maxSavingsValue = Math.max(0, parseFormattedAmount(wheelPayment.baseAmount) - Math.min(...(amountNumbers.length > 0 ? amountNumbers : [parseFormattedAmount(wheelPayment.amount)])));
  const maxSavings = formatAmount(maxSavingsValue);
  const activeWheel = wheelConfig ?? buildCircularWheel(allAmounts, wheelPayment.amount);
  const sliceAngle = 360 / activeWheel.options.length;

  return (
    <>
      <style>{`
        @keyframes wowFlash {
          0% { opacity: 0.8; background-color: white; }
          100% { opacity: 0; background-color: white; visibility: hidden; }
        }
        @keyframes wowPop {
          0% { transform: scale(0.9); opacity: 0.8; }
          40% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spinRays {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>

      {/* Screen Flash Effect */}
      {wheelSettled && (
        <div className="pointer-events-none absolute inset-[-50px] z-50 animate-[wowFlash_0.8s_ease-out_forwards] mix-blend-overlay rounded-[2rem]" />
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,380px)_minmax(0,1fr)] md:items-start pt-2 relative">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-slate-900 to-[#02040a] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        {/* Glow effect behind the wheel */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-primary/10 blur-[80px]" />
        
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary/80">Lucky Spin</p>
            <p className="mt-1.5 text-sm font-medium text-slate-300">Possible amounts: {minAmount} to {maxAmount}</p>
          </div>
        </div>

        <div className="relative mt-10 mb-4 flex justify-center z-10">
          {/* Wheel Pointer */}
          <div className="absolute -top-5 left-1/2 z-30 -translate-x-1/2 flex flex-col items-center drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
             <div className="h-2.5 w-8 rounded-full bg-gradient-to-b from-slate-200 to-slate-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]" />
             <div className="h-0 w-0 border-x-[12px] border-t-[22px] border-x-transparent border-t-primary drop-shadow-[0_2px_6px_rgba(249,115,22,0.5)] -mt-1" />
          </div>

          <div className="relative mx-auto h-[260px] w-[260px] sm:h-[320px] sm:w-[320px]">
             {/* Wheel border glow */}
             <div className="absolute inset-[-6px] rounded-full bg-gradient-to-b from-primary/40 to-transparent blur-md" />
             {/* Wheel outer metallic rim */}
             <div className="absolute inset-[-4px] rounded-full bg-gradient-to-b from-slate-600 via-slate-800 to-slate-900 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]" />
             
             {/* Wheel */}
             <div
               className="absolute inset-0 overflow-hidden rounded-full shadow-[inset_0_4px_12px_rgba(0,0,0,0.8),0_8px_24px_rgba(0,0,0,0.6)]"
               style={{
                 backgroundImage: `${buildWheelBackground(activeWheel.options.length)}, radial-gradient(circle at 30% 30%, #334155, #020617)`,
                 transform: `rotate(${wheelRotation}deg)`,
                 transitionProperty: "transform",
                 transitionDuration: `${activeWheel.durationMs}ms`,
                 transitionTimingFunction: "cubic-bezier(0.12, 0.92, 0.2, 1)",
               }}
             >
              {activeWheel.options.map((option, index) => {
                const angle = index * sliceAngle;
                const isWinner = index === activeWheel.winningIndex && wheelSettled;

                return (
                  <div
                    key={`${wheelPayment.id}-${option}-${index}`}
                    className="absolute inset-0"
                    style={{
                      transform: `rotate(${angle + sliceAngle / 2 - 90}deg)`,
                    }}
                  >
                    <div className="absolute top-1/2 left-1/2 flex w-[130px] -translate-y-1/2 items-center justify-end pr-4 sm:w-[160px] sm:pr-6">
                      <span
                        className={cn(
                          "text-xs font-bold tracking-tight transition-all duration-300 sm:text-sm",
                          isWinner
                            ? "animate-[wowPop_0.6s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards] text-white drop-shadow-[0_0_15px_rgba(249,115,22,1)]"
                            : "text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                        )}
                      >
                        {option}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Center Pin */}
            <div className="absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-[#1e293b] bg-[linear-gradient(145deg,#334155,#020617)] shadow-[0_8px_16px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2)] sm:h-20 sm:w-20">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Win</p>
                <p className="text-sm font-bold tracking-tight text-white drop-shadow-md sm:text-base">
                  {wheelSettled ? wheelPayment.discountAmount : "???"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className={cn(
          "relative overflow-hidden rounded-[2rem] border bg-black/40 px-6 py-8 text-center backdrop-blur-xl transition-all duration-700",
          wheelSettled ? "animate-[wowPop_0.6s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards] border-primary/40 shadow-[0_0_60px_rgba(249,115,22,0.25)]" : "border-white/10 opacity-90"
        )}>
          {/* Spinning rays behind the winner card */}
          {wheelSettled && (
            <div 
              className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] animate-[spinRays_20s_linear_infinite]"
              style={{ background: "repeating-conic-gradient(from 0deg, transparent 0deg 15deg, rgba(249,115,22,0.08) 15deg 30deg)" }}
            />
          )}
          {/* Animated background glow for winner */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent transition-opacity duration-1000",
            wheelSettled ? "opacity-100" : "opacity-0"
          )} />
          
          <div className="relative z-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">
              {wheelSettled ? "You Won" : "Spinning..."}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className={cn(
                "text-4xl font-black tracking-tight text-white transition-all duration-700 sm:text-5xl",
                wheelSettled ? "animate-[wowPop_0.8s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards] drop-shadow-[0_0_20px_rgba(249,115,22,0.8)]" : "scale-100 opacity-40 blur-[2px] animate-pulse"
              )}>
                {wheelSettled ? `-${wheelPayment.discountAmount}` : "???"}
              </span>
            </div>
            
            <div className="mt-8 mb-6 h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Final Amount to Pay</p>
            <p className={cn(
              "mt-3 text-3xl font-bold tracking-tight transition-all duration-700",
              wheelSettled ? "text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.2)]" : "text-slate-600 animate-pulse"
            )}>
              {wheelSettled ? wheelPayment.amount : "Waiting..."}
            </p>
            <div className="mt-5 inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-300">
              Pay this exact amount to activate premium
            </div>
          </div>
        </div>

        <div className={cn(
          "grid gap-3 rounded-2xl border border-border/60 bg-background p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end transition-all duration-700",
          wheelSettled ? "opacity-100" : "pointer-events-none opacity-40 blur-[2px]"
        )}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Card number</p>
              <p className="mt-2 break-all font-mono text-lg font-semibold tracking-[0.16em] text-foreground">
                {formatCardPreview(wheelPayment.cardNumber ?? "-")}
              </p>
              <p className={cn("mt-3 text-sm text-muted-foreground", countdown === "Expired" && "font-semibold text-red-600")}>
                {countdown === "Expired" ? "Invoice expired" : `Expires in ${countdown}`}
              </p>
            </div>
          </div>
          <CopyActionButton
            label="Copy card"
            copied={copiedField === copyFieldKey(wheelPayment.id, "card")}
            onClick={() => onCopy(wheelPayment.id, "card", cardValue)}
          />
        </div>

        <div className={cn(
          "rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-700",
          wheelSettled ? "border-amber-200 bg-amber-50 text-amber-800" : "border-amber-200/50 bg-amber-50/50 text-amber-800/60 blur-[1px]"
        )}>
          {wheelSettled
            ? `Pay the exact ${wheelPayment.amount}. Paying less or more may prevent auto-detection from working.`
            : "Wait for the wheel to stop to get your final payment amount."}
        </div>
      </div>
      </div>
    </>
  );
}
