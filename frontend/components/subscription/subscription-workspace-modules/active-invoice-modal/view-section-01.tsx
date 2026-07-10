"use client";
import type { ActiveInvoiceModalScope } from "./controller";
import { AlertTriangle, Button, Clock3, CreditCard, Info, MessageCircle, Send, ShieldCheck, UserPaymentRecord, X, trackPaymentProofClick } from "../dependencies";
import { ConfirmCancelDialog, CopyActionButton, PaymentCopyCard, PaymentStatusPill, copyFieldKey, formatCardPreview, telegramUrl } from "../shared";

export function ActiveInvoiceModalView1({ scope }: { scope: ActiveInvoiceModalScope }) {
  const { modalRef, confirmCancelOpen, setConfirmCancelOpen, confirmCancel, isCancelling, onClose, isTerminal, payment, planLabel, isActivated, supportContact, copiedField, copyPaymentField, cardValue, copyError, countdown } = scope;
  return (
    (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-[4px]">
          <div
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
            className="relative my-3 max-h-[calc(100dvh-1.5rem)] w-full max-w-[880px] overflow-y-auto rounded-[20px] border border-orange-200 bg-white shadow-[0_40px_120px_-36px_rgba(15,23,42,0.7)] outline-none dark:border-orange-500/25 dark:bg-slate-950"
          >
            {confirmCancelOpen ? (
              <ConfirmCancelDialog
                onKeep={() => setConfirmCancelOpen(false)}
                onConfirm={() => void confirmCancel()}
                isCancelling={isCancelling}
              />
            ) : null}
            <div className="h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400" />
            <button
              type="button"
              aria-label="Close payment modal"
              onClick={onClose}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
    
            <div className="p-4 sm:p-5 lg:p-6">
              <header className="max-w-3xl pr-12">
                <div className="flex flex-wrap items-center gap-2.5">
                  <PaymentStatusPill status={isTerminal ? "expired" as UserPaymentRecord["status"] : payment.status} />
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{planLabel}</span>
                </div>
                <h2 id="payment-modal-title" className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-[1.65rem]">
                  {isActivated ? "Premium activated" : "Complete your payment"}
                </h2>
                <p className="mt-1.5 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  {isActivated
                    ? "Your Premium plan is now active."
                    : isTerminal
                      ? "This invoice has expired. Please create a new invoice."
                      : "Transfer the amount below and send the receipt screenshot to Telegram support."}
                </p>
                <a
                  href={telegramUrl(supportContact)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200"
                >
                  <MessageCircle className="h-4 w-4" />
                  Support: <span className="text-orange-600 dark:text-orange-300">{supportContact}</span>
                </a>
              </header>
    
              <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
                <div className="flex h-full flex-col gap-2.5 rounded-[18px] border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-950">
                  <PaymentCopyCard
                    label="AMOUNT TO TRANSFER"
                    value={payment.amount}
                    accent
                    action={
                      <CopyActionButton
                        label="Copy amount"
                        copied={copiedField === copyFieldKey(payment.id, "amount")}
                        onClick={() => copyPaymentField("amount", payment.amount.replace(/[^\d]/g, ""))}
                      />
                    }
                  />
                  <PaymentCopyCard
                    label={payment.cardLabel ?? "HUMO"}
                    value={formatCardPreview(payment.cardNumber ?? "-")}
                    helperText="Azizbek Sobitov"
                    action={
                      <CopyActionButton
                        label="Copy card"
                        copied={copiedField === copyFieldKey(payment.id, "card")}
                        onClick={() => copyPaymentField("card", cardValue.replace(/\D/g, ""))}
                      />
                    }
                  />
    
                  <div className="flex min-h-[4.8rem] gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-sm font-medium leading-5 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
                    <p>
                      Transfer the shown amount to the card, then send the receipt screenshot to{" "}
                      <a href={telegramUrl(supportContact)} target="_blank" rel="noreferrer" className="font-bold text-orange-700 underline-offset-4 hover:underline dark:text-orange-300">
                        {supportContact}
                      </a>{" "}
                      on Telegram.
                    </p>
                  </div>
                  {copyError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
                      {copyError}
                    </div>
                  ) : null}
                </div>
    
                <aside className="flex h-full flex-col rounded-[18px] border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/65">
                  <div>
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
                        <Clock3 className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-slate-950 dark:text-white">
                          {isTerminal ? "Invoice expired" : isActivated ? "Premium activated" : `Valid for ${countdown}`}
                        </h3>
                        {isTerminal ? (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-300">This invoice has expired. Please create a new invoice.</p>
                        ) : null}
                      </div>
                    </div>
    
                    <div className="mt-2.5 space-y-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
                      <div className="flex gap-2">
                        <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                        <span>Transfer the amount to the card, then send a screenshot to Telegram support.</span>
                      </div>
                      <div className="flex gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <span>Premium is activated after support checks the screenshot.</span>
                      </div>
                    </div>
    
                    <div className="my-2.5 h-px bg-slate-200 dark:bg-slate-800" />
    
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">1</span>
                        <span className="text-sm font-bold text-slate-950 dark:text-white">Pay the amount</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">2</span>
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Send screenshot</span>
                      </div>
                    </div>
                  </div>
    
                  <div className="space-y-2 pt-3">
                    {isActivated ? (
                      <Button type="button" asChild className="h-9 w-full rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700">
                        <a href="/dashboard">Go to Dashboard</a>
                      </Button>
                    ) : isTerminal ? (
                      <Button type="button" onClick={onClose} className="h-9 w-full rounded-xl bg-orange-500 text-sm font-semibold text-white hover:bg-orange-600">
                        Create new invoice
                      </Button>
                    ) : (
                      <>
                        <Button type="button" asChild className="h-9 w-full rounded-xl bg-orange-500 text-sm font-semibold text-white shadow-[0_18px_36px_-20px_rgba(249,115,22,0.9)] hover:bg-orange-600">
                          <a
                            href={telegramUrl(supportContact)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => {
                              trackPaymentProofClick({
                                paymentId: payment.id,
                                supportContact,
                              });
                            }}
                          >
                            <Send className="h-4 w-4" />
                            Send screenshot
                          </a>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-full rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                          onClick={() => setConfirmCancelOpen(true)}
                        >
                          Cancel invoice
                        </Button>
                      </>
                    )}
                  </div>
                </aside>
              </div>
    
              <div className="mt-4 border-t border-slate-200 pt-3 text-center dark:border-slate-800">
                <p className="inline-flex items-center justify-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  This invoice will expire automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
  );
}
