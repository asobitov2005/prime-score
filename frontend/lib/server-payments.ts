import { requestServerUserApi } from "@/lib/server-user-auth";
import type { PaymentRecordResponse } from "@/lib/api/types";
import type { UserPaymentRecord } from "@/lib/types";

function formatAmount(value: string | number): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "0";
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

export async function getMyPayments(): Promise<UserPaymentRecord[]> {
  try {
    const payload = await requestServerUserApi<PaymentRecordResponse[]>("/me/payments");
    return payload.map(mapPaymentRecord);
  } catch {
    return [];
  }
}
