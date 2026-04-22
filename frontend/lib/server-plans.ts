import { mockPlans } from "@/lib/mock-data";

const baseUrl = (
  process.env.API_INTERNAL_BASE_URL
  ?? process.env.NEXT_PUBLIC_API_BASE_URL
  ?? "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

type BackendPublicPlan = {
  id: string;
  name: string;
  duration_days: number;
  price: string | number;
  currency?: string;
  discount_percent?: number;
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
  paymentPaused: boolean;
  currency: string;
  numericPrice: number;
}

function toNumber(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "UZS" ? 0 : 2,
  }).format(value);
}

function buildBadgeLabel(durationDays: number): string {
  if (durationDays >= 365) {
    return "Best annual value";
  }
  if (durationDays >= 180) {
    return "Most popular";
  }
  if (durationDays >= 90) {
    return "Best balance";
  }
  return "Start here";
}

function buildPerks(durationDays: number): string[] {
  if (durationDays >= 365) {
    return [
      "All premium Reading and Listening tests",
      "Explanation access across your prep cycle",
      "Best fit for long-term band improvement",
    ];
  }

  if (durationDays >= 180) {
    return [
      "Full premium test library",
      "Detailed explanations for review sessions",
      "Strong option for steady multi-month prep",
    ];
  }

  if (durationDays >= 90) {
    return [
      "Premium tests for an intensive prep block",
      "Explanations to fix repeated mistakes",
      "Good balance before your exam date",
    ];
  }

  return [
    "Quick access to premium tests",
    "Explanations for focused short-term revision",
    "Best for a final sprint before test day",
  ];
}

function mapBackendPlan(payload: BackendPublicPlan): MarketingPlan {
  const currency = payload.currency ?? "UZS";
  const numericPrice = toNumber(payload.price);
  const monthlyEquivalent = payload.duration_days > 0
    ? (numericPrice / payload.duration_days) * 30
    : numericPrice;

  return {
    id: payload.id,
    title: payload.name,
    durationDays: payload.duration_days,
    priceLabel: formatMoney(numericPrice, currency),
    monthlyLabel: `Approx. ${formatMoney(monthlyEquivalent, currency)} / 30 days`,
    badgeLabel: buildBadgeLabel(payload.duration_days),
    perks: buildPerks(payload.duration_days),
    paymentPaused: Boolean(payload.payment_paused),
    currency,
    numericPrice,
  };
}

function mapMockPlan(index: number): MarketingPlan {
  const plan = mockPlans[index];
  const numericPrice = Number(plan.price.replace(/[^\d.]/g, ""));

  return {
    id: plan.id,
    title: plan.title,
    durationDays: plan.durationDays,
    priceLabel: plan.price,
    monthlyLabel: `Approx. $${((numericPrice / plan.durationDays) * 30).toFixed(2)} / 30 days`,
    badgeLabel:
      plan.durationDays === 365 ? "Best annual value" :
      plan.durationDays === 180 ? "Most popular" :
      plan.durationDays === 90 ? "Best balance" :
      "Start here",
    perks: plan.perks,
    paymentPaused: true,
    currency: "USD",
    numericPrice,
  };
}

export async function getPublicPlans(): Promise<MarketingPlan[]> {
  try {
    const response = await fetch(`${baseUrl}/plans`, {
      next: { revalidate: 3600, tags: ["public-plans"] },
    });

    if (!response.ok) {
      throw new Error("Failed to load public plans.");
    }

    const payload = (await response.json()) as BackendPublicPlan[];
    return payload.map(mapBackendPlan);
  } catch {
    return mockPlans.map((_, index) => mapMockPlan(index));
  }
}
