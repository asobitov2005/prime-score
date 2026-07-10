"use client";

import { Button, Loader2, UserPaymentRecord, cn } from "./dependencies";

import { useCountdown } from "./shared-part-01";



export function PaymentCopyCard({
  label,
  value,
  helperText,
  accent,
  action,
}: {
  label: string;
  value: string;
  helperText?: string;
  accent?: boolean;
  action: React.ReactNode;
}) {
  return (
    <div className={cn(
      "min-h-[4.85rem] rounded-2xl border p-3.5",
      accent
        ? "border-orange-200 bg-orange-50/80 dark:border-orange-500/25 dark:bg-orange-500/10"
        : "border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/65",
    )}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1.5 break-all font-mono text-[1.35rem] font-bold tracking-[-0.02em] text-slate-950 dark:text-white sm:text-[1.45rem]">
            {value}
          </p>
          {helperText ? (
            <p className="mt-1 text-sm font-semibold tracking-wide text-slate-600 dark:text-slate-300">
              {helperText}
            </p>
          ) : null}
        </div>
        <div className="shrink-0">{action}</div>
      </div>
    </div>
  );
}

export function PaymentStatusPill({ status }: { status: UserPaymentRecord["status"] }) {
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

export function ConfirmCancelDialog({
  onKeep,
  onConfirm,
  isCancelling,
}: {
  onKeep: () => void;
  onConfirm: () => void;
  isCancelling: boolean;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Cancel invoice?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          You can create a new invoice anytime by choosing a plan again.
        </p>
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

export function ActivePaymentNotice({
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
