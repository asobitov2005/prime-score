import { requestJson } from "@/lib/api/core";
import type {
  AdminPaymentCardSummary,
  AdminPaymentSettingsSummary,
  AdminPaymentSummary,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/types";

interface BackendPayment {
  id: string;
  invoice_code: string;
  user_name?: string | null;
  user_username?: string | null;
  plan_name: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number | string;
  card_number?: string | null;
  expires_at?: string | null;
  status_reason?: string | null;
  updated_at?: string | null;
}

interface BackendPaymentCard {
  id: string;
  label: string;
  card_number: string;
  card_type: string;
  holder_name?: string | null;
  is_active: boolean;
  priority: number;
}

interface BackendPaymentSettings {
  id: string;
  support_contact?: string | null;
}

export interface AdminPaymentCardInput {
  label: string;
  cardNumber: string;
  cardType: "humo" | "uzcard";
  holderName?: string | null;
  isActive?: boolean;
  priority?: number;
}

export interface AdminPaymentSettingsInput {
  supportContact?: string | null;
}

function mapPayment(payment: BackendPayment): AdminPaymentSummary {
  return {
    id: payment.id,
    invoiceCode: payment.invoice_code,
    user:
      payment.user_name ??
      (payment.user_username ? `@${payment.user_username}` : "Unknown user"),
    plan: payment.plan_name,
    method: payment.method,
    status: payment.status,
    amount:
      typeof payment.amount === "number"
        ? payment.amount.toLocaleString("en-US")
        : String(payment.amount),
    card: payment.card_number ?? "-",
    expiresAt: payment.expires_at ?? null,
    statusReason: payment.status_reason ?? null,
    updatedAt: payment.updated_at ?? new Date().toISOString(),
  };
}

function mapPaymentCard(card: BackendPaymentCard): AdminPaymentCardSummary {
  return {
    id: card.id,
    label: card.label,
    cardNumber: card.card_number,
    cardType: card.card_type,
    holderName: card.holder_name ?? null,
    isActive: card.is_active,
    priority: card.priority,
  };
}

function mapPaymentSettings(
  settings: BackendPaymentSettings,
): AdminPaymentSettingsSummary {
  return {
    id: settings.id,
    supportContact: settings.support_contact ?? null,
  };
}

export const paymentsApi = {
  async listPayments(
    page = 1,
    limit = 20,
  ): Promise<{ items: AdminPaymentSummary[]; total: number; page: number }> {
    const response = await requestJson<{
      items: BackendPayment[];
      total: number;
      page: number;
    }>(`/payments?page=${page}&limit=${limit}`);
    return {
      items: response.items.map(mapPayment),
      total: response.total,
      page: response.page,
    };
  },

  async updatePaymentStatus(
    paymentId: string,
    input: {
      status: Exclude<PaymentStatus, "paused" | "refunded">;
      statusReason?: string | null;
    },
  ): Promise<AdminPaymentSummary> {
    const response = await requestJson<BackendPayment>(
      `/payments/${paymentId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: input.status,
          status_reason: input.statusReason ?? null,
        }),
      },
    );
    return mapPayment(response);
  },

  async listPaymentCards(): Promise<AdminPaymentCardSummary[]> {
    const response = await requestJson<BackendPaymentCard[]>("/payment-cards");
    return response.map(mapPaymentCard);
  },

  async createPaymentCard(
    input: AdminPaymentCardInput,
  ): Promise<AdminPaymentCardSummary> {
    const response = await requestJson<BackendPaymentCard>("/payment-cards", {
      method: "POST",
      body: JSON.stringify({
        label: input.label,
        card_number: input.cardNumber,
        card_type: input.cardType,
        holder_name: input.holderName ?? null,
        is_active: input.isActive ?? false,
        priority: input.priority ?? 0,
      }),
    });
    return mapPaymentCard(response);
  },

  async updatePaymentCard(
    cardId: string,
    input: Partial<AdminPaymentCardInput>,
  ): Promise<AdminPaymentCardSummary> {
    const response = await requestJson<BackendPaymentCard>(
      `/payment-cards/${cardId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(input.cardNumber !== undefined
            ? { card_number: input.cardNumber }
            : {}),
          ...(input.cardType !== undefined
            ? { card_type: input.cardType }
            : {}),
          ...(input.holderName !== undefined
            ? { holder_name: input.holderName }
            : {}),
          ...(input.isActive !== undefined
            ? { is_active: input.isActive }
            : {}),
          ...(input.priority !== undefined
            ? { priority: input.priority }
            : {}),
        }),
      },
    );
    return mapPaymentCard(response);
  },

  async getPaymentSettings(): Promise<AdminPaymentSettingsSummary> {
    return mapPaymentSettings(
      await requestJson<BackendPaymentSettings>("/payment-settings"),
    );
  },

  async updatePaymentSettings(
    input: AdminPaymentSettingsInput,
  ): Promise<AdminPaymentSettingsSummary> {
    return mapPaymentSettings(
      await requestJson<BackendPaymentSettings>("/payment-settings", {
        method: "PATCH",
        body: JSON.stringify({
          ...(input.supportContact !== undefined
            ? { support_contact: input.supportContact }
            : {}),
        }),
      }),
    );
  },
};
