"use client";

import { AdminPaymentCardSummary, AdminPaymentSettingsSummary, AdminPaymentSummary, PaymentStatus } from "./dependencies";



export type PaymentManagerProps = {
  initialPayments: AdminPaymentSummary[];
  totalPayments: number;
  currentPage: number;
  initialCards: AdminPaymentCardSummary[];
  initialSettings: AdminPaymentSettingsSummary | null;
};

export type NoticeState = {
  tone: "success" | "warning";
  title: string;
  description: string;
} | null;

export type PaymentDraft = {
  status: Exclude<PaymentStatus, "paused" | "refunded">;
  statusReason: string;
};

export type SettingsDraft = {
  supportContact: string;
};

export type CardDraft = {
  label: string;
  cardNumber: string;
  cardType: "humo" | "uzcard";
  holderName: string;
  priority: string;
  isActive: boolean;
};

export const PAYMENT_STATUS_OPTIONS: Array<Exclude<PaymentStatus, "paused" | "refunded">> = [
  "pending",
  "matched",
  "completed",
  "review",
  "failed",
  "expired",
  "canceled",
];

export function createSettingsDraft(settings: AdminPaymentSettingsSummary | null): SettingsDraft {
  return {
    supportContact: settings?.supportContact ?? "@TheBugCreator",
  };
}

export function createCardDraft(): CardDraft {
  return {
    label: "",
    cardNumber: "",
    cardType: "humo",
    holderName: "",
    priority: "0",
    isActive: false,
  };
}

export function createPaymentDrafts(payments: AdminPaymentSummary[]): Record<string, PaymentDraft> {
  return Object.fromEntries(
    payments.map((payment) => [
      payment.id,
      {
        status: payment.status === "paused" || payment.status === "refunded" ? "review" : payment.status,
        statusReason: payment.statusReason ?? "",
      },
    ]),
  );
}

export function toneForStatus(status: PaymentStatus): "neutral" | "success" | "warning" | "danger" | "paused" {
  if (status === "completed") {
    return "success";
  }
  if (status === "pending" || status === "matched") {
    return "warning";
  }
  if (status === "failed" || status === "review") {
    return "danger";
  }
  if (status === "expired" || status === "canceled" || status === "paused") {
    return "paused";
  }
  return "neutral";
}

export function formatDateTime(value: string | null): string {
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
