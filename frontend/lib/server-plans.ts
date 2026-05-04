import { FRONTEND_API_TIMEOUT_MS, getFrontendServerApiBaseUrl } from "@/lib/api-base";

const baseUrl = getFrontendServerApiBaseUrl();

type BackendPublicPlan = {
  id: string;
  name: string;
  duration_days: number;
  price: string | number;
  currency?: string;
  discount_percent?: number;
  badge_label?: string | null;
  perks?: string[];
  display_order?: number;
  is_featured?: boolean;
  payment_paused?: boolean;
};

export interface MarketingPlan {
  id: string;
  title: string;
  durationDays: number;
  priceLabel: string;
  monthlyLabel: string;
  badgeLabel: string;
  perks: string[];
  currency: string;
  numericPrice: number;
  displayOrder: number;
  isFeatured: boolean;
}

function toNumber(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number, currency: string): string {
  if (currency === "UZS") {
    return `${Math.round(value).toLocaleString("en-US").replace(/,/g, " ")} sum`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function mapBackendPlan(payload: BackendPublicPlan): MarketingPlan {
  const currency = payload.currency ?? "UZS";
  const numericPrice = toNumber(payload.price);
  const monthlyEquivalent = payload.duration_days > 0
    ? (numericPrice / payload.duration_days) * 30
    : numericPrice;
  const perks = Array.isArray(payload.perks)
    ? payload.perks.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];

  return {
    id: payload.id,
    title: payload.name,
    durationDays: payload.duration_days,
    priceLabel: formatMoney(numericPrice, currency),
    monthlyLabel: payload.duration_days <= 30 ? "" : `${formatMoney(monthlyEquivalent, currency)} / 30 days`,
    badgeLabel: (payload.badge_label ?? "").trim() || "Premium Plan",
    perks,
    currency,
    numericPrice,
    displayOrder: payload.display_order ?? 0,
    isFeatured: Boolean(payload.is_featured),
  };
}

export async function getPublicPlans(): Promise<MarketingPlan[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FRONTEND_API_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/plans`, {
        next: {
          revalidate: 3600,
          tags: ["public-plans"],
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error("Failed to load public plans.");
    }

    const payload = (await response.json()) as BackendPublicPlan[];
    return payload
      .map(mapBackendPlan)
      .sort((left, right) => {
        if (left.displayOrder !== right.displayOrder) {
          return left.displayOrder - right.displayOrder;
        }
        if (left.durationDays !== right.durationDays) {
          return left.durationDays - right.durationDays;
        }
        return left.numericPrice - right.numericPrice;
      });
  } catch {
    return [];
  }
}
