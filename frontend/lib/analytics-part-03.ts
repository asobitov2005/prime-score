"use client";

import { pushDataLayerEvent, pushDataLayerEventOnce } from "./analytics-part-01";

export function trackBeginCheckout(payload: {
  paymentId: string;
  invoiceCode: string;
  planId: string | null;
  planName: string;
  durationDays: number | null;
  value: number | null;
  currency: string;
  discountValue: number | null;
}) {
  pushDataLayerEvent("begin_checkout", {
    currency: payload.currency,
    value: payload.value ?? undefined,
    invoice_code: payload.invoiceCode,
    payment_id: payload.paymentId,
    discount_value: payload.discountValue ?? undefined,
    items: [
      {
        item_id: payload.planId ?? payload.paymentId,
        item_name: payload.planName,
        item_category: "subscription",
        item_variant: payload.durationDays ? `${payload.durationDays}_days` : "subscription",
        price: payload.value ?? undefined,
        quantity: 1,
      },
    ],
  });
}

export function trackPaymentCanceled(payload: {
  paymentId: string;
  invoiceCode: string;
  planId: string | null;
  planName: string;
  value: number | null;
  currency: string;
}) {
  pushDataLayerEventOnce(`payment_cancel:${payload.paymentId}`, "payment_cancel", {
    payment_id: payload.paymentId,
    invoice_code: payload.invoiceCode,
    plan_id: payload.planId ?? undefined,
    plan_name: payload.planName,
    currency: payload.currency,
    value: payload.value ?? undefined,
  });
}

export function trackPaymentCopy(payload: {
  paymentId: string;
  field: "card" | "amount";
}) {
  pushDataLayerEvent("payment_detail_copy", {
    payment_id: payload.paymentId,
    copied_field: payload.field,
  });
}

export function trackPaymentProofClick(payload: {
  paymentId: string;
  supportContact: string;
}) {
  pushDataLayerEvent("payment_proof_click", {
    payment_id: payload.paymentId,
    support_contact: payload.supportContact,
    destination: `https://t.me/${payload.supportContact.replace(/^@/, "")}`,
  });
}

export function trackPaymentMatched(payload: {
  paymentId: string;
  invoiceCode: string;
  planId: string | null;
  planName: string;
  durationDays: number | null;
  value: number | null;
  currency: string;
}) {
  pushDataLayerEventOnce(`payment_matched:${payload.paymentId}`, "payment_matched", {
    payment_id: payload.paymentId,
    invoice_code: payload.invoiceCode,
    currency: payload.currency,
    value: payload.value ?? undefined,
    items: [
      {
        item_id: payload.planId ?? payload.paymentId,
        item_name: payload.planName,
        item_category: "subscription",
        item_variant: payload.durationDays ? `${payload.durationDays}_days` : "subscription",
        price: payload.value ?? undefined,
        quantity: 1,
      },
    ],
  });
}

export function trackPurchase(payload: {
  paymentId: string;
  invoiceCode: string;
  planId: string | null;
  planName: string;
  durationDays: number | null;
  value: number | null;
  currency: string;
  grantedUntil?: string | null;
}) {
  pushDataLayerEventOnce(`purchase:${payload.paymentId}`, "purchase", {
    transaction_id: payload.paymentId,
    invoice_code: payload.invoiceCode,
    currency: payload.currency,
    value: payload.value ?? undefined,
    subscription_until: payload.grantedUntil ?? undefined,
    items: [
      {
        item_id: payload.planId ?? payload.paymentId,
        item_name: payload.planName,
        item_category: "subscription",
        item_variant: payload.durationDays ? `${payload.durationDays}_days` : "subscription",
        price: payload.value ?? undefined,
        quantity: 1,
      },
    ],
  });
}
