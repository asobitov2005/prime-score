"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, CreditCard, Loader2, RefreshCcw, Wallet } from "lucide-react";

import { PricingPlanGrid } from "@/components/marketing/pricing-plan-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { createApiClient, ApiError } from "@/lib/api/client";
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

function formatTimeLeft(value: string | null): string {
  if (!value) {
    return "Expired";
  }
  const diff = new Date(value).getTime() - Date.now();
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
  const [wheelOpen, setWheelOpen] = useState(false);
  const [wheelPayment, setWheelPayment] = useState<UserPaymentRecord | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const activePayment = useMemo(
    () => payments.find((item) => item.status === "pending" || item.status === "matched") ?? null,
    [payments],
  );

  async function refreshPayments() {
    setRefreshing(true);
    try {
      const items = await api.listPayments();
      const mapped = items.map(mapPaymentRecord);
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
  }

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshPayments();
    }, 20000);
    return () => window.clearInterval(intervalId);
  }, []);

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

  async function handleChoosePlan(plan: MarketingPlan) {
    setBusyPlanId(plan.id);
    setError(null);
    try {
      const payload = await api.createPayment({ plan_id: plan.id });
      const payment = mapPaymentRecord(payload.payment);
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
      setPayments((current) => [canceled, ...current.filter((item) => item.id !== canceled.id)]);
    } catch (cancelError) {
      const message = cancelError instanceof ApiError ? cancelError.message : "Failed to cancel invoice.";
      setError(message);
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
            <Card className="rounded-[1.2rem] border-primary/20 bg-primary/5">
              <CardContent className="grid gap-4 p-4 md:grid-cols-[1.4fr_1fr_auto] md:items-center">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone(activePayment.status)}>{activePayment.status}</Badge>
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {activePayment.planName}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-semibold tracking-tight text-foreground">{activePayment.amount}</p>
                    <p className="text-sm text-muted-foreground">
                      Card: <span className="font-semibold text-foreground">{activePayment.cardNumber ?? "-"}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Invoice code: <span className="font-semibold text-foreground">{activePayment.invoiceCode}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-primary" />
                    <span>Expires in {formatTimeLeft(activePayment.expiresAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span>{activePayment.statusReason ?? "Pay the exact shown amount."}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Exact amount is required or auto-detection may fail.</span>
                  </div>
                </div>

                <Button type="button" variant="outline" onClick={() => void handleCancelPayment(activePayment.id)}>
                  Cancel invoice
                </Button>
              </CardContent>
            </Card>
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
                  <p>Expires in {formatTimeLeft(wheelPayment.expiresAt)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Exact {wheelPayment.amount} amountini tashlang. Kam yoki ko‘p to‘lov qilinsa auto-detection ishlamasligi mumkin.
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
