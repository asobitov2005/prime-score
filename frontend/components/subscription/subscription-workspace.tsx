"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, CreditCard, Loader2, RefreshCcw, Wallet, Zap } from "lucide-react";

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

/* ────── Active Invoice Card ────── */

function ActiveInvoiceCard({
  payment,
  onCancel,
}: {
  payment: UserPaymentRecord;
  onCancel: () => void;
}) {
  const countdown = useCountdown(payment.expiresAt);
  const isExpired = countdown === "Expired";

  return (
    <Card className="rounded-[1.2rem] border-primary/20 bg-primary/5">
      <CardContent className="grid gap-4 p-4 md:grid-cols-[1.4fr_1fr_auto] md:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(payment.status)}>{payment.status}</Badge>
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {payment.planName}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-semibold tracking-tight text-foreground">{payment.amount}</p>
            <p className="text-sm text-muted-foreground">
              Card: <span className="font-semibold text-foreground">{payment.cardNumber ?? "-"}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Invoice code: <span className="font-semibold text-foreground">{payment.invoiceCode}</span>
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock3 className={cn("h-4 w-4", isExpired ? "text-red-500" : "text-primary")} />
            <span className={cn(isExpired && "font-semibold text-red-600")}>
              {isExpired ? "Invoice expired" : `Expires in ${countdown}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span>{payment.statusReason ?? "Pay the exact shown amount."}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Exact amount is required or auto-detection may fail.</span>
          </div>
        </div>

        <Button type="button" variant="outline" onClick={onCancel} disabled={isExpired}>
          Cancel invoice
        </Button>
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
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [notifications, setNotifications] = useState<EventNotification[]>([]);
  const notifIdRef = useRef(0);
  const paymentStatusRef = useRef<Record<string, UserPaymentRecord["status"]>>(
    Object.fromEntries(initialPayments.map((item) => [item.id, item.status])),
  );

  const activePayment = useMemo(
    () => payments.find((item) => item.status === "pending" || item.status === "matched") ?? null,
    [payments],
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
      const items = await api.listPayments();
      const mapped = items.map(mapPaymentRecord);
      syncPaymentStatuses(mapped, true);
      setPayments(mapped);
      const completed = mapped.find((item) => item.status === "completed" && item.grantedUntil);
      if (completed?.grantedUntil) {
        syncSession({ isPremium: true, premiumUntil: completed.grantedUntil });
      }
    } catch (loadError) {
      const message = loadError instanceof ApiError ? loadError.message : "Failed to refresh payments.";
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
        addNotification("matched", `To'lov aniqlandi! Invoice ${event.invoiceCode} tekshirilmoqda...`);
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
        addNotification("completed", `Premium faollashtirildi! ${event.planName ?? "Plan"} — ${event.grantedUntil ? new Date(event.grantedUntil).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : ""} gacha.`);
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
        addNotification("expired", `Invoice ${event.invoiceCode} muddati tugadi.`);
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
    if (!wheelOpen || !wheelPayment || wheelPayment.wheelOptions.length === 0) {
      return;
    }

    const winnerIndex = Math.max(0, wheelPayment.wheelOptions.findIndex((item) => item === wheelPayment.amount));
    let step = 0;
    const totalSteps = wheelPayment.wheelOptions.length * 3 + winnerIndex;
    const intervalId = window.setInterval(() => {
      step += 1;
      setHighlightIndex(step % wheelPayment.wheelOptions.length);
      if (step >= totalSteps) {
        window.clearInterval(intervalId);
        setHighlightIndex(winnerIndex);
      }
    }, 90);

    return () => window.clearInterval(intervalId);
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
      setHighlightIndex(0);
      setWheelOpen(true);
    } catch (createError) {
      const message = createError instanceof ApiError ? createError.message : "Failed to create invoice.";
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
      const message = cancelError instanceof ApiError ? cancelError.message : "Failed to cancel invoice.";
      setError(message);
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
              Exact card and amount stay here. Auto-detection works only for the shown amount.
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
              onCancel={() => void handleCancelPayment(activePayment.id)}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No active invoice right now. Choose a plan above to generate one.
            </div>
          )}

          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="grid gap-3 rounded-xl border border-border/60 px-4 py-3 md:grid-cols-[1.3fr_1fr_auto] md:items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone(payment.status)}>{payment.status}</Badge>
                    <span className="text-sm font-semibold text-foreground">{payment.planName}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {payment.cardNumber ?? "-"} • {payment.invoiceCode}
                  </p>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">{payment.amount}</p>
                  <p>{formatDateTime(payment.createdAt)}</p>
                </div>
                {payment.status === "completed" ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Active until {payment.grantedUntil ? formatDateTime(payment.grantedUntil) : "-"}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={wheelOpen}
        onOpenChange={setWheelOpen}
        title="Invoice generated"
        description="The wheel result came from the backend. Pay the exact final amount shown below."
        className="max-w-2xl"
      >
        {wheelPayment ? (
          <WheelDialogContent
            wheelPayment={wheelPayment}
            highlightIndex={highlightIndex}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

/* ────── Wheel Dialog Content (with live countdown) ────── */

function WheelDialogContent({
  wheelPayment,
  highlightIndex,
}: {
  wheelPayment: UserPaymentRecord;
  highlightIndex: number;
}) {
  const countdown = useCountdown(wheelPayment.expiresAt);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
        <div className="grid gap-2 md:grid-cols-3">
          {wheelPayment.wheelOptions.map((option, index) => (
            <div
              key={`${wheelPayment.id}-${option}-${index}`}
              className={cn(
                "rounded-xl border px-3 py-3 text-center text-sm font-semibold transition-all",
                index === highlightIndex
                  ? "border-primary bg-primary text-primary-foreground shadow-lg"
                  : "border-border/60 bg-background text-foreground",
              )}
            >
              {option}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-background p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Final amount</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{wheelPayment.amount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Discount from current plan price: {wheelPayment.discountAmount}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Payment details</p>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> {wheelPayment.cardNumber ?? "-"}</p>
            <p>Invoice: {wheelPayment.invoiceCode}</p>
            <p className={cn(countdown === "Expired" && "font-semibold text-red-600")}>
              {countdown === "Expired" ? "Invoice expired" : `Expires in ${countdown}`}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
        Exact {wheelPayment.amount} amountini tashlang. Kam yoki ko&apos;p to&apos;lov qilinsa auto-detection ishlamasligi mumkin.
      </div>
    </div>
  );
}
