import type { GiftCodeSummaryResponse } from "@/lib/api/types";
import type { UserGiftCodeSummary } from "@/lib/types";

export function mapGiftSummary(payload: GiftCodeSummaryResponse): UserGiftCodeSummary {
  return {
    items: (payload.items ?? []).map((item) => ({
      giftDays: item.gift_days,
      totalCount: item.total_count,
      generatedCount: item.generated_count,
      availableCount: item.available_count,
    })),
    recentCodes: (payload.recent_codes ?? []).map((item) => ({
      id: item.id,
      code: item.code,
      durationDays: item.duration_days,
      status: item.status,
      expiresAt: item.expires_at ?? null,
      redeemedAt: item.redeemed_at ?? null,
      createdAt: item.created_at ?? null,
    })),
    totalAvailableCount: payload.total_available_count ?? 0,
    canGenerate: Boolean(payload.can_generate),
  };
}
