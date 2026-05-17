import { requestServerUserApi } from "@/lib/server-user-auth";
import type { GiftCodeSummaryResponse } from "@/lib/api/types";
import { mapGiftSummary } from "@/lib/gift-code-mappers";
import type { UserGiftCodeSummary } from "@/lib/types";

export async function getMyGiftCodeSummary(): Promise<UserGiftCodeSummary> {
  try {
    const payload = await requestServerUserApi<GiftCodeSummaryResponse>("/me/gift-codes");
    return mapGiftSummary(payload);
  } catch {
    return {
      items: [],
      recentCodes: [],
      totalAvailableCount: 0,
      canGenerate: false,
    };
  }
}
